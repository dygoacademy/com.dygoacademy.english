'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useCreateSpeakingAttempt } from '@/hooks/useCreateSpeakingAttempt';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LIVE_LEVELS_PER_SECOND, useLiveLevels } from '@/hooks/useLiveLevels';
import { useNativeEnvelope } from '@/hooks/useNativeEnvelope';
import { usePlayer } from '@/hooks/usePlayer';
import { useSpeakingSession } from '@/hooks/useSpeakingSession';
import { useSpeakingWord } from '@/hooks/useSpeakingWord';
import { prefetchMedia } from '@/lib/media-cache';
import {
  createRecorder,
  decodeForScoring,
  getAudioContext,
  micPermission,
  releaseStream,
  requestMic,
  resumeAudioContext,
  speakingSupport,
  type MicErrorKind,
  type MicPermission,
  type Recorder,
  type Recording,
} from '@/lib/speaking/audio';
import { beepAndVibrate } from '@/lib/speaking/beep';
import {
  forDisplay,
  localCheck,
  serverCheck,
  withTimeout,
  type CheckStatus,
  type ShownResult,
} from '@/lib/speaking/check';
import {
  BEEP_GUARD_MS,
  COUNTDOWN_SECONDS,
  speechCheckMode,
  COUNTDOWN_STEP_MS,
  MIC_EXPLAINED_KEY,
  MIN_VOICE_MS,
  POND_SESSION_SIZE,
} from '@/lib/speaking/constants';
import { compareEnvelopes, type SpeakingResult } from '@/lib/speaking/envelopeScorer';
import {
  forAccent,
  initialSpeakState,
  notHeard,
  sessionPattern,
  speakReducer,
  voiceEnded,
  type SpeakAction,
  type SpeakState,
} from '@/lib/speaking/session';
import type { SpeakingAccent, SpeakingSessionItem } from '@/types';

import { displayName } from './data';

import type { CompareView } from '../speaking/CompareWaveform';
import { noticeKeepsMic, SpeakNotice, type SpeakNoticeKind } from '../speaking/SpeakNotice';
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
 * Listen (SP1) → Speaking (SP2: 3 · 2 · 1, beep, records until a pause)
 * → Compare (SP3, handover v2: opens at once with the waveforms, the check
 * runs in the background: checking → done | failed; one `POST
 * /speaking/attempts` per checked attempt) → next, or Done (SP4) after the
 * last. By default the check runs on the phone
 * (`localCheck`); with NEXT_PUBLIC_SPEECH_CHECK=server (S18) a usable
 * recording is also sent to `POST /speaking/check`, checked by the speech
 * scorer and dropped (never stored). Nothing changes SRS (D5).
 */
/** The T7 notice for a mic error. */
function noticeForMicError(kind: MicErrorKind): SpeakNoticeKind {
  return kind === 'unsupported' ? 'unsupported' : 'denied';
}

function micExplained(): boolean {
  try {
    return window.localStorage.getItem(MIC_EXPLAINED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Words with no voice at all, or less than MIN_VOICE_MS of it, aren't
 * scored or saved: SP1 says "We couldn't hear you" / "Say the whole
 * sentence" instead (T7, decision S9-a).
 */
export function unusableAttempt(r: SpeakingResult): 'quiet' | 'short' | null {
  if (r.userDurationMs === 0 || r.wordMarks.every((m) => m.reason === 'missing')) return 'quiet';
  if (r.userDurationMs < MIN_VOICE_MS) return 'short';
  return null;
}

export interface SpeakFlowProps {
  /** The sentences, taken once (The Pond: 5; "Say this one?": 1). */
  items: SpeakingSessionItem[];
  defaultAccent: SpeakingAccent;
  /** Close goes here (The Pond: the Missions tab)… */
  closeHref: string;
  /** …or calls this instead ("Say this one?" sheet: back to the card). */
  onClose?: () => void;
  /** `single`: one sentence, SP1–SP3, Next closes; no SP4 (T9-a). */
  mode?: 'pond' | 'single';
  /** "Skip speaking" on the denied card. */
  onSkipSpeaking: () => void;
  /** SE5 "Ready to harvest": attempts ask to harvest the word (the API keeps 90%+ only). */
  harvest?: boolean;
  /** T7 dev toggle. */
  forceNotice?: SpeakNoticeKind;
}

/**
 * SP1 → SP2 → SP3 (→ SP4) for a fixed list of sentences: The Pond's flow,
 * also run for one card by the "Say this one?" sheet.
 */
export function SpeakFlow({
  items,
  defaultAccent,
  closeHref,
  onClose,
  mode = 'pond',
  onSkipSpeaking,
  harvest = false,
  forceNotice,
}: SpeakFlowProps) {
  const t = useTranslations('screens.speak');
  const player = usePlayer();

  const [state, setState] = React.useState<SpeakState>(() => initialSpeakState(items.length));
  const [accent, setAccent] = React.useState<SpeakingAccent>(defaultAccent);
  const [playKey, setPlayKey] = React.useState(0);
  const [notice, setNotice] = React.useState<SpeakNoticeKind | null>(forceNotice ?? null);
  const [permission, setPermission] = React.useState<MicPermission>('unknown');
  const [support] = React.useState(() => speakingSupport());
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  /** 3 · 2 · 1 before the beep; null once it's past. */
  const [countdown, setCountdown] = React.useState<number | null>(null);
  /** True once the recorder runs (BEEP_GUARD_MS after the beep). */
  const [started, setStarted] = React.useState(false);
  const [recording, setRecording] = React.useState<Recording | null>(null);
  const [recUrl, setRecUrl] = React.useState<string | null>(null);
  /** SP3's drawing, made on the phone as soon as the recording stops. */
  const [drawn, setDrawn] = React.useState<{
    native: number[];
    user: number[];
    userDurationMs: number;
    pcm: { samples: Float32Array; sampleRate: number };
  } | null>(null);
  const [checkStatus, setCheckStatus] = React.useState<CheckStatus>('checking');
  /** Bumped by "Check again" to run the check once more. */
  const [checkRun, setCheckRun] = React.useState(0);
  const [result, setResult] = React.useState<ShownResult | null>(null);
  const [best, setBest] = React.useState<Record<number, ShownResult>>({});
  const [view, setView] = React.useState<CompareView>('overlay');
  const saveAttempt = useCreateSpeakingAttempt();
  const recorder = React.useRef<Recorder | null>(null);
  const beepGuard = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  streamRef.current = stream;
  const user = useCurrentUser();
  const name = displayName(user.data) ?? user.data?.email?.split('@')[0] ?? '';
  const initial = (name.trim()[0] ?? t('playYou').trim()[0] ?? '').toUpperCase();

  const dispatch = React.useCallback(
    (action: SpeakAction) => setState((s) => speakReducer(s, action)),
    [],
  );

  const item = items[Math.min(state.index, items.length - 1)];
  const url = item ? clipUrl(item, accent) : null;
  const native = useNativeEnvelope(url);
  const capturing = state?.phase === 'recording' && countdown === null && started;
  const live = useLiveLevels(stream, capturing);

  // Warm the phone's media cache with the session's clips (option 2).
  React.useEffect(() => {
    void prefetchMedia(items.map((i) => clipUrl(i, accent)));
  }, [items, accent]);

  /**
   * End of the countdown (or a tap on it): beep and buzz, then keep audio
   * from BEEP_GUARD_MS later so the beep isn't in the clip (handover v2 §3.2).
   */
  const go = React.useCallback(() => {
    setCountdown(null);
    beepAndVibrate(getAudioContext());
    beepGuard.current = setTimeout(() => {
      beepGuard.current = null;
      recorder.current?.start();
      setStarted(true);
    }, BEEP_GUARD_MS);
  }, []);

  // Countdown: the sentence on screen, mic already open, then the beep.
  React.useEffect(() => {
    if (countdown === null) return;
    const id = setTimeout(() => {
      if (countdown > 1) setCountdown(countdown - 1);
      else go();
    }, COUNTDOWN_STEP_MS);
    return () => clearTimeout(id);
  }, [countdown, go]);

  // Recording clock.
  React.useEffect(() => {
    if (!capturing || !stream) return;
    const started = performance.now();
    setElapsedMs(0);
    const id = setInterval(() => setElapsedMs(performance.now() - started), 100);
    return () => clearInterval(id);
  }, [capturing, stream]);

  // Stop by itself 2 s after the voice ends; nothing heard after 8 s:
  // "We couldn't hear you" (handover v2 §3.2).
  React.useEffect(() => {
    if (!capturing) return;
    if (voiceEnded(live, LIVE_LEVELS_PER_SECOND)) void stopRecording();
    else if (notHeard(live, LIVE_LEVELS_PER_SECOND, elapsedMs)) {
      cancelRecording();
      setNotice('quiet');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturing, live, elapsedMs]);

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

  // Compare opens at once: decode the clip and draw both waveforms.
  const clip = native.clip;
  React.useEffect(() => {
    if (state?.phase !== 'compare' || !recording || drawn || !clip) return;
    let alive = true;
    void (async () => {
      try {
        const pcm = await decodeForScoring(recording.blob, getAudioContext());
        if (!alive) return;
        const env = compareEnvelopes(
          clip.pcm.samples,
          clip.pcm.sampleRate,
          pcm.samples,
          pcm.sampleRate,
        );
        setDrawn({ ...env, pcm: { samples: pcm.samples, sampleRate: pcm.sampleRate } });
      } catch {
        // Couldn't decode the recording: back to SP1, as if nothing was heard.
        if (!alive) return;
        setNotice('quiet');
        setRecording(null);
        dispatch({ type: 'cancel' });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, recording, drawn, clip]);

  // …then check it in the background: done, or failed after CHECK_TIMEOUT_MS.
  React.useEffect(() => {
    if (state?.phase !== 'compare' || !drawn || !clip || !item) return;
    if (checkStatus !== 'checking') return;
    let alive = true;
    const { timings } = forAccent(item, accent);
    if (!timings) return;
    void (async () => {
      try {
        const r = await withTimeout(
          localCheck.check({
            native: clip.pcm.samples,
            nativeRate: clip.pcm.sampleRate,
            timings,
            user: drawn.pcm.samples,
            userRate: drawn.pcm.sampleRate,
            targetIndex: item.target_index,
          }),
        );
        if (!alive) return;
        const unusable = unusableAttempt(r);
        if (unusable) {
          setNotice(unusable);
          setRecording(null);
          setDrawn(null);
          dispatch({ type: 'cancel' });
          return;
        }
        // Server mode (S18): only a usable recording is uploaded; the
        // on-device result above still supplies stress and the waveforms.
        const server = speechCheckMode() === 'server';
        const shown =
          server && recording
            ? await serverCheck(
                {
                  recording: recording.blob,
                  itemId: item.id,
                  accent,
                  sentence: item.sentence,
                  targetIndex: item.target_index,
                },
                r,
              )
            : forDisplay(r);
        if (!alive) return;
        setResult(shown);
        setCheckStatus('done');
        dispatch({ type: 'scored', stage: shown.stage, score: shown.score });
        const index = state.index;
        setBest((b) => (b[index] && b[index].score >= shown.score ? b : { ...b, [index]: shown }));
        saveAttempt.mutate({
          item_id: item.id,
          accent,
          score: shown.score,
          stage: shown.stage,
          // Marks only: what the scorer `heard` is never stored.
          // Local mode keeps the scorer's own marks (rushed / slow too).
          word_marks: (server && !shown.quick ? shown.wordMarks : r.wordMarks).map(
            ({ index: i, ok, reason }) => ({
              index: i,
              ok,
              reason,
            }),
          ),
          user_duration_ms: shown.userDurationMs,
          ...(harvest ? { harvest: true } : {}),
        });
      } catch {
        if (alive) setCheckStatus('failed');
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, drawn, clip, item, accent, checkStatus, checkRun]);

  // Leaving the page: stop recording and release the mic (iOS indicator).
  React.useEffect(
    () => () => {
      if (beepGuard.current) clearTimeout(beepGuard.current);
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
      setStarted(false);
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

  // Ask the browser (without prompting) whether the mic is already allowed.
  React.useEffect(() => {
    void micPermission().then(setPermission);
  }, []);

  /** Mic tap: the explainer first if the mic was never allowed or explained. */
  function onMic() {
    if (permission !== 'granted' && !micExplained()) {
      setNotice('mic');
      return;
    }
    void startRecording();
  }

  function allowMic() {
    try {
      window.localStorage.setItem(MIC_EXPLAINED_KEY, '1');
    } catch {
      // private mode: the explainer just shows again next time
    }
    void startRecording(); // still inside the Allow tap (iOS)
  }

  async function startRecording() {
    setNotice(null);
    setResult(null);
    setRecording(null);
    setDrawn(null);
    setCheckStatus('checking');
    setStarted(false);
    player.stop();
    try {
      await resumeAudioContext(); // inside the tap (iOS)
      const s = await requestMic();
      const r = createRecorder(s, { onAutoStop: (rec) => endRecording(rec) });
      recorder.current = r;
      setStream(s);
      setCountdown(COUNTDOWN_SECONDS); // starts the recorder when it ends
      dispatch({ type: 'record' });
    } catch (err) {
      setNotice(noticeForMicError((err as { kind?: MicErrorKind }).kind ?? 'failed'));
    }
  }

  async function stopRecording() {
    const r = recorder.current;
    if (!r) return;
    recorder.current = null; // the auto-stop and a tap can't both stop it
    try {
      endRecording(await r.stop());
    } catch {
      endRecording(null);
      dispatch({ type: 'cancel' });
    }
  }

  function cancelRecording() {
    setCountdown(null);
    setStarted(false);
    if (beepGuard.current) clearTimeout(beepGuard.current);
    beepGuard.current = null;
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

  if (!item) return <LiveError />;
  const { timings, ipa } = forAccent(item, accent);
  const levels = native.clip?.envelope ?? null;

  if (state.phase === 'recording') {
    return (
      <SpeakRecordingScreen
        item={item}
        index={state.index}
        total={state.total}
        closeHref={closeHref}
        onClose={onClose}
        timings={timings}
        ipa={ipa}
        nativeLevels={levels}
        liveLevels={live}
        elapsedMs={elapsedMs}
        countdown={countdown}
        onSkipCountdown={go}
        onStop={() => void stopRecording()}
        onCancel={cancelRecording}
      />
    );
  }

  if (state.phase === 'listen') {
    const shown: SpeakNoticeKind | null = !support.recorder
      ? 'unsupported'
      : native.error
        ? 'audioFailed'
        : notice;
    const card = shown ? (
      <SpeakNotice
        kind={shown}
        onPrimary={
          shown === 'mic'
            ? allowMic
            : shown === 'denied'
              ? () => void startRecording()
              : shown === 'audioFailed'
                ? native.retry
                : undefined
        }
        onSecondary={
          shown === 'mic'
            ? () => setNotice(null)
            : shown === 'denied'
              ? onSkipSpeaking
              : shown === 'audioFailed'
                ? () => dispatch({ type: 'next' })
                : undefined
        }
      />
    ) : undefined;
    return (
      <SpeakListenScreen
        item={item}
        index={state.index}
        total={state.total}
        closeHref={closeHref}
        onClose={onClose}
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
        onMic={onMic}
        micAvailable={!shown || noticeKeepsMic(shown)}
        notice={card}
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
        onClose={onClose}
        timings={timings}
        ipa={ipa}
        accent={accent}
        envelopes={drawn ?? { native: native.clip?.envelope ?? [], user: [] }}
        userDurationMs={drawn?.userDurationMs ?? recording?.durationMs ?? 0}
        status={checkStatus}
        result={result}
        initial={initial}
        view={view}
        onView={setView}
        playing={playingWhich}
        playKey={playKey}
        onPlayNative={() => playOne(url)}
        onPlayYou={() => playOne(recUrl)}
        onCheckAgain={() => {
          setCheckStatus('checking');
          setCheckRun((n) => n + 1);
        }}
        onRecordAgain={() => void startRecording()}
        onTryAgain={() => void startRecording()}
        nextLabel={mode === 'single' ? t('sayThis.close') : undefined}
        onNext={() => {
          player.stop();
          if (mode === 'single') return onClose?.();
          setResult(null);
          setRecording(null);
          setDrawn(null);
          setCheckStatus('checking');
          dispatch({ type: 'next' });
        }}
      />
    );
  }

  // SP4 Done: one plant per sentence spoken, its best stage and score.
  const spoken = items
    .map((it, index) => ({ it, index, r: best[index] }))
    .filter((x): x is { it: SpeakingSessionItem; index: number; r: ShownResult } => Boolean(x.r));
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

/**
 * /sounds: The Pond. Takes the session's sentences once, from this
 * visit's fetch (not an older cached list), then runs SpeakFlow. With
 * `wordId` (SE5 harvest, SE6 Echo) it runs one word's sentence instead
 * (single mode: Next closes). Close goes to `backHref`, else the bed
 * (`topicId`), else the Missions tab.
 */
export function SpeakLive({
  topicId,
  wordId,
  harvest = false,
  backHref,
  forceNotice,
}: {
  topicId?: string;
  wordId?: string;
  harvest?: boolean;
  backHref?: string;
  forceNotice?: SpeakNoticeKind;
}) {
  const closeHref =
    backHref ?? (topicId ? GARDEN_ROUTES.topic(topicId) : GARDEN_ROUTES.missions);
  return wordId ? (
    <SpeakWordLive
      wordId={wordId}
      harvest={harvest}
      closeHref={closeHref}
      forceNotice={forceNotice}
    />
  ) : (
    <SpeakPondLive topicId={topicId} closeHref={closeHref} forceNotice={forceNotice} />
  );
}

function SpeakPondLive({
  topicId,
  closeHref,
  forceNotice,
}: {
  topicId?: string;
  closeHref: string;
  forceNotice?: SpeakNoticeKind;
}) {
  const router = useRouter();
  const session = useSpeakingSession(topicId);
  const [taken, setTaken] = React.useState<{
    items: SpeakingSessionItem[];
    accent: SpeakingAccent;
  } | null>(null);

  if (taken === null && session.data && session.isFetchedAfterMount) {
    setTaken({
      items: session.data.items.slice(0, POND_SESSION_SIZE),
      accent: session.data.default_accent,
    });
  }

  if (!taken) {
    if (session.isError) return <LiveError onRetry={() => void session.refetch()} />;
    return <LiveLoading />;
  }
  if (taken.items.length === 0) return <LiveError />;
  return (
    <SpeakFlow
      items={taken.items}
      defaultAccent={taken.accent}
      closeHref={closeHref}
      onSkipSpeaking={() => router.push(closeHref)}
      forceNotice={forceNotice}
    />
  );
}

function SpeakWordLive({
  wordId,
  harvest,
  closeHref,
  forceNotice,
}: {
  wordId: string;
  harvest: boolean;
  closeHref: string;
  forceNotice?: SpeakNoticeKind;
}) {
  const router = useRouter();
  const word = useSpeakingWord(wordId);
  const items = React.useMemo(() => (word.data ? [word.data.item] : null), [word.data]);

  if (!items || !word.data) {
    if (word.isError) return <LiveError onRetry={() => void word.refetch()} />;
    return <LiveLoading />;
  }
  return (
    <SpeakFlow
      items={items}
      defaultAccent={word.data.default_accent}
      closeHref={closeHref}
      onClose={() => router.push(closeHref)}
      mode="single"
      harvest={harvest}
      onSkipSpeaking={() => router.push(closeHref)}
      forceNotice={forceNotice}
    />
  );
}
