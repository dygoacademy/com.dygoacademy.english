import type { SpeakingAccent, SpeakingTimings } from './speaking-timings';

export type { SpeakingAccent, SpeakingTimings } from './speaking-timings';

/** Phase 13 value lists; mirror the check constraints in 20261004_speaking.sql. */
export const SPEAKING_ACCENTS = ['UK', 'US'] as const;
export const SPEAKING_STAGES = ['seed', 'sprout', 'bloom', 'fruit'] as const;
export const SPEAKING_MARK_REASONS = ['stress_soft', 'missing', 'rushed', 'slow'] as const;
export type SpeakingStage = (typeof SPEAKING_STAGES)[number];
export type SpeakingMarkReason = (typeof SPEAKING_MARK_REASONS)[number];

/** Sentences in one speaking session (handover §1). */
export const SPEAKING_SESSION_SIZE = 5;

/** One sentence in `GET /speaking/session` and `GET /speaking/words/:topicWordId`. */
export interface SpeakingSessionItem {
  id: string;
  lexicon_id: string;
  /** The learner's topic_words row for this word (one of them, if the word is in several beds). */
  topic_word_id: string;
  word: string;
  part_of_speech: string | null;
  cefr_level: string | null;
  ipa_uk: string | null;
  ipa_us: string | null;
  definition_en: string | null;
  /** The word's meaning in the learner's meaning language (word_translations); null if unset. */
  meaning_locale: 'vi-VN' | 'zh-CN' | null;
  meaning_translation: string | null;
  sentence: string;
  target_index: number;
  /** Public URLs built from the stored R2 keys; null when that accent isn't generated. */
  audio_uk_url: string | null;
  audio_us_url: string | null;
  timings_uk: SpeakingTimings | null;
  timings_us: SpeakingTimings | null;
  /** Due now or never reviewed; these lead the session. */
  is_due: boolean;
}

/** The Pond (Sound Garden on the Missions tab). */
export interface SpeakingSession {
  /** How many of the learner's words have a speaking item. */
  item_count: number;
  /** From profiles.english_variety: en-GB → UK, otherwise US. */
  default_accent: SpeakingAccent;
  items: SpeakingSessionItem[];
}

/** "Say this one?" on a flashcard. */
export interface SpeakingWordItem {
  default_accent: SpeakingAccent;
  item: SpeakingSessionItem;
}

/** `POST /speaking/attempts` response. */
export interface SpeakingAttempt {
  id: string;
  item_id: string;
  accent: SpeakingAccent;
  score: number;
  stage: SpeakingStage;
  word_marks: { index: number; ok: boolean; reason: SpeakingMarkReason | null }[];
  user_duration_ms: number;
  created_at: string;
}
