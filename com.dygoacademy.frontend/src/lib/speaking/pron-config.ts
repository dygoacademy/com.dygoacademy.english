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
  /** A pass: overall at least this. Visual only (D-3): never the stage or review dates. */
  passAtLeast: 80,
  /** A pass with any syllable under this is "almost perfect" (that syllable shows as close). */
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
