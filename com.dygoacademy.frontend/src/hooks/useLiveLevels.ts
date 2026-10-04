'use client';

import { useEffect, useState } from 'react';

import { getAudioContext, levelOf } from '@/lib/speaking/audio';

/** Live levels per second while recording (one bar each, SP2 live waveform). */
export const LIVE_LEVELS_PER_SECOND = 20;

/**
 * Live microphone levels for SP2 (Phase 13 T3): an AnalyserNode on the
 * mic stream, sampled every animation frame and averaged into
 * LIVE_LEVELS_PER_SECOND bars (RMS, 0..1). Starts when `stream` is set and
 * `active` is true; the bars reset when a new stream arrives. Doesn't
 * release the stream (the screen does).
 */
export function useLiveLevels(stream: MediaStream | null, active = true): number[] {
  const [levels, setLevels] = useState<number[]>([]);

  useEffect(() => {
    setLevels((prev) => (prev.length ? [] : prev));
  }, [stream]);

  useEffect(() => {
    if (!stream || !active) return;
    let ctx: AudioContext;
    try {
      ctx = getAudioContext();
    } catch {
      return;
    }
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const block = new Float32Array(analyser.fftSize);
    const barMs = 1000 / LIVE_LEVELS_PER_SECOND;
    let barStart = performance.now();
    let sum = 0;
    let count = 0;
    let frame = requestAnimationFrame(function tick(now) {
      analyser.getFloatTimeDomainData(block);
      sum += levelOf(block);
      count += 1;
      if (now - barStart >= barMs) {
        const level = sum / count;
        setLevels((prev) => [...prev, level]);
        barStart = now;
        sum = 0;
        count = 0;
      }
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      analyser.disconnect();
    };
  }, [stream, active]);

  return levels;
}
