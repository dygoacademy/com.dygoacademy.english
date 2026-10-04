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

/** One sentence in `GET /speaking/topics/:topicId/session`. */
export interface SpeakingSessionItem {
  id: string;
  lexicon_id: string;
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
  /** Why it was picked first: due/new words lead the session. */
  is_due: boolean;
}

export interface SpeakingSession {
  topic_id: string;
  topic_title: string;
  /** Every speaking item in this bed (the Speak button shows at >= 5, D4). */
  item_count: number;
  /** From profiles.english_variety: en-GB → UK, otherwise US. */
  default_accent: SpeakingAccent;
  items: SpeakingSessionItem[];
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
