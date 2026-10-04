import type { SpeakingTimings } from '@/types';

/**
 * Shared geometry and colours for the Phase 13 waveforms (T5), measured
 * from the design files (`phase/phase 13/phase13-speaking-design/`): every
 * waveform is 322 units wide with 72 bars; heights differ per screen.
 * Colours are the existing design-system variables (globals.css), mapped
 * from the handover's hex values.
 */
export const WAVE_WIDTH = 322;
export const WAVE_BARS = 72;
export const BAR_PITCH = WAVE_WIDTH / WAVE_BARS;

export const WAVE_COLORS = {
  /** native, solid (SP1, stacked compare) #7FA487 */
  native: 'var(--stage-tree-canopy)',
  /** native, pale (live and overlay) #B7D6AE */
  nativePale: 'var(--stage-sprout)',
  /** the learner #B4552E */
  user: 'var(--color-primary)',
  /** target word band on SP1 #DDE7DA */
  targetListen: 'var(--color-on-forest-muted)',
  /** target word band on SP3, "needs work" #F2D28B */
  targetCompare: 'var(--color-gold-light)',
  /** centre line #E3DDD0 */
  midline: 'var(--color-border)',
  /** playhead #1C2B24 */
  head: 'var(--color-text)',
} as const;

/**
 * Buckets `values` into `count` bars (the mean of each bucket), scaled so
 * the loudest bar is 1. An empty input gives `count` zeros.
 */
export function toBars(values: readonly number[], count: number = WAVE_BARS): number[] {
  const out = new Array<number>(count).fill(0);
  if (values.length === 0 || count <= 0) return out;
  for (let b = 0; b < count; b++) {
    const from = Math.floor((b * values.length) / count);
    const to = Math.max(from + 1, Math.floor(((b + 1) * values.length) / count));
    let sum = 0;
    for (let k = from; k < Math.min(to, values.length); k++) sum += values[k];
    out[b] = sum / Math.max(1, Math.min(to, values.length) - from);
  }
  const peak = Math.max(...out);
  return peak > 0 ? out.map((v) => v / peak) : out;
}

/** Bar height for a 0..1 value between `min` and `max` units. */
export const barHeight = (v: number, min: number, max: number) =>
  min + Math.max(0, Math.min(1, v)) * (max - min);

/** x of bar `i` for a bar `width` wide, centred in its slot. */
export const barX = (i: number, width: number) => i * BAR_PITCH + (BAR_PITCH - width) / 2;

/** The target word's span as fractions of the clip (0..1), or null. */
export function targetSpan(
  timings: SpeakingTimings | null | undefined,
  targetIndex: number,
): { start: number; end: number } | null {
  const word = timings?.words[targetIndex];
  if (!timings || !word || timings.duration <= 0) return null;
  return {
    start: Math.max(0, word.start / timings.duration),
    end: Math.min(1, word.end / timings.duration),
  };
}
