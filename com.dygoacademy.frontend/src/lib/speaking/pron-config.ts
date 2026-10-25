/**
 * Pronunciation v2 numbers (Dylan's plan of 2026-10-25, section 2), in one
 * place. The backend's twin is
 * com.dygoacademy.backend/src/modules/speaking/pron-config.ts: change both together.
 */
export const PRON = {
  /** Auto-stop: this long after the voice ends… */
  silenceMs: 1000,
  /** …or at this length, or on a tap. No countdown: a beep and the mic is on. */
  maxMs: 4000,
  /** Less voice than this: P2b "We couldn't hear you", nothing is sent. */
  minVoiceMs: 300,
  /** A syllable scoring under this is wobbly (the only wobbly rule; the old 70 and "a phone under 45" were dropped). */
  wobblyBelow: 60,
  /**
   * The honeycomb's pass line (2026-10-25): a syllable passes at this or
   * more, and the word passes only when every syllable does (the server
   * pollinates by the same rule). Visual only (D-3): never the stage or
   * review dates.
   */
  passAtLeast: 80,
  /** Syllables from the pass line up to this many points over it are "close" (80–84: passes, with a polish hint). */
  closeBand: 5,
  /** passAtLeast + closeBand: a syllable at this or more is a clean pass. */
  cleanAtLeast: 85,
  /** Whisper heard another word: it passes only at this or more with no wobbly syllable, never when shorter (server). */
  otherWordTrust: 90,
  /** "Slowly" falls back to playing the word clip at this rate when the word has no slow clip. */
  slowRate: 0.7,
} as const;

/** How a scored syllable looks on its stone (P4 v2). */
export type StoneState = 'clean' | 'close' | 'wobbly';

/** The P4 outcome. */
export type PronOutcome = 'pass' | 'almost' | 'retry';

/** A honeycomb cell's verdict on P4: under the pass line, just over it, or clean. */
export type SyllableStatus = 'pass' | 'close' | 'fail';

/** The P4 result kind (honeycomb plan §4). */
export type ResultKind = 'pass' | 'almostPerfect' | 'retry';
