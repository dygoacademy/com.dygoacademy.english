'use client';

import { useEffect, useState } from 'react';

import { getAudioContext, levelOf } from '@/lib/speaking/audio';

/** RMS at or above this lights the whole meter (as the old voice bars, 0.2). */
export const MIC_LEVEL_FULL = 0.2;
/** Each frame (~60 a second) the shown level keeps this much of the last one when the voice drops: a short ripple. */
export const MIC_LEVEL_DECAY = 0.88;

/** The next shown level (0–1) from the last one and a frame's RMS: up at once, down slowly. */
export function smoothLevel(prev: number, rms: number): number {
  const now = Math.min(1, Math.max(0, rms / MIC_LEVEL_FULL));
  return Math.max(now, prev * MIC_LEVEL_DECAY);
}

/** How many of `count` meter hexes a level lights. */
export function hexesLit(level: number, count: number): number {
  return Math.max(0, Math.min(count, Math.round(level * count)));
}

/**
 * The live mic level for P2's honeycomb voice meter (plan §3 P2): RMS from
 * an AnalyserNode on `stream`, each animation frame (~60 fps), smoothed by
 * `smoothLevel`. 0 when there's no stream or it isn't `active`. Doesn't
 * release the stream (the screen does).
 */
export function useMicLevel(stream: MediaStream | null, active = true): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!stream || !active) {
      setLevel(0);
      return;
    }
    let ctx: AudioContext | null;
    try {
      ctx = getAudioContext();
    } catch {
      return;
    }
    if (!ctx) return; // no Web Audio: the meter stays empty
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const block = new Float32Array(analyser.fftSize);
    let shown = 0;
    let frame = requestAnimationFrame(function tick() {
      analyser.getFloatTimeDomainData(block);
      const next = smoothLevel(shown, levelOf(block));
      if (Math.abs(next - shown) > 0.004 || (next === 0) !== (shown === 0)) setLevel(next);
      shown = next;
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      setLevel(0);
    };
  }, [stream, active]);

  return level;
}
