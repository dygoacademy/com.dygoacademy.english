import { PRON } from './pron-config';

/**
 * Pronunciation recording rules (P2), pure so they're unit-tested. The P4
 * result rules live in lib/pronunciation/pronunciationResult.ts.
 */

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
