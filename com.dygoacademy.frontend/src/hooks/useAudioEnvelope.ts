'use client';

import { useEffect, useState } from 'react';

import { ENVELOPE_FPS, fetchAndDecode, getAudioContext, rmsEnvelope } from '@/lib/speaking/audio';
import { voicedBars } from '@/lib/speaking/pronounce';

/**
 * `levels` (an RMS envelope at ENVELOPE_FPS) as `buckets` bars for the P4
 * mirror waveform (honeycomb plan §3 P4): the voiced part only, averaged
 * into equal buckets, scaled so the loudest is 1. Empty when there's no
 * voice.
 */
export function envelopeBuckets(levels: readonly number[], buckets: number): number[] {
  const voice = voicedBars(levels, ENVELOPE_FPS);
  if (voice.length === 0 || buckets <= 0) return [];
  const out = Array.from({ length: buckets }, (_, b) => {
    const a = Math.floor((b * voice.length) / buckets);
    const z = Math.max(a + 1, Math.floor(((b + 1) * voice.length) / buckets));
    let sum = 0;
    for (let i = a; i < z; i++) sum += voice[Math.min(i, voice.length - 1)];
    return sum / (z - a);
  });
  const peak = Math.max(...out);
  return peak > 0 ? out.map((v) => v / peak) : out.map(() => 0);
}

const cache = new Map<string, Promise<number[]>>();

/** Decodes `url` once per bucket count (media URLs and the take's `blob:` URL). */
export function loadAudioEnvelope(url: string, buckets: number): Promise<number[]> {
  const key = `${buckets}|${url}`;
  let p = cache.get(key);
  if (!p) {
    p = fetchAndDecode(url, getAudioContext()).then((pcm) =>
      envelopeBuckets(rmsEnvelope(pcm.samples, pcm.sampleRate, ENVELOPE_FPS), buckets),
    );
    p.catch(() => cache.delete(key)); // a later visit tries again
    cache.set(key, p);
  }
  return p;
}

/** Test hook. */
export function clearAudioEnvelopesForTest(): void {
  cache.clear();
}

/**
 * The clip at `url` as `buckets` bars, 0–1, cached by URL. `bars` is null
 * while it loads; `error` when it can't be fetched or decoded (the screen
 * shows a flat skeleton row and keeps working).
 */
export function useAudioEnvelope(
  url: string | null | undefined,
  buckets = 40,
): { bars: number[] | null; error: boolean } {
  const [state, setState] = useState<{ key: string | null; bars: number[] | null; error: boolean }>({
    key: null,
    bars: null,
    error: false,
  });
  const key = url ? `${buckets}|${url}` : null;

  useEffect(() => {
    if (!url) return;
    let alive = true;
    loadAudioEnvelope(url, buckets).then(
      (bars) => alive && setState({ key: `${buckets}|${url}`, bars, error: false }),
      () => alive && setState({ key: `${buckets}|${url}`, bars: null, error: true }),
    );
    return () => {
      alive = false;
    };
  }, [url, buckets]);

  return state.key === key && key ? { bars: state.bars, error: state.error } : { bars: null, error: false };
}
