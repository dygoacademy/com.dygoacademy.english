import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createRecorder,
  decodeForScoring,
  decodeToMono,
  encodeWav,
  estimateOffsetMs,
  levelOf,
  ENVELOPE_FPS,
  MAX_RECORDING_MS,
  MicError,
  micPermission,
  pickRecorderMime,
  releaseStream,
  requestMic,
  resample,
  rmsEnvelope,
  SPEAKING_SAMPLE_RATE,
  speakingSupport,
  toMono,
} from './audio';

function sine(freq: number, seconds: number, rate: number, amp = 0.5): Float32Array {
  const out = new Float32Array(Math.round(seconds * rate));
  for (let i = 0; i < out.length; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / rate);
  return out;
}

/** Upward zero crossings per second ≈ the frequency. */
function frequencyOf(samples: Float32Array, rate: number): number {
  let n = 0;
  for (let i = 1; i < samples.length; i++) if (samples[i - 1] < 0 && samples[i] >= 0) n++;
  return n / (samples.length / rate);
}

describe('toMono', () => {
  it('averages channels and passes one channel through', () => {
    const a = new Float32Array([1, 0.5, 0]);
    expect(toMono([a])).toBe(a);
    expect(Array.from(toMono([a, new Float32Array([0, 0.5, 1])]))).toEqual([0.5, 0.5, 0.5]);
    expect(toMono([])).toHaveLength(0);
  });
});

describe('resample', () => {
  it('downsamples 48 kHz to 16 kHz keeping length, level and pitch', () => {
    const src = sine(220, 1, 48000);
    const out = resample(src, 48000);
    expect(out).toHaveLength(16000);
    expect(frequencyOf(out, 16000)).toBeCloseTo(220, -1);
    const peak = Math.max(...Array.from(out));
    expect(peak).toBeGreaterThan(0.48);
    expect(peak).toBeLessThanOrEqual(0.5);
  });

  it('handles 44.1 kHz (a non-integer ratio) and keeps a constant signal constant', () => {
    const out = resample(new Float32Array(44100).fill(0.25), 44100);
    expect(out).toHaveLength(16000);
    expect(out.every((v) => Math.abs(v - 0.25) < 1e-6)).toBe(true);
  });

  it('upsamples by linear interpolation and returns the input when rates match', () => {
    expect(Array.from(resample(new Float32Array([0, 1]), 8000, 16000))).toEqual([0, 0.5, 1, 1]);
    const same = new Float32Array([1, 2]);
    expect(resample(same, 16000, 16000)).toBe(same);
    expect(() => resample(same, 0)).toThrow();
  });
});

describe('rmsEnvelope', () => {
  it('gives 100 frames a second', () => {
    expect(ENVELOPE_FPS).toBe(100);
    expect(rmsEnvelope(new Float32Array(SPEAKING_SAMPLE_RATE * 2), SPEAKING_SAMPLE_RATE)).toHaveLength(200);
  });

  it('measures a sine at amplitude / √2 and silence at 0', () => {
    const env = rmsEnvelope(sine(200, 1, 16000, 0.8), 16000);
    for (const v of env) expect(v).toBeCloseTo(0.8 / Math.SQRT2, 2);
    expect(rmsEnvelope(new Float32Array(1600), 16000).every((v) => v === 0)).toBe(true);
  });

  it('follows loud and quiet parts in time', () => {
    const rate = 16000;
    const clip = new Float32Array(rate); // 1 s: quiet, then 0.5 s tone
    clip.set(sine(300, 0.5, rate), rate / 2);
    const env = rmsEnvelope(clip, rate);
    expect(Math.max(...env.slice(0, 49))).toBe(0);
    expect(Math.min(...env.slice(51))).toBeGreaterThan(0.3);
  });

  it('keeps a trailing half frame and drops a smaller one', () => {
    expect(rmsEnvelope(new Float32Array(160 + 80), 16000)).toHaveLength(2);
    expect(rmsEnvelope(new Float32Array(160 + 79), 16000)).toHaveLength(1);
  });
});

describe('encodeWav', () => {
  it('writes a 16-bit mono PCM header and clamped samples', () => {
    const buf = encodeWav(new Float32Array([0, 1, -1, 2]), 16000);
    const v = new DataView(buf);
    const text = (at: number) => String.fromCharCode(...new Uint8Array(buf, at, 4));
    expect(buf.byteLength).toBe(44 + 8);
    expect([text(0), text(8), text(12), text(36)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data']);
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(16000);
    expect(v.getUint16(34, true)).toBe(16);
    expect([1, 2, 3].map((i) => v.getInt16(44 + i * 2, true))).toEqual([32767, -32768, 32767]);
  });
});

describe('pickRecorderMime', () => {
  it('prefers mp4 (iOS Safari), then WebM/Opus, else null', () => {
    expect(pickRecorderMime((m) => m === 'audio/mp4' || m.startsWith('audio/webm'))).toBe('audio/mp4');
    expect(pickRecorderMime((m) => m.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(pickRecorderMime(() => false)).toBeNull();
    expect(pickRecorderMime(undefined)).toBeNull();
  });
});

function fakeNav(getUserMedia?: () => Promise<MediaStream>, state?: string): Navigator {
  return {
    mediaDevices: getUserMedia ? { getUserMedia } : undefined,
    permissions: { query: vi.fn().mockResolvedValue({ state }) },
  } as unknown as Navigator;
}

describe('speakingSupport', () => {
  it('reports how recording would work', () => {
    const nav = fakeNav(() => Promise.resolve({} as MediaStream));
    class AC {}
    expect(speakingSupport({ navigator: nav, MediaRecorder: class {} } as never)).toEqual({
      mic: true,
      recorder: 'media-recorder',
    });
    expect(speakingSupport({ navigator: nav, webkitAudioContext: AC } as never)).toEqual({
      mic: true,
      recorder: 'pcm',
    });
    expect(speakingSupport({ navigator: nav } as never)).toEqual({ mic: true, recorder: null });
    expect(speakingSupport({ navigator: fakeNav() } as never)).toEqual({ mic: false, recorder: null });
  });
});

describe('micPermission / requestMic / releaseStream', () => {
  it('reads the permission without prompting', async () => {
    expect(await micPermission(fakeNav(undefined, 'denied'))).toBe('denied');
    expect(await micPermission(fakeNav(undefined, 'weird'))).toBe('unknown');
    const throwing = { permissions: { query: () => Promise.reject(new TypeError('no')) } };
    expect(await micPermission(throwing as unknown as Navigator)).toBe('unknown');
    expect(await micPermission(undefined)).toBe('unknown');
  });

  it('asks for a mono, echo-cancelled mic and maps errors to kinds', async () => {
    const stream = {} as MediaStream;
    const gum = vi.fn().mockResolvedValue(stream);
    expect(await requestMic(fakeNav(gum))).toBe(stream);
    expect(gum).toHaveBeenCalledWith({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });

    const failWith = (name: string) =>
      requestMic(fakeNav(() => Promise.reject(Object.assign(new Error(name), { name })))).catch(
        (e: MicError) => e.kind,
      );
    expect(await failWith('NotAllowedError')).toBe('denied');
    expect(await failWith('NotFoundError')).toBe('no-device');
    expect(await failWith('AbortError')).toBe('failed');
    await expect(requestMic(fakeNav())).rejects.toMatchObject({ kind: 'unsupported' });
  });

  it('stops every track', () => {
    const stop = vi.fn();
    releaseStream({ getTracks: () => [{ stop }, { stop }] } as unknown as MediaStream);
    expect(stop).toHaveBeenCalledTimes(2);
    expect(() => releaseStream(null)).not.toThrow();
  });
});

function fakeBuffer(channels: Float32Array[], sampleRate: number): AudioBuffer {
  return {
    numberOfChannels: channels.length,
    sampleRate,
    getChannelData: (c: number) => channels[c],
  } as unknown as AudioBuffer;
}

describe('decodeToMono / decodeForScoring', () => {
  it('decodes a copy of the bytes, mixes to mono and resamples to 16 kHz', async () => {
    const left = sine(220, 0.5, 48000);
    const decodeAudioData = vi.fn().mockResolvedValue(fakeBuffer([left, left], 48000));
    const bytes = new ArrayBuffer(8);
    const mono = await decodeToMono(bytes, { decodeAudioData } as never);
    expect(decodeAudioData.mock.calls[0][0]).not.toBe(bytes);
    expect(mono.sampleRate).toBe(48000);
    expect(mono.samples[100]).toBeCloseTo(left[100], 6);

    const scored = await decodeForScoring(new Blob([new Uint8Array(4)]), { decodeAudioData } as never);
    expect(scored.sampleRate).toBe(16000);
    expect(scored.samples).toHaveLength(8000);
  });
});

/** A MediaRecorder stand-in that emits one chunk on stop. */
class FakeMediaRecorder {
  static isTypeSupported = (m: string) => m === 'audio/webm;codecs=opus';
  static last: FakeMediaRecorder | null = null;
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(
    readonly stream: MediaStream,
    readonly options?: { mimeType: string },
  ) {
    FakeMediaRecorder.last = this;
  }
  get mimeType() {
    return this.options?.mimeType ?? '';
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['abc'], { type: this.mimeType }) });
    this.onstop?.();
  }
}

describe('createRecorder (MediaRecorder)', () => {
  let t = 0;
  const win = () =>
    ({
      navigator: fakeNav(() => Promise.resolve({} as MediaStream)),
      MediaRecorder: FakeMediaRecorder,
    }) as never;
  beforeEach(() => {
    vi.useFakeTimers();
    t = 0;
  });
  afterEach(() => vi.useRealTimers());

  it('records with the picked format and returns blob, type and duration', async () => {
    const rec = createRecorder({} as MediaStream, { win: win(), now: () => t });
    expect(rec.kind).toBe('media-recorder');
    rec.start();
    expect(FakeMediaRecorder.last?.options).toEqual({ mimeType: 'audio/webm;codecs=opus' });
    t = 2300;
    const r = await rec.stop();
    expect(r.mimeType).toBe('audio/webm;codecs=opus');
    expect(r.durationMs).toBe(2300);
    expect(r.blob.size).toBe(3);
    await expect(rec.stop()).rejects.toThrow('already stopped');
  });

  it('stops on its own at the 8 s cap', async () => {
    const onAutoStop = vi.fn();
    const rec = createRecorder({} as MediaStream, { win: win(), now: () => t, onAutoStop });
    rec.start();
    t = MAX_RECORDING_MS;
    await vi.advanceTimersByTimeAsync(MAX_RECORDING_MS);
    expect(onAutoStop).toHaveBeenCalledWith(expect.objectContaining({ durationMs: MAX_RECORDING_MS }));
  });

  it('cancel gives no result and no auto-stop', async () => {
    const onAutoStop = vi.fn();
    const rec = createRecorder({} as MediaStream, { win: win(), onAutoStop });
    rec.start();
    rec.cancel();
    expect(FakeMediaRecorder.last?.state).toBe('inactive');
    await vi.advanceTimersByTimeAsync(MAX_RECORDING_MS);
    expect(onAutoStop).not.toHaveBeenCalled();
  });

  it('throws an unsupported MicError when nothing can record', () => {
    expect(() => createRecorder({} as MediaStream, { win: { navigator: fakeNav() } as never })).toThrow(MicError);
  });
});

describe('levelOf / estimateOffsetMs', () => {
  it('gives the RMS of a block', () => {
    expect(levelOf(new Float32Array([0.5, -0.5]))).toBeCloseTo(0.5);
    expect(levelOf(new Float32Array(0))).toBe(0);
  });

  it('finds how much later a copy starts (encoder delay)', () => {
    const rate = 16000;
    const ref = new Float32Array(rate);
    ref.set(sine(300, 0.2, rate), 3200); // bursts at 0.2 s and 0.6 s
    ref.set(sine(500, 0.1, rate), 9600);
    const delayed = new Float32Array(rate);
    delayed.set(ref.subarray(0, rate - 336), 336); // 21 ms later
    const fps = 1000;
    const a = rmsEnvelope(ref, rate, fps);
    const b = rmsEnvelope(delayed, rate, fps);
    expect(estimateOffsetMs(a, b, fps)).toBe(21);
    expect(estimateOffsetMs(b, a, fps)).toBe(-21);
    expect(estimateOffsetMs(a, a, fps)).toBe(0);
  });
});
