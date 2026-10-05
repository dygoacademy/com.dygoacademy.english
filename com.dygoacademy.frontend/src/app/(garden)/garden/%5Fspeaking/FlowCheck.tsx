'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/garden';
import { LIVE_LEVELS_PER_SECOND, useLiveLevels } from '@/hooks/useLiveLevels';
import {
  createRecorder,
  decodeForScoring,
  getAudioContext,
  releaseStream,
  requestMic,
  resumeAudioContext,
  toneRms,
  type Recorder,
  type Recording,
} from '@/lib/speaking/audio';
import { beepAndVibrate } from '@/lib/speaking/beep';
import {
  BEEP_GUARD_MS,
  BEEP_HZ,
  COUNTDOWN_SECONDS,
  COUNTDOWN_STEP_MS,
  SILENCE_GATE_RMS,
} from '@/lib/speaking/constants';
import { notHeard, speechDiagnostics, voiceEnded } from '@/lib/speaking/session';

/** Dev tool copy, English on purpose (decision S2-a). */
export const FLOW_COPY = {
  title: '3 · Recording flow v2 (like The Pond)',
  help:
    'Runs what SP2 does: 3 · 2 · 1, beep + vibration, records from 150 ms after the beep, stops ' +
    '2 s after you finish, or "not heard" after 8 s of nothing, or at 30 s. Then checks the beep ' +
    "isn't in the clip. Speak after the beep.",
  start: 'Run 3 · 2 · 1 → beep → record',
  stop: 'Stop (tap)',
  skip: 'Skip the count',
  counting: (n: number) => `Get ready… ${n}`,
  recording: (s: number) => `Recording… ${s.toFixed(1)} s`,
  stoppedBy: 'stopped by',
  recorded: 'recorded',
  decoded: 'decoded',
  beepInClip: 'beep in clip',
  recordedValue: (seconds: number, mime: string, kb: number) =>
    `${seconds.toFixed(2)} s · ${mime} · ${kb.toFixed(1)} KB`,
  decodedValue: (seconds: number) => `${seconds.toFixed(2)} s at 16 kHz`,
  /** Live while recording: what the auto-stop sees. */
  liveLine: (d: Diagnostics) =>
    (d.meterDead ? 'LIVE METER DEAD (only zeros: auto-stop off, tap to stop) · ' : '') +
    `voice heard ${d.heard ? '✓' : '–'} · quiet for ${(d.quietMs / 1000).toFixed(1)} / ` +
    `${(d.targetMs / 1000).toFixed(1)} s · noise floor ${fmtDb(d.floorDb)} · ` +
    `sound gate ${fmtDb(d.gateDb)} · loudest ${fmtDb(d.peakDb)}`,
  autoStop: 'auto-stop saw',
  autoStopValue: (d: Diagnostics) =>
    (d.meterDead ? 'live meter DEAD (only zeros) · ' : '') +
    `voice heard ${d.heard ? 'yes' : 'no'} · longest quiet after speaking ` +
    `${(d.longestQuietMs / 1000).toFixed(1)} s (needs ${(d.targetMs / 1000).toFixed(1)}) · ` +
    `floor ${fmtDb(d.floorDb)} · gate ${fmtDb(d.gateDb)} · loudest ${fmtDb(d.peakDb)}`,
  beepValue: (leaked: boolean, first: string, whole: string) =>
    `${leaked ? 'YES, leaked' : 'no'} (880 Hz first 200 ms ${first}, whole clip ${whole})`,
} as const;

type StopReason = 'silence' | 'not heard' | '30 s cap' | 'tap';
type Diagnostics = ReturnType<typeof speechDiagnostics>;

function fmtDb(db: number): string {
  return Number.isFinite(db) ? `${db.toFixed(0)} dBFS` : '—';
}

interface FlowResult {
  reason: StopReason;
  recording: Recording;
  decodedSeconds: number;
  /** 880 Hz RMS in the first 200 ms, in dBFS. */
  beepDb: number;
  /** The whole clip's 880 Hz RMS, in dBFS, for comparison. */
  restDb: number;
  leaked: boolean;
  /** What the auto-stop saw over the whole recording. */
  diagnostics: Diagnostics;
}

const dbfs = (rms: number) => (rms > 0 ? 20 * Math.log10(rms) : -Infinity);

/**
 * S19 (moved from S15): the v2 recording flow on its own, so a real phone
 * can be checked step by step: did the beep play (silent switch!), did the
 * vibration fire (Android; iOS Safari has none), why did it stop, and did
 * the beep get into the recording. A beep leak shows as an 880 Hz tone in
 * the first 200 ms clearly above the silence gate.
 */
export function FlowCheck() {
  const [count, setCount] = useState<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<FlowResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<Recorder | null>(null);
  const stopping = useRef(false);
  const live = useLiveLevels(stream, startedAt !== null);
  const liveRef = useRef<number[]>([]);
  liveRef.current = live;

  // 3 · 2 · 1 at COUNTDOWN_STEP_MS a step, then go().
  useEffect(() => {
    if (count === null) return;
    const id = setTimeout(() => (count > 1 ? setCount(count - 1) : go()), COUNTDOWN_STEP_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // Clock + the same stop rules as SpeakLive.
  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setElapsed(performance.now() - startedAt), 100);
    return () => clearInterval(id);
  }, [startedAt]);
  useEffect(() => {
    if (startedAt === null) return;
    if (voiceEnded(live, LIVE_LEVELS_PER_SECOND)) void stop('silence');
    else if (notHeard(live, LIVE_LEVELS_PER_SECOND, elapsed)) void stop('not heard');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, elapsed, startedAt]);

  useEffect(
    () => () => {
      recorder.current?.cancel();
    },
    [],
  );

  async function begin() {
    setError(null);
    setResult(null);
    stopping.current = false;
    try {
      await resumeAudioContext(); // inside the tap (iOS)
      const s = await requestMic();
      setStream(s);
      recorder.current = createRecorder(s, { onAutoStop: (rec) => void done(rec, '30 s cap') });
      setCount(COUNTDOWN_SECONDS);
    } catch (err) {
      const e = err as { kind?: string; message?: string };
      setError(`${e.kind ?? 'error'}: ${e.message ?? String(err)}`);
    }
  }

  function go() {
    setCount(null);
    beepAndVibrate(getAudioContext());
    setTimeout(() => {
      recorder.current?.start();
      setElapsed(0);
      setStartedAt(performance.now());
    }, BEEP_GUARD_MS);
  }

  async function stop(reason: StopReason) {
    const r = recorder.current;
    if (!r || stopping.current) return;
    stopping.current = true;
    try {
      await done(await r.stop(), reason);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function done(rec: Recording, reason: StopReason) {
    const diagnostics = speechDiagnostics(liveRef.current, LIVE_LEVELS_PER_SECOND);
    recorder.current = null;
    setStartedAt(null);
    setStream((s) => {
      releaseStream(s);
      return null;
    });
    try {
      const pcm = await decodeForScoring(rec.blob, getAudioContext());
      const first = Math.round(pcm.sampleRate * 0.2);
      const beep = toneRms(pcm.samples, pcm.sampleRate, BEEP_HZ, 0, first);
      const rest = toneRms(pcm.samples, pcm.sampleRate, BEEP_HZ);
      setResult({
        reason,
        recording: rec,
        decodedSeconds: pcm.samples.length / pcm.sampleRate,
        beepDb: dbfs(beep),
        restDb: dbfs(rest),
        // Leak = the tone at the start is above the silence gate and well above the clip's own 880 Hz.
        leaked: beep > SILENCE_GATE_RMS && beep > rest * 2,
        diagnostics,
      });
    } catch (err) {
      setError(`decode failed: ${(err as Error).message}`);
    }
  }

  const fmt = (db: number) => (Number.isFinite(db) ? `${db.toFixed(0)} dBFS` : 'none');

  return (
    <div>
      <p className="text-body-s text-muted-foreground">{FLOW_COPY.help}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {count !== null ? (
          <Button variant="secondary" onClick={go}>
            {FLOW_COPY.skip}
          </Button>
        ) : startedAt !== null ? (
          <Button variant="primary" onClick={() => void stop('tap')}>
            {FLOW_COPY.stop}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => void begin()}>
            {FLOW_COPY.start}
          </Button>
        )}
      </div>
      {count !== null && (
        <p className="mt-2 font-display text-display-s">{FLOW_COPY.counting(count)}</p>
      )}
      {startedAt !== null && (
        <>
          <p className="mt-2">{FLOW_COPY.recording(elapsed / 1000)}</p>
          <p className="text-body-s text-muted-foreground" data-testid="flow-live">
            {FLOW_COPY.liveLine(speechDiagnostics(live, LIVE_LEVELS_PER_SECOND))}
          </p>
        </>
      )}
      {error && <p className="mt-2 text-body-s text-primary-text">{error}</p>}
      {result && (
        <dl
          className="mt-3 grid grid-cols-[max-content_1fr] gap-x-3 text-body-s"
          data-testid="flow-result"
        >
          <dt className="text-muted-foreground">{FLOW_COPY.stoppedBy}</dt>
          <dd>{result.reason}</dd>
          <dt className="text-muted-foreground">{FLOW_COPY.recorded}</dt>
          <dd>
            {FLOW_COPY.recordedValue(
              result.recording.durationMs / 1000,
              result.recording.mimeType,
              result.recording.blob.size / 1024,
            )}
          </dd>
          <dt className="text-muted-foreground">{FLOW_COPY.decoded}</dt>
          <dd>{FLOW_COPY.decodedValue(result.decodedSeconds)}</dd>
          <dt className="text-muted-foreground">{FLOW_COPY.autoStop}</dt>
          <dd>{FLOW_COPY.autoStopValue(result.diagnostics)}</dd>
          <dt className="text-muted-foreground">{FLOW_COPY.beepInClip}</dt>
          <dd className={result.leaked ? 'font-bold text-primary-text' : undefined}>
            {FLOW_COPY.beepValue(result.leaked, fmt(result.beepDb), fmt(result.restDb))}
          </dd>
        </dl>
      )}
    </div>
  );
}
