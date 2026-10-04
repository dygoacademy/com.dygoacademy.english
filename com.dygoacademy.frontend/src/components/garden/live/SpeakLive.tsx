'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useCreateSpeakingAttempt } from '@/hooks/useCreateSpeakingAttempt';
import { useLiveLevels } from '@/hooks/useLiveLevels';
import { useNativeEnvelope } from '@/hooks/useNativeEnvelope';
import { usePlayer } from '@/hooks/usePlayer';
import { useSpeakingSession } from '@/hooks/useSpeakingSession';
import { prefetchMedia } from '@/lib/media-cache';
import {
  createRecorder,
  decodeForScoring,
  getAudioContext,
  MAX_RECORDING_MS,
  releaseStream,
  requestMic,
  resumeAudioContext,
  speakingSupport,
  type MicErrorKind,
  type Recorder,
  type Recording,
} from '@/lib/speaking/audio';
import { POND_SESSION_SIZE } from '@/lib/speaking/constants';
import { envelopeScorer, type SpeakingResult } from '@/lib/speaking/envelopeScorer';
import {
  forAccent,
  initialSpeakState,
  recordingTargetMs,
  sessionPattern,
  speakReducer,
  type SpeakAction,
  type SpeakState,
} from '@/lib/speaking/session';
import type { SpeakingAccent, SpeakingSessionItem } from '@/types';

import type { CompareView } from '../speaking/CompareWaveform';
import { SpeakCompareScreen } from '../screens/SpeakCompareScreen';
import { SpeakDoneScreen } from '../screens/SpeakDoneScreen';
import { SpeakListenScreen } from '../screens/SpeakListenScreen';
import { SpeakRecordingScreen } from '../screens/SpeakRecordingScreen';
import { LiveError, LiveLoading } from './LiveState';

const clipUrl = (item: SpeakingSessionItem, accent: SpeakingAccent) => forAccent(item, accent).url;

/**
 * /sounds: The Pond (Phase 13 T6, plan §2). Real data: `GET
 * /speaking/session` (5 sentences, due → new → rest), taken once. The
 * five native clips of the chosen accent are prefetched into the phone's
 * media cache; each is decoded once for the waveforms and the scorer.
 * Listen (SP1) → Recording (SP2) → Compare (SP3: scored on the phone, one
 * `POST /speaking/attempts` per attempt) → next, or Done (SP4) after the
 * last. The recording never leaves the phone (D2); nothing changes SRS (D5).
 */
export function SpeakLive({ topicId }: { topicId?: string }) {
  const t = useTranslations('screens.speak');
  const session = useSpeakingSession(topicId);
  const player = usePlayer();

  const [items, setItems] = React.useState<SpeakingSessionItem[] | null>(null);
  const [state, setState] = React.useState<SpeakState | null>(null);
  const [accent, setAccent] = React.useState<SpeakingAccent>('US');
  const [playKey, setPlayKey] = React.useState(0);
  const [micError, setMicError] = React.useState<MicErrorKind | null>(null);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [recording, setRecording] = React.useState<Recording | null>(null);
  const [recUrl, setRecUrl] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SpeakingResult | null>(null);
  const [best, setBest] = React.useState<Record<number, SpeakingResult>>({});
  const [view, setView] = React.useState<CompareView>('overlay');
  const saveAttempt = useCreateSpeakingAttempt();
  const recorder = React.useRef<Recorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  streamRef.current = stream;

  if (items === null && session.data) {
    const taken = session.data.items.slice(0, POND_SESSION_SIZE);
    setItems(taken);
    setState(initialSpeakState(taken.length));
    setAccent(session.data.default_accent);
  }
  const dispatch = React.useCallback(
    (action: SpeakAction) => setState((s) => (s ? speakReducer(s, action) : s)),
    [],
  );

  const item = items && state ? items[Math.min(state.index, items.length - 1)] : null;
  const url = item ? clipUrl(item, accent) : null;
  const native = useNativeEnvelope(url);
  const live = useLiveLevels(stream, state?.phase === 'recording');

  // Warm the phone's media cache with the session's clips (option 2).
  React.useEffect(() => {
    if (items) void prefetchMedia(items.map((i) => clipUrl(i, accent)));
  }, [items, accent]);

  // Recording clock.
  React.useEffect(() => {
    if (state?.phase !== 'recording' || !stream) return;
    const started = performance.now();
    setElapsedMs(0);
    const id = setInterval(() => setElapsedMs(performance.now() - started), 100);
    return () => clearInterval(id);
  }, [state?.phase, stream]);

  // The learner's clip as a URL for "Play you"; revoked when replaced.
  React.useEffect(() => {
    if (!recording) {
      setRecUrl(null);
      return;
    }
    const u = URL.createObjectURL(recording.blob);
    setRecUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [recording]);

  // Compare: score on the phone, then save the numbers (one row per attempt).
  const clip = native.clip;
  React.useEffect(() => {
    if (state?.phase !== 'compare' || !recording || result || !clip || !item) return;
    let alive = true;
    const { timings } = forAccent(item, accent);
    if (!timings) return;
    void (async () => {
      try {
        const user = await decodeForScoring(recording.blob, getAudioContext());
        const r = await envelopeScorer.score({
          native: clip.pcm.samples,
          nativeRate: clip.pcm.sampleRate,
          timings,
          user: user.samples,
          userRate: user.sampleRate,
          targetIndex: item.target_index,
        });
        if (!alive) return;
        setResult(r);
        dispatch({ type: 'scored', stage: r.stage, score: r.score });
        const index = state.index;
        setBest((b) => (b[index] && b[index].score >= r.score ? b : { ...b, [index]: r }));
        saveAttempt.mutate({
          item_id: item.id,
          accent,
          score: r.score,
          stage: r.stage,
          word_marks: r.wordMarks,
          user_duration_ms: r.userDurationMs,
        });
      } catch {
        // Couldn't decode the recording: back to SP1 to try again (T7 adds a message).
        if (alive) dispatch({ type: 'cancel' });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, recording, result, clip, item, accent]);

  // Leaving the page: stop recording and release the mic (iOS indicator).
  React.useEffect(
    () => () => {
      recorder.current?.cancel();
      releaseStream(streamRef.current);
      player.stop();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const endRecording = React.useCallback(
    (rec: Recording | null) => {
      recorder.current = null;
      setStream((s) => {
        releaseStream(s);
        return null;
      });
      if (rec) {
        setRecording(rec);
        dispatch({ type: 'stopped' });
      }
    },
    [dispatch],
  );

  async function startRecording() {
    setMicError(null);
    setResult(null);
    setRecording(null);
    player.stop();
    try {
      await resumeAudioContext(); // inside the tap (iOS)
      const s = await requestMic();
      const r = createRecorder(s, { onAutoStop: (rec) => endRecording(rec) });
      recorder.current = r;
      setStream(s);
      r.start();
      dispatch({ type: 'record' });
    } catch (err) {
      setMicError((err as { kind?: MicErrorKind }).kind ?? 'failed');
    }
  }

  async function stopRecording() {
    const r = recorder.current;
    if (!r) return;
    try {
      endRecording(await r.stop());
    } catch {
      endRecording(null);
      dispatch({ type: 'cancel' });
    }
  }

  function cancelRecording() {
    recorder.current?.cancel();
    endRecording(null);
    dispatch({ type: 'cancel' });
  }

  function play() {
    if (!url) return;
    if (player.isPlaying(url)) {
      player.stop();
      return;
    }
    setPlayKey((k) => k + 1);
    void player.play(url, player.rate).catch(() => undefined);
  }

  if (!items || !state || !item) {
    if (session.isError) return <LiveError onRetry={() => void session.refetch()} />;
    if (items && items.length === 0) return <LiveError message={t('soundGarden.body')} />;
    return <LiveLoading />;
  }

  const closeHref = GARDEN_ROUTES.missions;
  const { timings, ipa } = forAccent(item, accent);
  const levels = native.clip?.envelope ?? null;

  if (state.phase === 'recording') {
    return (
      <SpeakRecordingScreen
        item={item}
        index={state.index}
        total={state.total}
        closeHref={closeHref}
        timings={timings}
        ipa={ipa}
        nativeLevels={levels}
        liveLevels={live}
        elapsedMs={elapsedMs}
        targetMs={recordingTargetMs(timings?.duration ?? 0, MAX_RECORDING_MS)}
        onStop={() => void stopRecording()}
        onCancel={cancelRecording}
      />
    );
  }

  if (state.phase === 'listen') {
    const notice = micError ? (
      <span role="alert" className="text-center text-[14px] font-semibold text-primary-text">
        {t(
          micError === 'denied'
            ? 'denied.title'
            : micError === 'unsupported'
              ? 'unsupported.title'
              : 'audioFailed.title',
        )}
      </span>
    ) : undefined;
    return (
      <SpeakListenScreen
        item={item}
        index={state.index}
        total={state.total}
        closeHref={closeHref}
        accent={accent}
        onAccent={(a) => {
          setAccent(a);
          const next = clipUrl(item, a);
          if (next) {
            setPlayKey((k) => k + 1);
            void player.play(next, player.rate).catch(() => undefined);
          }
        }}
        rate={player.rate}
        onRate={(r) => {
          player.setRate(r);
          if (url) {
            setPlayKey((k) => k + 1);
            void player.play(url, r).catch(() => undefined);
          }
        }}
        playing={url ? player.isPlaying(url) : false}
        onPlay={play}
        nativeLevels={levels}
        playKey={playKey}
        onMic={() => void startRecording()}
        micAvailable={speakingSupport().recorder !== null}
        notice={notice}
      />
    );
  }

  if (state.phase === 'compare') {
    const playingWhich =
      url && player.isPlaying(url) ? 'native' : recUrl && player.isPlaying(recUrl) ? 'you' : null;
    const playOne = (src: string | null) => {
      if (!src) return;
      if (player.isPlaying(src)) return player.stop();
      setPlayKey((k) => k + 1);
      void player.play(src, 1).catch(() => undefined);
    };
    return (
      <SpeakCompareScreen
        item={item}
        index={state.index}
        total={state.total}
        closeHref={closeHref}
        timings={timings}
        ipa={ipa}
        result={result}
        view={view}
        onView={setView}
        playing={playingWhich}
        playKey={playKey}
        onPlayNative={() => playOne(url)}
        onPlayYou={() => playOne(recUrl)}
        onTryAgain={() => void startRecording()}
        onNext={() => {
          player.stop();
          setResult(null);
          setRecording(null);
          dispatch({ type: 'next' });
        }}
      />
    );
  }

  // SP4 Done: one plant per sentence spoken, its best stage and score.
  const spoken = items
    .map((it, index) => ({ it, index, r: best[index] }))
    .filter((x): x is { it: SpeakingSessionItem; index: number; r: SpeakingResult } =>
      Boolean(x.r),
    );
  const pattern = sessionPattern(Object.fromEntries(spoken.map((x) => [x.index, x.r])));
  const patternItem = pattern ? items[pattern.index] : null;
  return (
    <SpeakDoneScreen
      closeHref={closeHref}
      words={spoken.map(({ it, r }) => ({
        word: it.word,
        stage: r.stage,
        pct: r.score,
        levels: r.envelopes.native,
      }))}
      pattern={
        pattern && patternItem
          ? {
              tipKey: pattern.tipKey,
              tipParams: pattern.tipParams,
              ipa: forAccent(patternItem, accent).ipa,
            }
          : null
      }
    />
  );
}
