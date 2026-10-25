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
  /**
   * The honeycomb's pass line (2026-10-25): a syllable passes at this or
   * more, and the word passes only when every syllable does (the server
   * pollinates by the same rule). Visual only (D-3): never the stage or
   * review dates.
   */
  passAtLeast: 80,
  /** Syllables from the pass line up to this many points over it are "close" (80–84: passes, with a polish hint). */
  closeBand: 5,
  /** Whisper heard another word: it passes only at this or more with no wobbly syllable, never when shorter (server). */
  otherWordTrust: 90,
  /** "Slowly": the word clip at this rate, from a copy slowed in the browser (pitch kept; honeycomb plan §2.3). */
  slowRate: 0.75,
} as const;

/** A honeycomb cell's verdict on P4: under the pass line, just over it, or clean. */
export type SyllableStatus = 'pass' | 'close' | 'fail';

/** The P4 result kind (honeycomb plan §4). */
export type ResultKind = 'pass' | 'almostPerfect' | 'retry';
