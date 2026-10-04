'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useLiveLevels } from '@/hooks/useLiveLevels';
import { useNativeEnvelope } from '@/hooks/useNativeEnvelope';
import { usePlayer } from '@/hooks/usePlayer';
import { useSpeakingSession } from '@/hooks/useSpeakingSession';
import { prefetchMedia } from '@/lib/media-cache';
import {
  createRecorder,
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
import {
  forAccent,
  initialSpeakState,
  recordingTargetMs,
  speakReducer,
  type SpeakAction,
  type SpeakState,
} from '@/lib/speaking/session';
import type { SpeakingAccent, SpeakingSessionItem } from '@/types';

import { SpeakListenScreen } from '../screens/SpeakListenScreen';
import { SpeakRecordingScreen } from '../screens/SpeakRecordingScreen';
import { LiveError, LiveLoading } from './LiveState';

const clipUrl = (item: SpeakingSessionItem, accent: SpeakingAccent) => forAccent(item, accent).url;

/**
 * /sounds: The Pond (Phase 13 T6, plan §2). Real data: `GET
 * /speaking/session` (5 sentences, due → new → rest), taken once. The
 * five native clips of the chosen accent are prefetched into the phone's
 * media cache; each is decoded once for the waveforms (and, from S8, the
 * scorer). Listen (SP1) → Recording (SP2) → Compare (SP3, S8) → next or
 * Done (SP4, S8). The recording never leaves the phone (D2).
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
  const [, setRecording] = React.useState<Recording | null>(null);
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

  // SP3 Compare and SP4 Done arrive in S8.
  return <LiveLoading />;
}
