'use client';

import { useEffect, useState } from 'react';

import {
  ENVELOPE_FPS,
  fetchAndDecode,
  getAudioContext,
  rmsEnvelope,
  type PcmAudio,
} from '@/lib/speaking/audio';

export interface NativeClip {
  /** Decoded mono PCM (for the scorer). */
  pcm: PcmAudio;
  /** RMS envelope at 100 fps (for the waveforms). */
  envelope: number[];
}

const cache = new Map<string, Promise<NativeClip>>();

/** Decodes a native clip once per URL (shared by the screens of a session). */
export function loadNativeClip(url: string): Promise<NativeClip> {
  let p = cache.get(url);
  if (!p) {
    p = fetchAndDecode(url, getAudioContext()).then((pcm) => ({
      pcm,
      envelope: rmsEnvelope(pcm.samples, pcm.sampleRate, ENVELOPE_FPS),
    }));
    p.catch(() => cache.delete(url)); // let a retry fetch again
    cache.set(url, p);
  }
  return p;
}

/** Test hook. */
export function clearNativeClipsForTest(): void {
  cache.clear();
}

/**
 * The native clip for `url`, decoded (needs CORS on the media host, D7).
 * `error` is set when it can't be fetched or decoded (T7 "audio failed").
 */
export function useNativeEnvelope(url: string | null | undefined): {
  clip: NativeClip | null;
  error: boolean;
  retry: () => void;
} {
  const [state, setState] = useState<{
    url: string | null;
    clip: NativeClip | null;
    error: boolean;
  }>({
    url: null,
    clip: null,
    error: false,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    setState({ url, clip: null, error: false });
    loadNativeClip(url).then(
      (clip) => alive && setState({ url, clip, error: false }),
      () => alive && setState({ url, clip: null, error: true }),
    );
    return () => {
      alive = false;
    };
  }, [url, attempt]);

  const current = state.url === url ? state : { clip: null, error: false };
  return { clip: current.clip, error: current.error, retry: () => setAttempt((a) => a + 1) };
}
