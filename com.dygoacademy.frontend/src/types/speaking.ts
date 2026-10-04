/**
 * Phase 13 (Adult Speaking). Mirrors the backend's
 * `modules/speaking/speaking.types.ts` and `speaking-timings.ts`
 * field-for-field (snake_case, master rule 3).
 */
export const SPEAKING_ACCENTS = ['UK', 'US'] as const;
export type SpeakingAccent = (typeof SPEAKING_ACCENTS)[number];

export const SPEAKING_STAGES = ['seed', 'sprout', 'bloom', 'fruit'] as const;
export type SpeakingStage = (typeof SPEAKING_STAGES)[number];

export const SPEAKING_MARK_REASONS = ['stress_soft', 'missing', 'rushed', 'slow'] as const;
export type SpeakingMarkReason = (typeof SPEAKING_MARK_REASONS)[number];

export interface SyllableTiming {
  start: number;
  end: number;
  stressed: boolean;
}

/** Seconds from the start of the native clip. */
export interface WordTiming {
  text: string;
  start: number;
  end: number;
  /** Filled for the target word only. */
  syllables: SyllableTiming[];
}

export interface SpeakingTimings {
  duration: number;
  words: WordTiming[];
}

/** One sentence in `GET /api/v1/speaking/topics/:topicId/session`. */
export interface SpeakingSessionItem {
  id: string;
  lexicon_id: string;
  word: string;
  part_of_speech: string | null;
  cefr_level: string | null;
  ipa_uk: string | null;
  ipa_us: string | null;
  definition_en: string | null;
  meaning_locale: 'vi-VN' | 'zh-CN' | null;
  meaning_translation: string | null;
  sentence: string;
  /** Index into the whitespace-split sentence (and `timings_*.words`). */
  target_index: number;
  audio_uk_url: string | null;
  audio_us_url: string | null;
  timings_uk: SpeakingTimings | null;
  timings_us: SpeakingTimings | null;
  is_due: boolean;
}

export interface SpeakingSession {
  topic_id: string;
  topic_title: string;
  /** All speaking items in the bed; the Speak button shows at >= 5. */
  item_count: number;
  default_accent: SpeakingAccent;
  items: SpeakingSessionItem[];
}

export interface SpeakingWordMark {
  index: number;
  ok: boolean;
  reason: SpeakingMarkReason | null;
}

/** Body of `POST /api/v1/speaking/attempts`. No audio is ever sent (D2). */
export interface CreateSpeakingAttemptRequest {
  item_id: string;
  accent: SpeakingAccent;
  score: number;
  stage: SpeakingStage;
  word_marks: SpeakingWordMark[];
  user_duration_ms: number;
}

/** `POST /api/v1/speaking/attempts` response. */
export interface SpeakingAttempt extends CreateSpeakingAttemptRequest {
  id: string;
  created_at: string;
}
