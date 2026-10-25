'use client';

import { useMyProfile } from '@/hooks/useProfile';
import type { SpeakingAccent } from '@/types/speaking';

/**
 * Which accent a word is shown and said in: the profile's english_variety
 * (Me → English, saved as `en-GB` / `en-US`), en-GB → UK, anything else →
 * US. The server's speaking.service.ts `defaultAccent` makes the same call.
 */
export function accentOf(englishVariety: string | null | undefined): SpeakingAccent {
  return englishVariety === 'en-GB' ? 'UK' : 'US';
}

/** The signed-in learner's accent; US until the profile has loaded. */
export function useAccent(): SpeakingAccent {
  return accentOf(useMyProfile().data?.english_variety);
}

/** A word's IPA and clips as the API sends them (master_lexicon columns). */
export interface AccentWord {
  ipa_us?: string | null;
  ipa_uk?: string | null;
  /** The US clip. */
  audio_url_us?: string | null;
  /** The UK clip (20261025_word_audio_uk.sql); null until it is made. */
  audio_url_uk?: string | null;
}

/** The accent's IPA and clip, each falling back to the other accent's. */
export function forAccent(
  word: AccentWord,
  accent: SpeakingAccent,
): { ipa: string | null; audioSrc: string | null } {
  const uk = accent === 'UK';
  return {
    ipa: (uk ? (word.ipa_uk ?? word.ipa_us) : (word.ipa_us ?? word.ipa_uk)) ?? null,
    audioSrc:
      (uk ? (word.audio_url_uk ?? word.audio_url_us) : (word.audio_url_us ?? word.audio_url_uk)) ?? null,
  };
}
