import { PRON_SYLLABLE_S } from '@/lib/speaking/pronounce';
import type { StoredSyllable } from '@/types';

/**
 * P2's live honeycomb (plan §3 P2): which cells the learner's voice has
 * reached. A progress cue, never a score.
 */

/** A cell's slot in the native word, in ms from the word's start. */
export interface SyllableSlot {
  startMs: number;
  endMs: number;
}

/**
 * The native word cut into one slot per syllable: by the stored syllable
 * spans when every one has a span, else equal slots over `nativeMs` (else
 * PRON_SYLLABLE_S a syllable).
 */
export function syllableSlots(
  syllables: readonly Pick<StoredSyllable, 'start_ms' | 'end_ms'>[],
  nativeMs?: number | null,
): SyllableSlot[] {
  const n = syllables.length;
  if (n === 0) return [];
  const timed = syllables.every((s) => s.start_ms != null && s.end_ms != null && s.end_ms > s.start_ms);
  if (timed) {
    const t0 = syllables[0].start_ms as number;
    return syllables.map((s) => ({ startMs: (s.start_ms as number) - t0, endMs: (s.end_ms as number) - t0 }));
  }
  const total = nativeMs && nativeMs > 0 ? nativeMs : PRON_SYLLABLE_S * 1000 * n;
  const per = total / n;
  return syllables.map((_, k) => ({ startMs: k * per, endMs: (k + 1) * per }));
}

/**
 * How many cells the voice has reached: none before any voice; then every
 * cell whose slot starts at or before `voicedMs` (the first one as soon as
 * the voice starts).
 */
export function cellsReached(voicedMs: number, slots: readonly SyllableSlot[]): number {
  if (voicedMs <= 0 || slots.length === 0) return 0;
  return Math.max(1, slots.filter((s) => s.startMs <= voicedMs).length);
}
