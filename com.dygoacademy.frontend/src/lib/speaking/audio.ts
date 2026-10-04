/**
 * Phase 13 audio core (T3, handover §4). Microphone, recorder, decoder,
 * resampler and RMS envelope for the speaking screens and the scorer.
 *
 * The maths (mono mix, resample, envelope, WAV) is pure and unit-tested.
 * The browser parts take their globals as optional arguments so tests can
 * pass fakes; screens call them with no arguments.
 *
 * iPhone rules: ask for the mic only inside a tap, create/resume the
 * AudioContext in that same tap (`resumeAudioContext`), and always release
 * the mic (`releaseStream`) so the red mic indicator goes away.
 */

/** Rate the scorer works at (handover §3 step 1). */
export const SPEAKING_SAMPLE_RATE = 16000;
/** Envelope frames per second (handover §3 step 3). */
export const ENVELOPE_FPS = 100;
/**
 * Safety cap: recording auto-stops here at the latest (30 s, handover v2
 * §3.2; was 15 s since G3-b). Normally it stops much earlier, when the
 * voice ends (`voiceEnded`) or nothing is heard (NOT_HEARD_MS).
 */
export const MAX_RECORDING_MS = 30000;

/**
 * Recorder formats, first supported wins. iOS Safari records `audio/mp4`
 * (AAC); Chrome and Firefox WebM/Opus. mp4 goes first so Safari never picks
 * WebM, whose decoding is newer there (decision S1-a in the phase notes).
 */
export const RECORDER_MIME_CANDIDATES = [
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
] as const;

export interface PcmAudio {
  samples: Float32Array;
  sampleRate: number;
}

export interface Recording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

// ── Pure helpers ───────────────────────────────────────────────────────────

/** Averages channels into one. A single channel is returned as is. */
export function toMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0];
  const n = Math.min(...channels.map((c) => c.length));
  const out = new Float32Array(n);
  for (const ch of channels) for (let i = 0; i < n; i++) out[i] += ch[i];
  for (let i = 0; i < n; i++) out[i] /= channels.length;
  return out;
}

/**
 * Resamples to `toRate`. Downsampling averages each output sample's input
 * window (a box filter, enough against aliasing for an energy envelope);
 * upsampling interpolates linearly.
 */
export function resample(
  samples: Float32Array,
  fromRate: number,
  toRate: number = SPEAKING_SAMPLE_RATE,
): Float32Array {
  if (fromRate <= 0 || toRate <= 0) throw new Error('sample rates must be positive');
  if (fromRate === toRate || samples.length === 0) return samples;
  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.round(samples.length / ratio));
  const out = new Float32Array(outLength);
  if (ratio > 1) {
    for (let i = 0; i < outLength; i++) {
      const a = Math.floor(i * ratio);
      const b = Math.min(samples.length, Math.max(a + 1, Math.floor((i + 1) * ratio)));
      let sum = 0;
      for (let k = a; k < b; k++) sum += samples[k];
      out[i] = sum / (b - a);
    }
  } else {
    const last = samples.length - 1;
    for (let i = 0; i < outLength; i++) {
      const x = i * ratio;
      const k = Math.min(last, Math.floor(x));
      const t = x - k;
      out[i] = samples[k] * (1 - t) + samples[Math.min(last, k + 1)] * t;
    }
  }
  return out;
}

/**
 * RMS per frame at `fps` frames a second (0..1 for samples in −1..1). The
 * last, shorter frame counts if it holds at least half a frame.
 */
export function rmsEnvelope(
  samples: Float32Array,
  sampleRate: number,
  fps: number = ENVELOPE_FPS,
): number[] {
  const frame = Math.max(1, Math.round(sampleRate / fps));
  const out: number[] = [];
  for (let a = 0; a < samples.length; a += frame) {
    const b = Math.min(samples.length, a + frame);
    if (b - a < frame / 2 && out.length > 0) break;
    let sum = 0;
    for (let i = a; i < b; i++) sum += samples[i] * samples[i];
    out.push(Math.sqrt(sum / (b - a)));
  }
  return out;
}

/** 16-bit mono PCM WAV (the PCM fallback recorder's output). */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const ascii = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ascii(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? Math.round(s * 32768) : Math.round(s * 32767), true);
  }
  return buf;
}

/** First supported recorder format, or null (then use the PCM fallback). */
export function pickRecorderMime(
  isTypeSupported: ((mime: string) => boolean) | undefined = typeof MediaRecorder !== 'undefined'
    ? (m) => MediaRecorder.isTypeSupported(m)
    : undefined,
): string | null {
  if (!isTypeSupported) return null;
  return RECORDER_MIME_CANDIDATES.find((m) => isTypeSupported(m)) ?? null;
}

// ── Support and microphone ────────────────────────────────────────────────

export type RecorderKind = 'media-recorder' | 'pcm';

export interface SpeakingSupport {
  /** getUserMedia exists (needs a secure origin). */
  mic: boolean;
  /** How we'd record, or null when speaking can't work here. */
  recorder: RecorderKind | null;
}

type AudioContextCtor = new (options?: AudioContextOptions) => AudioContext;

function audioContextCtor(win: typeof globalThis = globalThis): AudioContextCtor | undefined {
  const w = win as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

/** Whether this browser can record at all (T7 "no support" state). */
export function speakingSupport(win: typeof globalThis = globalThis): SpeakingSupport {
  const nav = (win as { navigator?: Navigator }).navigator;
  const mic = typeof nav?.mediaDevices?.getUserMedia === 'function';
  if (!mic) return { mic, recorder: null };
  if (typeof (win as { MediaRecorder?: unknown }).MediaRecorder === 'function') {
    return { mic, recorder: 'media-recorder' };
  }
  return { mic, recorder: audioContextCtor(win) ? 'pcm' : null };
}

export type MicPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

/** The mic permission without prompting; 'unknown' where the browser won't say. */
export async function micPermission(
  nav: Navigator | undefined = typeof navigator !== 'undefined' ? navigator : undefined,
): Promise<MicPermission> {
  try {
    const status = await nav?.permissions?.query({ name: 'microphone' as PermissionName });
    const s = status?.state;
    return s === 'granted' || s === 'denied' || s === 'prompt' ? s : 'unknown';
  } catch {
    return 'unknown';
  }
}

export type MicErrorKind = 'denied' | 'no-device' | 'unsupported' | 'failed';

export class MicError extends Error {
  constructor(
    readonly kind: MicErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'MicError';
  }
}

export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
};

/** Opens the mic. Call from a tap. Throws a `MicError` with a kind the UI can show. */
export async function requestMic(
  nav: Navigator | undefined = typeof navigator !== 'undefined' ? navigator : undefined,
): Promise<MediaStream> {
  if (typeof nav?.mediaDevices?.getUserMedia !== 'function') {
    throw new MicError('unsupported', 'getUserMedia is not available');
  }
  try {
    return await nav.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new MicError('denied', 'microphone permission denied');
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      throw new MicError('no-device', 'no microphone found');
    }
    throw new MicError('failed', (err as Error)?.message ?? 'getUserMedia failed');
  }
}

/** Stops every track so the browser's mic indicator turns off. */
export function releaseStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((t) => t.stop());
}

// ── AudioContext ──────────────────────────────────────────────────────────

let sharedContext: AudioContext | null = null;

/** The app's one AudioContext, created on first use. */
export function getAudioContext(win: typeof globalThis = globalThis): AudioContext {
  if (sharedContext && sharedContext.state !== 'closed') return sharedContext;
  const Ctor = audioContextCtor(win);
  if (!Ctor) throw new Error('Web Audio is not available');
  sharedContext = new Ctor();
  return sharedContext;
}

/** Creates/resumes the shared context. Call inside the tap handler (iOS). */
export async function resumeAudioContext(
  win: typeof globalThis = globalThis,
): Promise<AudioContext> {
  const ctx = getAudioContext(win);
  if (ctx.state === 'suspended') await ctx.resume();
  return ctx;
}

/** Test hook: forget the shared context. */
export function resetAudioContextForTest(): void {
  sharedContext = null;
}

// ── Decoding ──────────────────────────────────────────────────────────────

type Decoder = Pick<BaseAudioContext, 'decodeAudioData'>;

/** Blob → bytes; FileReader where `Blob.arrayBuffer` is missing (older Safari). */
function blobBytes(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/** Decodes a clip (Blob or bytes) to mono PCM at its own rate. */
export async function decodeToMono(data: Blob | ArrayBuffer, ctx: Decoder): Promise<PcmAudio> {
  const bytes = data instanceof ArrayBuffer ? data : await blobBytes(data);
  // Safari's decodeAudioData detaches the buffer: hand it a copy.
  const buffer = await ctx.decodeAudioData(bytes.slice(0));
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));
  return { samples: toMono(channels), sampleRate: buffer.sampleRate };
}

/** Decodes and resamples to the scorer's 16 kHz. */
export async function decodeForScoring(data: Blob | ArrayBuffer, ctx: Decoder): Promise<PcmAudio> {
  const pcm = await decodeToMono(data, ctx);
  return {
    samples: resample(pcm.samples, pcm.sampleRate, SPEAKING_SAMPLE_RATE),
    sampleRate: SPEAKING_SAMPLE_RATE,
  };
}

/** Fetches a native clip and decodes it (needs CORS on the media host, D7). */
export async function fetchAndDecode(
  url: string,
  ctx: Decoder,
  fetcher: typeof fetch = fetch,
): Promise<PcmAudio> {
  const res = await fetcher(url);
  if (!res.ok) throw new Error(`audio ${res.status}`);
  return decodeToMono(await res.arrayBuffer(), ctx);
}

// ── Recorder ──────────────────────────────────────────────────────────────

export interface Recorder {
  readonly kind: RecorderKind;
  start(): void;
  /** Stops and returns the clip. Also called by the auto-stop at `maxMs`. */
  stop(): Promise<Recording>;
  /** Stops without a result (Cancel, leaving the screen). */
  cancel(): void;
}

export interface RecorderOptions {
  maxMs?: number;
  /** Called when the recorder stops on its own at `maxMs`. */
  onAutoStop?: (recording: Recording) => void;
  /** Clock, for tests. */
  now?: () => number;
  win?: typeof globalThis;
}

/**
 * A recorder on `stream`: MediaRecorder when the browser has it, else PCM
 * captured through a ScriptProcessor and wrapped as WAV. Doesn't release
 * the stream; the caller does (`releaseStream`) when the screen is done.
 */
export function createRecorder(stream: MediaStream, options: RecorderOptions = {}): Recorder {
  const win = options.win ?? globalThis;
  const support = speakingSupport(win);
  if (support.recorder === 'media-recorder') return mediaRecorder(stream, options, win);
  if (support.recorder === 'pcm') return pcmRecorder(stream, options, win);
  throw new MicError('unsupported', 'no way to record in this browser');
}

function withAutoStop(recorder: Recorder, options: RecorderOptions): Recorder {
  const maxMs = options.maxMs ?? MAX_RECORDING_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let done = false;
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return {
    kind: recorder.kind,
    start() {
      recorder.start();
      timer = setTimeout(() => {
        timer = null;
        if (done) return;
        done = true;
        void recorder.stop().then(
          (r) => options.onAutoStop?.(r),
          () => undefined,
        );
      }, maxMs);
    },
    stop() {
      clear();
      if (done) return Promise.reject(new Error('recorder already stopped'));
      done = true;
      return recorder.stop();
    },
    cancel() {
      clear();
      done = true;
      recorder.cancel();
    },
  };
}

function mediaRecorder(
  stream: MediaStream,
  options: RecorderOptions,
  win: typeof globalThis,
): Recorder {
  const MR = (win as unknown as { MediaRecorder: typeof MediaRecorder }).MediaRecorder;
  const now = options.now ?? (() => performance.now());
  const mime = pickRecorderMime((m) => MR.isTypeSupported(m));
  const rec = new MR(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  let startedAt = 0;
  rec.ondataavailable = (e: BlobEvent) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  return withAutoStop(
    {
      kind: 'media-recorder',
      start() {
        startedAt = now();
        rec.start();
      },
      stop() {
        return new Promise<Recording>((resolve, reject) => {
          rec.onstop = () => {
            const mimeType = rec.mimeType || mime || chunks[0]?.type || 'audio/mp4';
            resolve({
              blob: new Blob(chunks, { type: mimeType }),
              mimeType,
              durationMs: now() - startedAt,
            });
          };
          rec.onerror = () => reject(new Error('recording failed'));
          if (rec.state === 'inactive') rec.onstop(new Event('stop'));
          else rec.stop();
        });
      },
      cancel() {
        rec.ondataavailable = null;
        rec.onstop = null;
        if (rec.state !== 'inactive') rec.stop();
      },
    },
    options,
  );
}

function pcmRecorder(
  stream: MediaStream,
  options: RecorderOptions,
  win: typeof globalThis,
): Recorder {
  const now = options.now ?? (() => performance.now());
  const ctx = getAudioContext(win);
  const source = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const parts: Float32Array[] = [];
  let startedAt = 0;
  const disconnect = () => {
    node.onaudioprocess = null;
    source.disconnect();
    node.disconnect();
  };
  return withAutoStop(
    {
      kind: 'pcm',
      start() {
        startedAt = now();
        node.onaudioprocess = (e: AudioProcessingEvent) => {
          parts.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        };
        source.connect(node);
        node.connect(ctx.destination); // ScriptProcessor only runs when connected
      },
      async stop() {
        disconnect();
        const total = parts.reduce((n, p) => n + p.length, 0);
        const all = new Float32Array(total);
        let at = 0;
        for (const p of parts) {
          all.set(p, at);
          at += p.length;
        }
        const blob = new Blob([encodeWav(all, ctx.sampleRate)], { type: 'audio/wav' });
        return { blob, mimeType: 'audio/wav', durationMs: now() - startedAt };
      },
      cancel: disconnect,
    },
    options,
  );
}

// ── Measuring ─────────────────────────────────────────────────────────────

/**
 * RMS (0..1) of the `hz` tone in samples[from, to) (Goertzel): how much of
 * one pure tone is in a stretch of audio. The dev page uses it to check the
 * 880 Hz start beep didn't leak into a recording (S19).
 */
export function toneRms(
  samples: Float32Array,
  sampleRate: number,
  hz: number,
  from = 0,
  to = samples.length,
): number {
  const n = Math.max(0, Math.min(to, samples.length) - from);
  if (n === 0) return 0;
  const w = (2 * Math.PI * hz) / sampleRate;
  const coeff = 2 * Math.cos(w);
  let s1 = 0;
  let s2 = 0;
  for (let i = from; i < from + n; i++) {
    const s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  // |X(f)| = A·n/2 for a sine of amplitude A, whose RMS is A/√2.
  return (2 * Math.sqrt(Math.max(0, power))) / n / Math.SQRT2;
}

/** RMS (0..1) of one block of time-domain samples: one live level. */
export function levelOf(block: Float32Array): number {
  if (block.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < block.length; i++) sum += block[i] * block[i];
  return Math.sqrt(sum / block.length);
}

/**
 * How much later `candidate` starts than `reference`, in ms (negative =
 * earlier), from the best normalised cross-correlation of two envelopes at
 * `fps` within ±`maxLagMs`. Used to see whether the AAC `.m4a` decodes
 * shifted against its `.wav` (encoder delay), which would move the word
 * timings.
 */
export function estimateOffsetMs(
  reference: number[],
  candidate: number[],
  fps: number,
  maxLagMs = 200,
): number {
  const maxLag = Math.round((maxLagMs / 1000) * fps);
  let best = 0;
  let bestScore = -Infinity;
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let dot = 0;
    let ra = 0;
    let rb = 0;
    for (let i = 0; i < reference.length; i++) {
      const j = i + lag;
      if (j < 0 || j >= candidate.length) continue;
      dot += reference[i] * candidate[j];
      ra += reference[i] * reference[i];
      rb += candidate[j] * candidate[j];
    }
    const score = ra > 0 && rb > 0 ? dot / Math.sqrt(ra * rb) : -Infinity;
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  return (best / fps) * 1000;
}
