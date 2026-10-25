'use client';

import * as React from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

import { LIVE_LEVELS_PER_SECOND, useLiveLevels } from '@/hooks/useLiveLevels';
import { ENVELOPE_FPS } from '@/lib/speaking/audio';
import { useNativeEnvelope } from '@/hooks/useNativeEnvelope';
import { getPlayerTag, prepareSlowClip, usePlayer } from '@/hooks/usePlayer';
import { useTake } from '@/hooks/useTake';
import { useTopic } from '@/hooks/useTopic';
import { apiClient } from '@/lib/api-client';
import {
  createRecorder,
  getAudioContext,
  releaseStream,
  requestMic,
  resumeAudioContext,
  speakingSupport,
  type MicErrorKind,
  type Recorder,
  type Recording,
} from '@/lib/speaking/audio';
import { beepAndVibrate } from '@/lib/speaking/beep';
import { track } from '@/lib/track';
import { BEEP_GUARD_MS, SPEECH_SKIP_MS } from '@/lib/speaking/constants';
import {
  litStones,
  nativeClipRate,
  nativeSyllable,
  nativeWord,
  nativeWordSeconds,
  type NativeClip,
  PRON_MAX_MS,
  PRON_ROOM_MS,
  PRON_SLOW_RATE,
  pronVoiceEnded,
  resultView,
  slowWord,
  stoneText,
  stoneShares,
  takeSyllable,
  unusableTake,
  voiceIn,
  voicedBars,
  wordCheck,
  wordStones,
  type PronResultView,
} from '@/lib/speaking/pronounce';
import type { PronTip, SpeakingWordCheckResult, SpeakingWordItem } from '@/types';
import type { P4Action } from '@/lib/speaking/pron-result';

import {
  PronounceScreen,
  type PronCompare,
  type PronNotHeardReason,
  type PronPhase,
} from '../pronounce/PronounceScreen';
import { PronResult } from '../pronounce/PronResult';
import { SpeakMicScreen } from '../pronounce/SpeakMicScreen';
import { SpeakNotice, type SpeakNoticeKind } from '../speaking/SpeakNotice';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /sounds/word: Pronunciation "Stepping stones" (plan Part 2). The words
 * in a row ("Bee 1 of 3"), each from `GET /speaking/words/:id`.
 * P1 → tap the mic: the mic listens to the room for PRON_ROOM_MS, then a
 * beep and the take (P2: stones light as the voice goes on; stops 1 s
 * after the voice, at 4 s, or on Stop) → too quiet / too noisy: P2b, no
 * server call → else P3: `POST /speaking/check-pronunciation`, polled → P4 (retry
 * / pollinated) or P2b (`not_heard` / `other_word`). The take stays in
 * memory for "Hear mine" and is never stored. A pass pollinates the word
 * on the server; the bed's Bees list is refreshed.
 */
export function PronounceLive({
  wordIds,
  topicId,
  closeHref,
}: {
  wordIds: string[];
  topicId?: string;
  closeHref: string;
}) {
  const words = useQueries({
    queries: wordIds.map((id) => ({
      queryKey: ['speaking', 'word', id],
      queryFn: () =>
        apiClient.get<SpeakingWordItem>(`/speaking/words/${encodeURIComponent(id)}`),
      refetchOnWindowFocus: false,
    })),
  });
  const topic = useTopic(topicId);
  const router = useRouter();
  const [index, setIndex] = React.useState(0);
  const current = words[index];
  const blocked = current?.data?.blocked ?? null;

  // A word without stored stones isn't offered (pronunciation v2): logged,
  // then the next bee, or back to the bed when it was the last.
  React.useEffect(() => {
    if (!blocked || !current?.data) return;
    track({
      name: 'pron_word_blocked',
      props: { word_id: current.data.item.topic_word_id, reason: blocked },
    });
    if (index + 1 < wordIds.length) setIndex(index + 1);
    else router.replace(closeHref);
  }, [blocked, current?.data, index, wordIds.length, router, closeHref]);

  if (!current?.data || blocked) {
    if (current?.isError) return <LiveError onRetry={() => void current.refetch()} />;
    return <LiveLoading />;
  }
  const next = words[index + 1];
  return (
    <PronounceWord
      key={index}
      data={current.data}
      index={index}
      total={wordIds.length}
      topic={topic.data?.title ?? null}
      topicId={topicId}
      closeHref={closeHref}
      nextWord={index + 1 < wordIds.length ? (next?.data?.item.word ?? '…') : null}
      onNext={() => setIndex((i) => Math.min(i + 1, wordIds.length - 1))}
    />
  );
}

function PronounceWord({
  data,
  index,
  total,
  topic,
  topicId,
  closeHref,
  nextWord,
  onNext,
}: {
  data: SpeakingWordItem;
  index: number;
  total: number;
  topic: string | null;
  topicId?: string;
  closeHref: string;
  nextWord: string | null;
  onNext: () => void;
}) {
  const router = useRouter();
  const locale = useLocale() as keyof PronTip;
  const queryClient = useQueryClient();
  const player = usePlayer();
  const { item, default_accent: accent } = data;
  const stones = React.useMemo(() => wordStones(item), [item]);
  const wordS = nativeWordSeconds(item, accent);

  const [phase, setPhase] = React.useState<PronPhase | 'mic'>('say');
  /** SP0: ask before the first recording, or how to turn the mic back on. */
  const [micState, setMicState] = React.useState<'ask' | 'denied'>('ask');
  /** The mic permission as the browser reports it, read ahead so a tap stays a tap (iOS). */
  const micPermission = useMicPermission();
  /** The check behind P4 (each stone's heard IPA and its time in the take). */
  const [check, setCheck] = React.useState<SpeakingWordCheckResult | null>(null);
  /** P4: the chip selected (the weak one at first on almost and retry). */
  const [chip, setChip] = React.useState(-1);
  const chipTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notice, setNotice] = React.useState<SpeakNoticeKind | null>(() =>
    speakingSupport().recorder ? null : 'unsupported',
  );
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  /** True once the recorder runs (BEEP_GUARD_MS after the beep). */
  const [started, setStarted] = React.useState(false);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [recording, setRecording] = React.useState<Recording | null>(null);
  /** The take for "You": in memory only, cleared on leaving P4 (useTake). */
  const take = useTake();
  /** Tries on this word, for pron_scored's attempt_no. */
  const attempts = React.useRef(0);
  const [failed, setFailed] = React.useState(false);
  const [checkRun, setCheckRun] = React.useState(0);
  const [result, setResult] = React.useState<PronResultView | null>(null);
  const [reason, setReason] = React.useState<PronNotHeardReason>('quiet');
  const [heard, setHeard] = React.useState('');
  /** The take's mic bars, kept for P4's "Compare your voice". */
  const [takeLevels, setTakeLevels] = React.useState<number[]>([]);

  const recorder = React.useRef<Recorder | null>(null);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  streamRef.current = stream;
  /** Live bars at the beep: before it is the room, after it the take. */
  const startBar = React.useRef(0);
  const live = useLiveLevels(stream, phase === 'recording');
  const liveRef = React.useRef(live);
  liveRef.current = live;
  const takeBars = started ? live.slice(startBar.current) : [];
  const lit = litStones(voiceIn(takeBars, LIVE_LEVELS_PER_SECOND).voicedMs, stones.length, wordS);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Leaving: stop recording, release the mic, stop the audio.
  React.useEffect(
    () => () => {
      clearTimers();
      recorder.current?.cancel();
      releaseStream(streamRef.current);
      player.stop();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // The take for "You" (P3, P4), kept only in memory.
  const keepTake = take.keep;
  React.useEffect(() => {
    if (recording) keepTake(recording.blob);
  }, [recording, keepTake]);

  // The 4 s ring.
  React.useEffect(() => {
    if (!started) return;
    const t0 = performance.now();
    setElapsedMs(0);
    const id = setInterval(() => setElapsedMs(performance.now() - t0), 100);
    return () => clearInterval(id);
  }, [started]);

  // Stop by itself PRON_SILENCE_MS after the voice ends.
  React.useEffect(() => {
    if (started && pronVoiceEnded(takeBars, LIVE_LEVELS_PER_SECOND)) void stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, live]);

  // P3: send the take, wait for the check.
  React.useEffect(() => {
    if (phase !== 'checking' || !recording || failed) return;
    let alive = true;
    void (async () => {
      try {
        const r = await wordCheck({
          recording: recording.blob,
          topicWordId: item.topic_word_id,
          accent,
        });
        if (!alive) return;
        if (r.status === 'not_heard' || r.status === 'other_word') {
          const why = r.status === 'other_word' ? 'other' : 'quiet';
          setReason(why);
          setHeard(r.heard_text);
          setPhase('notHeard');
          track({ name: 'pron_not_heard', props: { word_id: item.topic_word_id, reason: why } });
          return;
        }
        const view = resultView(stones, r);
        // The scorer's syllables don't line up with the stones: a scoring
        // error (P3 Check again / Record again), never one stone for the word.
        if (!view) {
          setFailed(true);
          return;
        }
        setResult(view);
        setCheck(r);
        setChip(view.selected);
        setPhase('result');
        attempts.current += 1;
        track({
          name: 'pron_scored',
          props: {
            word_id: item.topic_word_id,
            overall: r.total,
            result: view.outcome,
            weak_syllable: view.first?.text ?? null,
            attempt_no: attempts.current,
          },
        });
        if (r.pollinated && topicId) {
          void queryClient.invalidateQueries({ queryKey: ['speaking', 'harvest', topicId] });
        }
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, recording, failed, checkRun]);

  /** The take ended (Stop, silence or the 4 s cap): P2b without a server call, or P3. */
  const finish = React.useCallback(
    (rec: Recording | null) => {
      recorder.current = null;
      const bars = liveRef.current;
      const room = bars.slice(0, startBar.current);
      const takeBars = bars.slice(startBar.current);
      setStarted(false);
      setStream((s) => {
        releaseStream(s);
        return null;
      });
      if (!rec) {
        setPhase('say');
        return;
      }
      setTakeLevels(takeBars);
      const unusable = unusableTake(takeBars, room, LIVE_LEVELS_PER_SECOND);
      if (unusable) {
        setReason(unusable);
        setPhase('notHeard');
        track({ name: 'pron_not_heard', props: { word_id: item.topic_word_id, reason: unusable } });
        return;
      }
      setRecording(rec);
      setFailed(false);
      setPhase('checking');
    },
    [item.topic_word_id],
  );

  async function startRecording() {
    clearTimers();
    player.stop();
    setNotice(null);
    setResult(null);
    setRecording(null);
    take.clear(); // a new try: the old take is gone
    setFailed(false);
    setStarted(false);
    setElapsedMs(0);
    try {
      await resumeAudioContext(); // inside the tap (iOS)
      const s = await requestMic();
      const r = createRecorder(s, { maxMs: PRON_MAX_MS, onAutoStop: (rec) => finish(rec) });
      recorder.current = r;
      setStream(s);
      setPhase('recording');
      // Listen to the room first (for "Too noisy"), then beep, then keep audio
      // from BEEP_GUARD_MS later so the beep isn't in the take.
      timers.current.push(
        setTimeout(() => {
          beepAndVibrate(getAudioContext());
          timers.current.push(
            setTimeout(() => {
              startBar.current = liveRef.current.length;
              recorder.current?.start();
              setStarted(true);
            }, BEEP_GUARD_MS),
          );
        }, PRON_ROOM_MS),
      );
    } catch (err) {
      const kind = (err as { kind?: MicErrorKind }).kind ?? 'failed';
      if (kind === 'unsupported') {
        setNotice('unsupported');
        setPhase('say');
      } else {
        // SP0 denied: how to turn the mic back on.
        setMicState('denied');
        setPhase('mic');
      }
    }
  }

  /** The mic on P1: SP0 the first time (or while it's off), else straight to P2. */
  function tapMic() {
    if (micPermission === 'denied') {
      setMicState('denied');
      setPhase('mic');
    } else if (micPermission !== 'granted' && !micAsked()) {
      setMicState('ask');
      setPhase('mic');
    } else {
      void startRecording();
    }
  }

  async function stopRecording() {
    const r = recorder.current;
    if (!r || !started) return;
    recorder.current = null; // the auto-stop and a tap can't both stop it
    try {
      finish(await r.stop());
    } catch {
      finish(null);
    }
  }

  function cancelRecording() {
    clearTimers();
    recorder.current?.cancel();
    finish(null);
  }

  const play = (src: NativeClip | null, rate = 1) => {
    if (!src) return;
    void player.play(src.src, nativeClipRate(src, rate), src.span).catch(() => undefined);
  };
  const hearMine = () => {
    if (take.url) {
      track({ name: 'pron_word_played', props: { word_id: item.topic_word_id, voice: 'you', screen: 'P4' } });
      void player.play(take.url, 1).catch(() => undefined);
    }
  };

  // Hear it / Slowly (SoundButtons): loading, playing (a tap stops it) and
  // a failed play, one sound at a time through the shared player.
  const native = nativeWord(item, accent);
  const slow = slowWord(item, accent);
  // A slowed copy of the word clip (usePlayer) when there's no slow clip: make it before the tap.
  const slowSrc = slow?.clip.src;
  const slowStart = slow?.clip.span?.start;
  const slowEnd = slow?.clip.span?.end;
  const slowMadeAt = slow?.clip.madeAt;
  const slowRate = slow?.rate;
  React.useEffect(() => {
    if (!slowSrc || slowRate === undefined) return;
    const clip: NativeClip = {
      src: slowSrc,
      span: slowStart !== undefined && slowEnd !== undefined ? { start: slowStart, end: slowEnd } : undefined,
      madeAt: slowMadeAt,
    };
    prepareSlowClip(clip.src, nativeClipRate(clip, slowRate), clip.span);
  }, [slowSrc, slowStart, slowEnd, slowMadeAt, slowRate]);
  const nativeSrc = native?.src;

  /** Leaving P4 (next bee, back to the bed, close): the take is cleared first. */
  const leave = (then: () => void) => {
    if (chipTimer.current) clearTimeout(chipTimer.current);
    player.stop();
    take.clear();
    then();
  };

  /**
   * A chip: that syllable said by the native speaker, then by the learner
   * (its time in the take; the whole take when the scorer gave none).
   */
  const playChip = (k: number) => {
    if (!result) return;
    setChip(k);
    if (chipTimer.current) clearTimeout(chipTimer.current);
    track({
      name: 'pron_chip_played',
      props: { word_id: item.topic_word_id, syllable: stoneText(result.stones[k]), state: result.states[k] },
    });
    const clip = nativeSyllable(item, accent, k);
    if (!clip) return;
    const rate = nativeClipRate(clip, PRON_SLOW_RATE);
    const tag = `p4-chip-${k}`;
    void player.play(clip.src, rate, clip.span, tag).catch(() => undefined);
    const span = check ? takeSyllable(check, k) : null;
    const ms = clip.span ? ((clip.span.end - clip.span.start) * 1000) / rate : 900;
    chipTimer.current = setTimeout(() => {
      chipTimer.current = null;
      // Only if nothing else was played meanwhile.
      if (take.url && getPlayerTag() === tag) {
        void player.play(take.url, 1, span ?? undefined, `${tag}-you`).catch(() => undefined);
      }
    }, ms + 250);
  };

  const p4Action = (action: P4Action) => {
    if (action === 'nextBee') return leave(onNext);
    if (action === 'skip') {
      // Skip doesn't count as a try (default).
      track({ name: 'pron_skipped', props: { word_id: item.topic_word_id } });
      return leave(onNext);
    }
    if (action === 'tryAgain' || action === 'sayAgain' || action === 'polish') {
      track({ name: 'pron_say_again', props: { word_id: item.topic_word_id, from_result: true } });
      if (chipTimer.current) clearTimeout(chipTimer.current);
      void startRecording();
    }
  };

  // P4 "Compare your voice": the voiced part of the native clip and of the take.
  const envelope = useNativeEnvelope(phase === 'result' ? nativeSrc : null).clip?.envelope;
  const compare = React.useMemo<PronCompare | null>(() => {
    if (!result) return null;
    const span = native?.span;
    const clipBars = envelope
      ? voicedBars(
          span
            ? envelope.slice(Math.floor(span.start * ENVELOPE_FPS), Math.ceil(span.end * ENVELOPE_FPS))
            : envelope,
          ENVELOPE_FPS,
        )
      : null;
    const mine = voicedBars(takeLevels, LIVE_LEVELS_PER_SECOND, SPEECH_SKIP_MS);
    return {
      native: clipBars,
      nativeS: clipBars?.length && native ? clipBars.length / ENVELOPE_FPS / nativeClipRate(native) : null,
      mine,
      mineS: mine.length ? mine.length / LIVE_LEVELS_PER_SECOND : null,
      shares: stoneShares(result.stones, item, accent),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, envelope, takeLevels]);

  const meaning = item.meaning_translation ?? item.definition_en;
  const ipa = accent === 'UK' ? (item.ipa_uk ?? item.ipa_us) : (item.ipa_us ?? item.ipa_uk);

  if (phase === 'mic') {
    return (
      <SpeakMicScreen
        state={micState}
        closeHref={closeHref}
        onAllow={() => {
          markMicAsked();
          void startRecording();
        }}
        onOpenSettings={() => void startRecording()}
        onListen={() => setPhase('say')}
      />
    );
  }

  const nativeClipProp = native
    ? { src: native.src, span: native.span, rate: nativeClipRate(native, 1) }
    : { src: null };
  const p4 =
    phase === 'result' && result && check ? (
      <div className="ipad:hidden" data-screen="p4">
        <PronResult
          word={item.word}
          index={index}
          total={total}
          view={result}
          syllables={check.syllables}
          nextWord={nextWord}
          closeHref={closeHref}
          nativeClip={nativeClipProp}
          mineClip={{ src: take.url }}
          nativeS={compare?.nativeS ?? null}
          mineS={compare?.mineS ?? null}
          selected={chip}
          onChip={playChip}
          onAction={p4Action}
          onPlayed={(voice) =>
            track({ name: 'pron_word_played', props: { word_id: item.topic_word_id, voice, screen: 'P4' } })
          }
        />
      </div>
    ) : null;

  const screen = (
    <PronounceScreen
      phase={phase}
      word={item.word}
      ipa={ipa}
      meaning={meaning}
      meaningLang={item.meaning_translation ? (item.meaning_locale ?? undefined) : 'en'}
      syllables={stones}
      index={index}
      total={total}
      topic={topic}
      closeHref={closeHref}
      hearClip={
        native
          ? { src: native.src, span: native.span, rate: nativeClipRate(native, 1) }
          : { src: null }
      }
      slowClip={
        slow
          ? { src: slow.clip.src, span: slow.clip.span, rate: nativeClipRate(slow.clip, slow.rate) }
          : { src: null }
      }
      mineClip={{ src: take.url }}
      nativeClip={
        native
          ? { src: native.src, span: native.span, rate: nativeClipRate(native, 1) }
          : { src: null }
      }
      onPlayed={(voice, screen) =>
        track({ name: 'pron_word_played', props: { word_id: item.topic_word_id, voice, screen } })
      }
      tip={item.pron_tip?.[locale] ?? null}
      onMic={tapMic}
      notice={
        notice ? (
          <SpeakNotice
            kind={notice}
            onPrimary={notice === 'denied' ? () => void startRecording() : undefined}
            onSecondary={notice === 'denied' ? () => router.push(closeHref) : undefined}
          />
        ) : undefined
      }
      micAvailable={notice !== 'unsupported'}
      lit={lit}
      levels={takeBars}
      elapsedMs={elapsedMs}
      onStop={() => void stopRecording()}
      onCancel={cancelRecording}
      onHearMine={hearMine}
      onHearNative={() => {
        track({ name: 'pron_word_played', props: { word_id: item.topic_word_id, voice: 'native', screen: 'P4' } });
        play(nativeWord(item, accent));
      }}
      failed={failed}
      onCheckAgain={() => {
        setFailed(false);
        setCheckRun((n) => n + 1);
      }}
      onRecordAgain={() => void startRecording()}
      result={result}
      compare={compare}
      // One syllable cut from the word is too quick to follow at 1×.
      onHearSyllable={() => {
        if (!result?.first) return;
        track({
          name: 'pron_chip_played',
          props: {
            word_id: item.topic_word_id,
            syllable: result.first.text,
            state: result.states[result.first.index],
          },
        });
        play(nativeSyllable(item, accent, result.first.index), PRON_SLOW_RATE);
      }}
      onTryAgain={() => {
        if (phase === 'result') {
          track({ name: 'pron_say_again', props: { word_id: item.topic_word_id, from_result: true } });
        }
        void startRecording();
      }}
      nextWord={nextWord}
      onNext={() => {
        // Next bee from a retry is a skip (default: it doesn't count as a try).
        if (result && !result.passed) track({ name: 'pron_skipped', props: { word_id: item.topic_word_id } });
        leave(onNext);
      }}
      reason={reason}
      heard={heard}
      onHearFirst={() => setPhase('say')}
    />
  );
  // P4: the v2 board on a phone; the iPad keeps its own result layout (iP4).
  return p4 ? (
    <>
      {p4}
      <div className="hidden ipad:block">{screen}</div>
    </>
  ) : (
    screen
  );
}

const MIC_ASKED_KEY = 'dygo:mic-asked';
/** True once SP0 was shown on this device (where the browser can't say whether it may use the mic). */
function micAsked(): boolean {
  try {
    return window.localStorage.getItem(MIC_ASKED_KEY) === '1';
  } catch {
    return false;
  }
}
function markMicAsked(): void {
  try {
    window.localStorage.setItem(MIC_ASKED_KEY, '1');
  } catch {
    // Private mode: SP0 may show again; harmless.
  }
}

/** The browser's microphone permission, kept current; `unknown` where it can't be read (older Safari). */
function useMicPermission(): 'granted' | 'denied' | 'prompt' | 'unknown' {
  const [state, setState] = React.useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  React.useEffect(() => {
    let status: PermissionStatus | null = null;
    let alive = true;
    const read = () => status && alive && setState(status.state as 'granted' | 'denied' | 'prompt');
    navigator.permissions
      ?.query({ name: 'microphone' as PermissionName })
      .then((s) => {
        status = s;
        read();
        s.addEventListener('change', read);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      status?.removeEventListener('change', read);
    };
  }, []);
  return state;
}
