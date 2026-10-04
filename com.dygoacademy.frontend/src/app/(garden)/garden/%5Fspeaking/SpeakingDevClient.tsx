'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/garden';
import { useLiveLevels } from '@/hooks/useLiveLevels';
import { PLAYER_RATES, usePlayer, type PlayerRate } from '@/hooks/usePlayer';
import { apiClient } from '@/lib/api-client';
import {
  createRecorder,
  decodeForScoring,
  ENVELOPE_FPS,
  estimateOffsetMs,
  fetchAndDecode,
  getAudioContext,
  micPermission,
  pickRecorderMime,
  releaseStream,
  requestMic,
  resumeAudioContext,
  rmsEnvelope,
  speakingSupport,
  type Recorder,
  type Recording,
} from '@/lib/speaking/audio';
import type { SpeakingSession } from '@/types';

/**
 * Dev tool: English labels on purpose, kept here rather than in the
 * message files (see page.tsx and the phase notes, decision S2-a).
 */
export const DEV_COPY = {
  title: 'Speaking audio check',
  intro: 'Phase 13 dev page. Nothing you record leaves this phone.',
  browser: 'This browser',
  record: '1 · Record and replay',
  recordStart: 'Record (max 8 s)',
  recordStop: 'Stop',
  playMe: (rate: number) => `Play me ${rate}×`,
  play: (rate: number) => `Play ${rate}×`,
  live: 'live levels',
  envelope: 'your envelope, 100 fps',
  native: '2 · Native clip: .m4a vs .wav',
  offsetHelp:
    'Offset = how much later the AAC copy starts than the WAV. Note it for Chrome and Safari.',
  measure: 'Measure offset',
  playFailed: (msg: string) => `play failed: ${msg}`,
} as const;

const FIXTURE = {
  label: 'fixture "mitigate" (macOS say)',
  m4a: '/audio/speaking-fixture/fixture-mitigate-us.m4a',
};

interface Clip {
  label: string;
  m4a: string;
}

interface OffsetResult {
  m4aMs: number;
  wavMs: number;
  m4aRate: number;
  wavRate: number;
  offsetMs: number;
}

function Bars({
  values,
  height = 56,
  label,
}: {
  values: number[];
  height?: number;
  label: string;
}) {
  const peak = Math.max(0.0001, ...values);
  const w = Math.max(1, values.length);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="mt-2 h-14 w-full rounded-tile border border-border bg-surface"
    >
      {values.map((v, i) => {
        const h = Math.max(1, (v / peak) * (height - 4));
        return (
          <rect key={i} x={i} y={(height - h) / 2} width={0.8} height={h} fill="currentColor" />
        );
      })}
    </svg>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-1 text-body-s">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-card border border-border bg-surface p-4">
      <h2 className="font-display text-display-s">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function SpeakingDevClient() {
  const player = usePlayer();
  const [info, setInfo] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Recording
  const [stream, setStream] = useState<MediaStream | null>(null);
  const recorder = useRef<Recorder | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const [recEnvelope, setRecEnvelope] = useState<number[]>([]);
  const [recDecoded, setRecDecoded] = useState<string>('');
  const live = useLiveLevels(stream);

  // Native clip
  const [clips, setClips] = useState<Clip[]>([FIXTURE]);
  const [offsets, setOffsets] = useState<Record<string, OffsetResult | string>>({});

  useEffect(() => {
    const support = speakingSupport();
    void micPermission().then((perm) =>
      setInfo({
        getUserMedia: support.mic ? 'yes' : 'no',
        recorder: support.recorder ?? 'none',
        'format picked': pickRecorderMime() ?? '(PCM fallback)',
        'mic permission': perm,
        'user agent': navigator.userAgent,
      }),
    );
    apiClient
      .get<SpeakingSession>('/speaking/session')
      .then((s) => {
        const real: Clip[] = [];
        const item = s.items[0];
        if (item?.audio_us_url) real.push({ label: `${item.word} US`, m4a: item.audio_us_url });
        if (item?.audio_uk_url) real.push({ label: `${item.word} UK`, m4a: item.audio_uk_url });
        setClips([...real, FIXTURE]);
      })
      .catch(() => undefined);
  }, []);

  // Release the mic and the blob URL when leaving.
  const streamRef = useRef<MediaStream | null>(null);
  streamRef.current = stream;
  useEffect(
    () => () => {
      recorder.current?.cancel();
      releaseStream(streamRef.current);
    },
    [],
  );
  useEffect(
    () => () => {
      if (recUrl) URL.revokeObjectURL(recUrl);
    },
    [recUrl],
  );

  async function finish(rec: Recording) {
    recorder.current = null;
    setStream((s) => {
      releaseStream(s);
      return null;
    });
    setRecording(rec);
    setRecUrl(URL.createObjectURL(rec.blob));
    try {
      const pcm = await decodeForScoring(rec.blob, getAudioContext());
      setRecEnvelope(rmsEnvelope(pcm.samples, pcm.sampleRate, ENVELOPE_FPS));
      setRecDecoded(`${(pcm.samples.length / pcm.sampleRate).toFixed(2)} s at 16 kHz`);
    } catch (err) {
      setRecDecoded(`decode failed: ${(err as Error).message}`);
    }
  }

  async function startRecording() {
    setError(null);
    player.stop();
    try {
      await resumeAudioContext(); // inside the tap (iOS)
      const s = await requestMic();
      setRecording(null);
      setRecEnvelope([]);
      setRecDecoded('');
      setStream(s);
      const r = createRecorder(s, { onAutoStop: (rec) => void finish(rec) });
      recorder.current = r;
      r.start();
    } catch (err) {
      const e = err as { kind?: string; message?: string };
      setError(`${e.kind ?? 'error'}: ${e.message ?? String(err)}`);
    }
  }

  async function stopRecording() {
    const r = recorder.current;
    if (!r) return;
    try {
      await finish(await r.stop());
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function measure(clip: Clip) {
    setOffsets((o) => ({ ...o, [clip.m4a]: 'measuring…' }));
    try {
      const ctx = await resumeAudioContext();
      const wavUrl = clip.m4a.replace(/\.m4a$/, '.wav');
      const [m4a, wav] = await Promise.all([
        fetchAndDecode(clip.m4a, ctx),
        fetchAndDecode(wavUrl, ctx),
      ]);
      const fps = 1000; // 1 ms frames
      const offsetMs = estimateOffsetMs(
        rmsEnvelope(wav.samples, wav.sampleRate, fps),
        rmsEnvelope(m4a.samples, m4a.sampleRate, fps),
        fps,
      );
      setOffsets((o) => ({
        ...o,
        [clip.m4a]: {
          m4aMs: (m4a.samples.length / m4a.sampleRate) * 1000,
          wavMs: (wav.samples.length / wav.sampleRate) * 1000,
          m4aRate: m4a.sampleRate,
          wavRate: wav.sampleRate,
          offsetMs,
        },
      }));
    } catch (err) {
      setOffsets((o) => ({ ...o, [clip.m4a]: `failed: ${(err as Error).message}` }));
    }
  }

  const isRecording = stream !== null;

  return (
    <>
      <Section title={DEV_COPY.browser}>
        {Object.entries(info).map(([k, v]) => (
          <Row key={k} k={k} v={v} />
        ))}
      </Section>

      <Section title={DEV_COPY.record}>
        <div className="flex flex-wrap gap-2">
          {isRecording ? (
            <Button variant="primary" onClick={() => void stopRecording()}>
              {DEV_COPY.recordStop}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => void startRecording()}>
              {DEV_COPY.recordStart}
            </Button>
          )}
          {PLAYER_RATES.map((rate: PlayerRate) => (
            <Button
              key={rate}
              variant="secondary"
              disabled={!recUrl || isRecording}
              onClick={() => recUrl && void player.play(recUrl, rate).catch(() => undefined)}
            >
              {DEV_COPY.playMe(rate)}
            </Button>
          ))}
        </div>
        {error && <p className="mt-2 text-body-s text-primary-text">{error}</p>}
        {isRecording && <Bars values={live} label={DEV_COPY.live} />}
        {recording && (
          <div className="mt-3">
            <Row k="format" v={recording.mimeType} />
            <Row k="size" v={`${(recording.blob.size / 1024).toFixed(1)} KB`} />
            <Row k="recorded" v={`${(recording.durationMs / 1000).toFixed(2)} s`} />
            <Row k="decoded" v={recDecoded || '…'} />
            {recEnvelope.length > 0 && <Bars values={recEnvelope} label={DEV_COPY.envelope} />}
          </div>
        )}
      </Section>

      <Section title={DEV_COPY.native}>
        <p className="text-body-s text-muted-foreground">{DEV_COPY.offsetHelp}</p>
        {clips.map((clip) => {
          const r = offsets[clip.m4a];
          return (
            <div key={clip.m4a} className="mt-3 border-t border-border pt-3">
              <p className="font-medium">{clip.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PLAYER_RATES.map((rate: PlayerRate) => (
                  <Button
                    key={rate}
                    variant="secondary"
                    onClick={() => void player.play(clip.m4a, rate).catch(() => undefined)}
                  >
                    {DEV_COPY.play(rate)}
                  </Button>
                ))}
                <Button variant="forest" onClick={() => void measure(clip)}>
                  {DEV_COPY.measure}
                </Button>
              </div>
              {typeof r === 'string' && <p className="mt-2 text-body-s">{r}</p>}
              {r && typeof r !== 'string' && (
                <div className="mt-2">
                  <Row k="offset (.m4a − .wav)" v={`${r.offsetMs.toFixed(0)} ms`} />
                  <Row k=".m4a decoded" v={`${r.m4aMs.toFixed(0)} ms at ${r.m4aRate} Hz`} />
                  <Row k=".wav decoded" v={`${r.wavMs.toFixed(0)} ms at ${r.wavRate} Hz`} />
                </div>
              )}
            </div>
          );
        })}
        {player.error && (
          <p className="mt-2 text-body-s text-primary-text">{DEV_COPY.playFailed(player.error)}</p>
        )}
      </Section>
    </>
  );
}
