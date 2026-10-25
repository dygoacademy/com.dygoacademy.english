/**
 * Pronunciation v2 numbers (Dylan's plan of 2026-10-25, section 2), in one
 * place. The app's twin is com.dygoacademy.frontend/src/lib/speaking/pron-config.ts:
 * change both together.
 */
export const PRON = {
  /** Auto-stop: this long after the voice ends… */
  silenceMs: 1000,
  /** …or at this length, or on a tap. No countdown before the beep. */
  maxMs: 4000,
  /** Less voice than this: P2b "We couldn't hear you", nothing scored. */
  minVoiceMs: 300,
  /**
   * A syllable scoring under this is wobbly. The only wobbly rule: the old
   * 70 line and "any phone under 45" were dropped (plan section 2).
   */
  wobblyBelow: 60,
  /** A pass: the word's overall score at least this (D-3: visual only, never the stage or review dates). */
  passAtLeast: 80,
  /** A pass with any syllable under this is "almost perfect" (that syllable shows as close). */
  cleanAtLeast: 85,
  /**
   * Whisper heard another word: it still passes only at this overall score
   * or more with no wobbly syllable, and never when the heard word is shorter
   * (c51f28a).
   */
  otherWordTrust: 90,
  /** The "Slowly" clip's Google TTS speakingRate. */
  slowSpeakingRate: 0.7,
} as const;

/** How a scored syllable looks on its stone. */
export type StoneState = 'clean' | 'close' | 'wobbly';

/** The P4 outcome. */
export type PronOutcome = 'pass' | 'almost' | 'retry';

/** Why a word isn't offered in Pronunciation. */
export type PronBlockedReason = 'no_syllables';
