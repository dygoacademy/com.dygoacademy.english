import { PRON, type PronOutcome, type StoneState } from './pron-config';

/**
 * P4 v2 (PronStonesResult, 2026-10-25): what a word check shows, from the
 * overall score and one score per stone. Pure, so it's unit-tested; the
 * defaults the plan left open are marked "default".
 */

export interface PronStoneView {
  /** Each stone's look: clean (green), close (pale, amber dashes) or wobbly (clay, tilted). */
  states: StoneState[];
  outcome: PronOutcome;
  /** The stone selected when P4 opens (amber ring, "Native → you"); -1 for a clean pass. */
  selected: number;
  /** Clean stones, for "Almost · {clean} of {n} stones". */
  clean: number;
}

/**
 * - pass: overall ≥ PRON.passAtLeast. "Almost perfect" when any syllable is
 *   under PRON.cleanAtLeast: those stones are close (default: a syllable
 *   under 60 in a pass shows as close too, never wobbly).
 * - retry: syllables under PRON.wobblyBelow are wobbly; when none is (default)
 *   the lowest is. The rest are clean, as on the board.
 * - selected: the lowest close or wobbly stone (default with 2+ wobbly stones:
 *   the lowest is selected; the badge counts the real clean stones).
 */
export function stoneView(overall: number, scores: readonly number[]): PronStoneView {
  const n = scores.length;
  const lowest = scores.reduce((m, s, k) => (s < scores[m] ? k : m), 0);
  if (n === 0) return { states: [], outcome: overall >= PRON.passAtLeast ? 'pass' : 'retry', selected: -1, clean: 0 };
  if (overall >= PRON.passAtLeast) {
    const states: StoneState[] = scores.map((s) => (s < PRON.cleanAtLeast ? 'close' : 'clean'));
    const almost = states.includes('close');
    return {
      states,
      outcome: almost ? 'almost' : 'pass',
      selected: almost ? lowest : -1,
      clean: states.filter((s) => s === 'clean').length,
    };
  }
  let states: StoneState[] = scores.map((s) => (s < PRON.wobblyBelow ? 'wobbly' : 'clean'));
  if (!states.includes('wobbly')) states = scores.map((_, k) => (k === lowest ? 'wobbly' : 'clean'));
  return { states, outcome: 'retry', selected: lowest, clean: states.filter((s) => s === 'clean').length };
}

/** What a P4 button does. */
export type P4Action = 'nextBee' | 'backToBed' | 'tryAgain' | 'sayAgain' | 'polish' | 'skip';

/**
 * The P4 button table (board `mainLabel` / `secLabel`): the big clay button
 * and the link under it, for an outcome on a middle bee or the last one.
 *
 * | outcome | next bee              | last bee                  |
 * | pass    | Next bee · Say it again | Back to the bed · Say it again |
 * | almost  | Next bee · Polish {syl}  | Back to the bed · Polish {syl}  |
 * | retry   | Try again · Skip to next bee | Try again · Back to the bed |
 */
export function p4Buttons(outcome: PronOutcome, last: boolean): { main: P4Action; link: P4Action } {
  if (outcome === 'retry') return { main: 'tryAgain', link: last ? 'backToBed' : 'skip' };
  return { main: last ? 'backToBed' : 'nextBee', link: outcome === 'almost' ? 'polish' : 'sayAgain' };
}

/** Why a take stops by itself: PRON.silenceMs after the voice, at PRON.maxMs, or not yet. */
export function autoStop(elapsedMs: number, heard: boolean, quietMs: number): 'silence' | 'max' | null {
  if (elapsedMs >= PRON.maxMs) return 'max';
  if (heard && quietMs >= PRON.silenceMs) return 'silence';
  return null;
}

/** A finished take with less voice than PRON.minVoiceMs is P2b "quiet" (nothing is sent). */
export function tooQuiet(voicedMs: number): boolean {
  return voicedMs < PRON.minVoiceMs;
}
