import { encodeWav, fetchAndDecode, getAudioContext, type PcmAudio } from './audio';

/**
 * Pronunciation "Slowly" (and the wobbly syllable): a slowed copy of a native
 * clip, made in the browser, that the player plays at 1×.
 *
 * iPhone played Slowly silently: right after Hear it, the button showed the
 * clip playing for its whole (slowed) length with no sound (Dylan's iPhone,
 * 2026-10-18, also after the seek / rate fix in 8fb818f). Hear it at 1× always
 * worked, so the slow playbackRate on iOS is the part that fails. A copy
 * stretched here (WSOLA: pitch kept) plays at 1×, like every other clip.
 */

/** A part of the clip, in seconds (a word or syllable of a sentence clip). */
export interface SlowSpan {
  start: number;
  end: number;
}

/**
 * Stretches speech to `1 / rate` of its speed, pitch kept (WSOLA: 30 ms Hann
 * frames, half-overlapped, each lined up with the previous one within ±10 ms).
 */
export function stretchSpeech(samples: Float32Array, sampleRate: number, rate: number): Float32Array {
  if (rate >= 1 || samples.length === 0) return samples;
  const n = Math.max(64, Math.round(sampleRate * 0.03) & ~1);
  const hs = n / 2;
  const ha = hs * rate;
  const tol = Math.round(sampleRate * 0.01);
  const window = new Float32Array(n);
  for (let i = 0; i < n; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);

  const outLength = Math.ceil(samples.length / rate);
  const frames = Math.ceil(outLength / hs) + 1;
  const out = new Float32Array(frames * hs + n);
  const weight = new Float32Array(out.length);
  const at = (i: number) => (i >= 0 && i < samples.length ? samples[i] : 0);

  let prev = 0; // where the last frame was taken from
  for (let k = 0; k < frames; k++) {
    const nominal = Math.round(k * ha);
    let from = nominal;
    if (k > 0) {
      // The frame that best continues the last one (its natural next hop).
      const natural = prev + hs;
      let best = -Infinity;
      for (let d = -tol; d <= tol; d++) {
        const cand = nominal + d;
        if (cand < 0) continue;
        let c = 0;
        for (let i = 0; i < n; i += 2) c += at(natural + i) * at(cand + i);
        if (c > best) {
          best = c;
          from = cand;
        }
      }
    }
    const to = k * hs;
    for (let i = 0; i < n; i++) {
      out[to + i] += at(from + i) * window[i];
      weight[to + i] += window[i];
    }
    prev = from;
  }
  const result = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) result[i] = weight[i] > 1e-3 ? out[i] / weight[i] : out[i];
  return result;
}

/** The span of a decoded clip (all of it without one). */
export function cutSpan(pcm: PcmAudio, span?: SlowSpan): Float32Array {
  if (!span) return pcm.samples;
  const a = Math.max(0, Math.floor(span.start * pcm.sampleRate));
  const b = Math.min(pcm.samples.length, Math.ceil(span.end * pcm.sampleRate));
  return pcm.samples.slice(a, Math.max(a, b));
}

type Decoder = Parameters<typeof fetchAndDecode>[1];

function decoder(): Decoder {
  // An offline context decodes without starting audio output; the shared one otherwise.
  const Offline =
    (globalThis as { OfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext ??
    (globalThis as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (Offline) {
    try {
      return new Offline(1, 1, 44100);
    } catch {
      // fall through
    }
  }
  return getAudioContext();
}

const cache = new Map<string, Promise<string>>();
/** Copies already made, readable without waiting (playing inside a tap). */
const made = new Map<string, string>();

const keyOf = (src: string, rate: number, span?: SlowSpan) =>
  `${src}|${rate}|${span ? `${span.start}-${span.end}` : ''}`;

/** The copy's `blob:` URL when it is already made, or null. */
export function readySlowClip(src: string, rate: number, span?: SlowSpan): string | null {
  return made.get(keyOf(src, rate, span)) ?? null;
}

/**
 * A `blob:` URL of `src` (only `span` of it) slowed to `rate`, to play at 1×.
 * Made once per clip, span and rate. Rejects when the clip can't be fetched
 * or decoded (no CORS, offline): the caller then falls back to playbackRate.
 */
export function makeSlowClip(
  src: string,
  rate: number,
  span?: SlowSpan,
  load: (url: string) => Promise<PcmAudio> = (url) => fetchAndDecode(url, decoder()),
): Promise<string> {
  const key = keyOf(src, rate, span);
  let making = cache.get(key);
  if (!making) {
    making = load(src).then((pcm) => {
      const slow = stretchSpeech(cutSpan(pcm, span), pcm.sampleRate, rate);
      const url = URL.createObjectURL(new Blob([encodeWav(slow, pcm.sampleRate)], { type: 'audio/wav' }));
      made.set(key, url);
      return url;
    });
    making.catch(() => cache.delete(key));
    cache.set(key, making);
  }
  return making;
}

/** Test hook. */
export function resetSlowClipsForTest(): void {
  cache.clear();
  made.clear();
}
