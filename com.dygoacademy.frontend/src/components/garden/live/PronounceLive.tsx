'use client';

import * as React from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { LIVE_LEVELS_PER_SECOND, useLiveLevels } from '@/hooks/useLiveLevels';
import { usePlayer } from '@/hooks/usePlayer';
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
import { BEEP_GUARD_MS } from '@/lib/speaking/constants';
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
  unusableTake,
  voiceIn,
  wordCheck,
  wordStones,
  type PronResultView,
} from '@/lib/speaking/pronounce';
import type { SpeakingWordItem } from '@/types';

import {
  PronounceScreen,
  type PronNotHeardReason,
  type PronAudio,
  type PronPhase,
} from '../pronounce/PronounceScreen';
import { SpeakNotice, type SpeakNoticeKind } from '../speaking/SpeakNotice';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /sounds/word: Pronunciation "Stepping stones" (plan Part 2). Up to three
 * words in a row ("Bee 1 of 3"), each from `GET /speaking/words/:id`.
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
  const [index, setIndex] = React.useState(0);
  const current = words[index];

  if (!current?.data) {
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

  const [phase, setPhase] = React.useState<PronPhase>('say');
  /** Which of Hear it / Slowly the learner tapped last (null: some other clip). */
  const [asked, setAsked] = React.useState<'hear' | 'slow' | null>(null);
  const [notice, setNotice] = React.useState<SpeakNoticeKind | null>(() =>
    speakingSupport().recorder ? null : 'unsupported',
  );
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  /** True once the recorder runs (BEEP_GUARD_MS after the beep). */
  const [started, setStarted] = React.useState(false);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [recording, setRecording] = React.useState<Recording | null>(null);
  const [recUrl, setRecUrl] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [checkRun, setCheckRun] = React.useState(0);
  const [result, setResult] = React.useState<PronResultView | null>(null);
  const [reason, setReason] = React.useState<PronNotHeardReason>('quiet');
  const [heard, setHeard] = React.useState('');

  const recorder = React.useRef<Recorder | null>(null);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  streamRef.current = stream;
  /** Live bars at the beep: before it is the room, after it the take. */
  const startBar = React.useRef(0);
  const live = useLiveLevels(stream, phase === 'recording');
  const liveRef = React.useRef(live);
  liveRef.current = live;
  const take = started ? live.slice(startBar.current) : [];
  const lit = litStones(voiceIn(take, LIVE_LEVELS_PER_SECOND).voicedMs, stones.length, wordS);

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

  // The take as a URL for "Hear mine"; revoked when replaced.
  React.useEffect(() => {
    if (!recording) {
      setRecUrl(null);
      return;
    }
    const u = URL.createObjectURL(recording.blob);
    setRecUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [recording]);

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
    if (started && pronVoiceEnded(take, LIVE_LEVELS_PER_SECOND)) void stopRecording();
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
          setReason(r.status === 'other_word' ? 'other' : 'quiet');
          setHeard(r.heard_text);
          setPhase('notHeard');
          return;
        }
        setResult(resultView(stones, r));
        setPhase('result');
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
      const unusable = unusableTake(takeBars, room, LIVE_LEVELS_PER_SECOND);
      if (unusable) {
        setReason(unusable);
        setPhase('notHeard');
        return;
      }
      setRecording(rec);
      setFailed(false);
      setPhase('checking');
    },
    [],
  );

  async function startRecording() {
    clearTimers();
    player.stop();
    setNotice(null);
    setResult(null);
    setRecording(null);
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
      setNotice(kind === 'unsupported' ? 'unsupported' : 'denied');
      setPhase('say');
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

  const play = (src: NativeClip | null, rate = 1, which: 'hear' | 'slow' | null = null) => {
    if (!src) return;
    setAsked(which);
    void player.play(src.src, nativeClipRate(src, rate), src.span).catch(() => undefined);
  };
  const hearMine = () => {
    setAsked(null);
    if (recUrl) void player.play(recUrl, 1).catch(() => undefined);
  };

  // Hear it / Slowly show loading, playing and a failed play (P1 boards,
  // 2026-10-18): learners couldn't tell a tap worked and tapped again.
  const native = nativeWord(item, accent);
  let audio: PronAudio = 'idle';
  if (asked && native && player.src === native.src) {
    audio = player.loading ? (asked === 'hear' ? 'loadingHear' : 'loadingSlow') : asked;
  } else if (asked && !player.src && player.error) {
    audio = 'error';
  }
  const tapNative = (which: 'hear' | 'slow') => {
    if (audio === which) return player.stop(); // playing: a tap stops it
    if (audio === (which === 'hear' ? 'loadingHear' : 'loadingSlow')) return; // a double tap
    play(native, which === 'slow' ? PRON_SLOW_RATE : 1, which);
  };

  const meaning = item.meaning_translation ?? item.definition_en;
  const ipa = accent === 'UK' ? (item.ipa_uk ?? item.ipa_us) : (item.ipa_us ?? item.ipa_uk);

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
      audio={audio}
      onHearIt={() => tapNative('hear')}
      onSlowly={() => tapNative('slow')}
      onMic={() => void startRecording()}
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
      levels={take}
      elapsedMs={elapsedMs}
      onStop={() => void stopRecording()}
      onCancel={cancelRecording}
      onHearMine={hearMine}
      onHearNative={() => play(nativeWord(item, accent))}
      failed={failed}
      onCheckAgain={() => {
        setFailed(false);
        setCheckRun((n) => n + 1);
      }}
      onRecordAgain={() => void startRecording()}
      result={result}
      // One syllable cut from the sentence is too quick to follow at 1×.
      onHearSyllable={() =>
        result?.first
          ? play(nativeSyllable(item, accent, result.first.index), PRON_SLOW_RATE)
          : undefined
      }
      onTryAgain={() => void startRecording()}
      nextWord={nextWord}
      onNext={() => {
        player.stop();
        onNext();
      }}
      reason={reason}
      heard={heard}
      onHearFirst={() => setPhase('say')}
    />
  );
}
