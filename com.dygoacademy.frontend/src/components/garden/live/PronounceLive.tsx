'use client';

import * as React from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { useAudioEnvelope, envelopeBuckets } from '@/hooks/useAudioEnvelope';
import { LIVE_LEVELS_PER_SECOND, useLiveLevels } from '@/hooks/useLiveLevels';
import { useMicLevel } from '@/hooks/useMicLevel';
import { useNativeEnvelope } from '@/hooks/useNativeEnvelope';
import { prepareSlowClip, usePlayer } from '@/hooks/usePlayer';
import { useTake } from '@/hooks/useTake';
import { useTopic } from '@/hooks/useTopic';
import { apiClient } from '@/lib/api-client';
import { cellsReached, syllableSlots } from '@/lib/pronunciation/liveFill';
import { mockKind, mockWordCheck, PRON_MOCK } from '@/lib/pronunciation/mock';
import {
  buildResultViewModel,
  toPronunciationResult,
  type P4Action,
  type PronunciationResult,
} from '@/lib/pronunciation/pronunciationResult';
import {
  createRecorder,
  ENVELOPE_FPS,
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
import { BEEP_GUARD_MS, SPEECH_SKIP_MS } from '@/lib/speaking/constants';
import {
  nativeClipRate,
  nativeWord,
  nativeWordSeconds,
  PRON_MAX_MS,
  PRON_ROOM_MS,
  pronVoiceEnded,
  slowWord,
  unusableTake,
  voiceIn,
  wordCheck,
  wordStones,
} from '@/lib/speaking/pronounce';
import { track } from '@/lib/track';
import type { SpeakingWordCheckResult, SpeakingWordItem } from '@/types';

import {
  PronounceScreen,
  type PronClips,
  type PronNotHeardReason,
  type PronPhase,
} from '../pronounce/PronounceScreen';
import { SpeakMicScreen } from '../pronounce/SpeakMicScreen';
import { SpeakNotice, type SpeakNoticeKind } from '../speaking/SpeakNotice';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /sounds/word: Pronunciation, the honeycomb (docs/specs/Pronunciation-
 * honeycomb-implementation-plan.md). The words in a row ("Bee 1 of 3"),
 * each from `GET /speaking/words/:id`.
 * P1 → tap the mic: the mic listens to the room for PRON_ROOM_MS, then a
 * beep and the take (P2: pale honey fills each cell the voice reaches;
 * stops 1 s after the voice, at 4 s, or on Stop) → too quiet / too noisy:
 * P2b, no server call → else P3: `POST /speaking/check-pronunciation`,
 * polled → P4 (honey to each syllable's score; the word pollinates when
 * every syllable is past the pass line) or P2b (`not_heard` /
 * `other_word`). The take stays in memory for "Your try" and is never
 * stored. A pass pollinates the word on the server; the bed's Bees list is
 * refreshed. `NEXT_PUBLIC_PRON_MOCK=1` scores with the mock (retry, then
 * almost, then pass) instead of the server.
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

  // A word without stored syllables isn't offered (pronunciation v2): logged,
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
  const queryClient = useQueryClient();
  const player = usePlayer();
  const { item, default_accent: accent } = data;
  const stones = React.useMemo(() => wordStones(item), [item]);
  const wordS = nativeWordSeconds(item, accent);
  /** Each cell's slot in the native word: the live fill (P2) and the weak zone on the waveform (P4). */
  const slots = React.useMemo(
    () => syllableSlots(item.syllables ?? [], wordS ? wordS * 1000 : null),
    [item.syllables, wordS],
  );

  const [phase, setPhase] = React.useState<PronPhase | 'mic'>('say');
  /** SP0: ask before the first recording, or how to turn the mic back on. */
  const [micState, setMicState] = React.useState<'ask' | 'denied'>('ask');
  /** The mic permission as the browser reports it, read ahead so a tap stays a tap (iOS). */
  const micPermission = useMicPermission();
  const [notice, setNotice] = React.useState<SpeakNoticeKind | null>(() =>
    speakingSupport().recorder ? null : 'unsupported',
  );
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  /** True once the recorder runs (BEEP_GUARD_MS after the beep). */
  const [started, setStarted] = React.useState(false);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [recording, setRecording] = React.useState<Recording | null>(null);
  /** The take for "Your try": in memory only, cleared on leaving P4 (useTake). */
  const take = useTake();
  /** Tries on this word, for pron_scored's attempt_no (and the mock scorer's walk). */
  const attempts = React.useRef(0);
  const [failed, setFailed] = React.useState(false);
  const [checkRun, setCheckRun] = React.useState(0);
  const [result, setResult] = React.useState<PronunciationResult | null>(null);
  const [reason, setReason] = React.useState<PronNotHeardReason>('quiet');
  const [heard, setHeard] = React.useState('');
  /** The take's mic bars: P4's waveform while (or if) the take can't be decoded. */
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
  const level = useMicLevel(stream, phase === 'recording' && started);
  const takeBars = started ? live.slice(startBar.current) : [];
  const reached = cellsReached(voiceIn(takeBars, LIVE_LEVELS_PER_SECOND).voicedMs, slots);

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

  // The take for "Your try" (P3, P4), kept only in memory.
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

  // The native word, Slowly (the same clip slowed in the browser, pitch kept) and the take.
  const native = nativeWord(item, accent);
  const slow = slowWord(item, accent);
  const clips: PronClips = {
    normal: native ? { src: native.src, span: native.span, rate: nativeClipRate(native, 1) } : { src: null },
    slow: slow
      ? { src: slow.clip.src, span: slow.clip.span, rate: nativeClipRate(slow.clip, slow.rate), stretch: true }
      : { src: null },
    native: native ? { src: native.src, span: native.span, rate: nativeClipRate(native, 1) } : { src: null },
    you: { src: take.url },
  };
  // Make the slowed copy before the tap (usePlayer).
  const slowSrc = clips.slow.src;
  const slowRate = clips.slow.rate;
  const slowStart = clips.slow.span?.start;
  const slowEnd = clips.slow.span?.end;
  React.useEffect(() => {
    if (!slowSrc || slowRate === undefined) return;
    prepareSlowClip(
      slowSrc,
      slowRate,
      slowStart !== undefined && slowEnd !== undefined ? { start: slowStart, end: slowEnd } : undefined,
      true,
    );
  }, [slowSrc, slowRate, slowStart, slowEnd]);

  // P3: send the take, wait for the check.
  React.useEffect(() => {
    if (phase !== 'checking' || !recording || failed) return;
    let alive = true;
    void (async () => {
      try {
        const r = PRON_MOCK
          ? await new Promise<SpeakingWordCheckResult>((resolve) =>
              setTimeout(() => resolve(mockWordCheck(item.word, stones, mockKind(attempts.current))), 900),
            )
          : await wordCheck({ recording: recording.blob, topicWordId: item.topic_word_id, accent });
        if (!alive) return;
        if (r.status === 'not_heard' || r.status === 'other_word') {
          const why = r.status === 'other_word' ? 'other' : 'quiet';
          setReason(why);
          setHeard(r.heard_text);
          setPhase('notHeard');
          track({ name: 'pron_not_heard', props: { word_id: item.topic_word_id, reason: why } });
          return;
        }
        const scored = toPronunciationResult({
          word: item.word,
          stones,
          check: r,
          nativeAudioUrl: native?.src ?? '',
          learnerAudioUrl: take.url ?? '',
          round: { index, total, nextWord: nextWord ?? undefined },
        });
        // The scorer's syllables don't line up with the cells: a scoring
        // error (P3 Check again / Record again), never one cell for the word.
        if (!scored) {
          setFailed(true);
          return;
        }
        const vm = buildResultViewModel(scored);
        setResult(scored);
        setPhase('result');
        attempts.current += 1;
        track({
          name: 'pron_scored',
          props: {
            word_id: item.topic_word_id,
            overall: r.total,
            result: vm.kind === 'almostPerfect' ? 'almost' : vm.kind,
            weak_syllable: vm.weak >= 0 ? vm.cells[vm.weak].text : null,
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

  /** Leaving P4 (next bee, back to the bed, close): the take is cleared first. */
  const leave = (then: () => void) => {
    player.stop();
    take.clear();
    then();
  };

  const p4Action = (action: P4Action) => {
    if (action === 'nextBee') return leave(onNext);
    if (action === 'backToBed') return leave(() => router.push(closeHref));
    if (action === 'skip') {
      // Skip doesn't count as a try (default).
      track({ name: 'pron_skipped', props: { word_id: item.topic_word_id } });
      return leave(onNext);
    }
    track({ name: 'pron_say_again', props: { word_id: item.topic_word_id, from_result: true } });
    void startRecording();
  };

  // P4's mirror waveform: the voiced part of the native word and of the take, 40 bars each.
  const envelope = useNativeEnvelope(phase === 'result' ? native?.src : null).clip?.envelope;
  const mineDecoded = useAudioEnvelope(phase === 'result' ? take.url : null, WAVE_BARS).bars;
  const nativeSpanStart = native?.span?.start;
  const nativeSpanEnd = native?.span?.end;
  const waves = React.useMemo(() => {
    const clip = envelope
      ? nativeSpanStart !== undefined && nativeSpanEnd !== undefined
        ? envelope.slice(Math.floor(nativeSpanStart * ENVELOPE_FPS), Math.ceil(nativeSpanEnd * ENVELOPE_FPS))
        : envelope
      : null;
    const nativeBars = clip ? envelopeBuckets(clip, WAVE_BARS) : null;
    const mineLive = envelopeBuckets(takeLevels.slice(Math.ceil((SPEECH_SKIP_MS / 1000) * LIVE_LEVELS_PER_SECOND)), WAVE_BARS);
    return {
      native: nativeBars?.length ? nativeBars : null,
      mine: mineDecoded?.length ? mineDecoded : mineLive.length ? mineLive : null,
    };
  }, [envelope, nativeSpanStart, nativeSpanEnd, mineDecoded, takeLevels]);
  const shares = React.useMemo(() => {
    const all = slots.reduce((a, s) => a + (s.endMs - s.startMs), 0);
    return slots.length === stones.length && all > 0 ? slots.map((s) => (s.endMs - s.startMs) / all) : undefined;
  }, [slots, stones.length]);

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

  return (
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
      clips={clips}
      onPlayed={(voice, screen) =>
        track({ name: 'pron_word_played', props: { word_id: item.topic_word_id, voice, screen } })
      }
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
      reached={reached}
      level={level}
      started={started}
      elapsedMs={elapsedMs}
      onStop={() => void stopRecording()}
      onCancel={cancelRecording}
      failed={failed}
      onCheckAgain={() => {
        setFailed(false);
        setCheckRun((n) => n + 1);
      }}
      onRecordAgain={() => void startRecording()}
      result={result}
      waves={waves}
      shares={shares}
      onAction={p4Action}
      reason={reason}
      heard={heard}
      onTryAgain={() => void startRecording()}
      onHearFirst={() => setPhase('say')}
    />
  );
}

/** Bars a side in P4's mirror waveform (plan §3 P4). */
const WAVE_BARS = 40;

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
