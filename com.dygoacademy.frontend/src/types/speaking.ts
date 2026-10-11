/**
 * Phase 13 (Adult Speaking). Mirrors the backend's
 * `modules/speaking/speaking.types.ts` and `speaking-timings.ts`
 * field-for-field (snake_case, master rule 3).
 */
export const SPEAKING_ACCENTS = ['UK', 'US'] as const;
export type SpeakingAccent = (typeof SPEAKING_ACCENTS)[number];

export const SPEAKING_STAGES = ['seed', 'sprout', 'bloom', 'fruit'] as const;
export type SpeakingStage = (typeof SPEAKING_STAGES)[number];

/** `unclear` comes from the server check (S18); `rushed` / `slow` only from the on-device one. */
export const SPEAKING_MARK_REASONS = [
  'stress_soft',
  'missing',
  'rushed',
  'slow',
  'unclear',
] as const;
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

/** One sentence in `GET /api/v1/speaking/session` and `GET /api/v1/speaking/words/:topicWordId`. */
export interface SpeakingSessionItem {
  id: string;
  lexicon_id: string;
  /** The learner's topic_words row for this word (one of them, if it's in several beds). */
  topic_word_id: string;
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

/** The Pond (Sound Garden on the Missions tab): `GET /api/v1/speaking/session[?topic_id=]`. */
export interface SpeakingSession {
  /** How many of the learner's words have a speaking item. */
  item_count: number;
  default_accent: SpeakingAccent;
  items: SpeakingSessionItem[];
}

/** "Say this one?" on a flashcard: `GET /api/v1/speaking/words/:topicWordId`. */
export interface SpeakingWordItem {
  default_accent: SpeakingAccent;
  item: SpeakingSessionItem;
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
  /** SE5 "Ready to harvest": harvest the word at 90%+ (visual only, no SRS change). */
  harvest?: boolean;
  /** The device time zone, for the SPEAK mission's day (SE1). */
  tz?: string;
}

/** `POST /api/v1/speaking/attempts` response. */
export interface SpeakingAttempt extends Omit<CreateSpeakingAttemptRequest, 'harvest' | 'tz'> {
  id: string;
  created_at: string;
  /** SE5: this attempt harvested the word. */
  harvested: boolean;
}

/** `GET /api/v1/speaking/harvest?topic_id=` (SE5): a bed's speakable words and their harvests. */
export interface SpeakingHarvestWord {
  topic_word_id: string;
  item_id: string;
  /** Score it was harvested with; null = not harvested. */
  harvested_score: number | null;
  harvested_at: string | null;
  /** The word's UK IPA ("Bees are waiting" sound line, 2026-10-11); optional for older APIs. */
  ipa_uk?: string | null;
}

/** `GET /api/v1/groups/:id/echo` (SE6): the trickiest speakable word, totals only. */
export interface EchoChallenge {
  topic_word_id: string;
  word: string;
  ipa_uk: string | null;
  ipa_us: string | null;
  done_count: number;
  member_count: number;
}

/** `GET /api/v1/speaking/words?topic_word_ids=…`: which review cards can offer "Say this one?". */
export interface SpeakingWordLookup {
  topic_word_id: string;
  item_id: string;
  spoken_today: boolean;
}

/** One word's mark from `POST /api/v1/speaking/check` (S17). */
export interface SpeakingCheckMark {
  index: number;
  ok: boolean;
  reason: 'missing' | 'unclear' | null;
  /** The word the scorer heard instead (`unclear` only). */
  heard?: string;
}

/** `POST /api/v1/speaking/check`: the server's verdict on one recording. Never saved by itself. */
export interface SpeakingCheckResult {
  score: number;
  stage: SpeakingStage;
  word_marks: SpeakingCheckMark[];
  user_duration_ms: number;
  check_ms: number;
}

/** `POST /api/v1/speaking/check` (202, queue v1): the check is queued; poll its id. */
export interface SpeakingCheckQueued {
  check_id: string;
  status: 'queued';
  position: number;
  eta_s: number;
}

/** `GET /api/v1/speaking/check/:id`: where a queued check is, with the result once done. */
export interface SpeakingCheckState {
  check_id: string;
  status: 'queued' | 'checking' | 'done' | 'failed';
  result?: SpeakingCheckResult;
  reason?: string;
}
