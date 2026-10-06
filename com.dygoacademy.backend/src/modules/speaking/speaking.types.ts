import type { SpeakingAccent, SpeakingTimings } from './speaking-timings';

export type { SpeakingAccent, SpeakingTimings } from './speaking-timings';

/** Phase 13 value lists; mirror the check constraints in 20261004_speaking.sql. */
export const SPEAKING_ACCENTS = ['UK', 'US'] as const;
export const SPEAKING_STAGES = ['seed', 'sprout', 'bloom', 'fruit'] as const;
/** `unclear` comes from the server check (S18); `rushed` / `slow` only from the on-device one. */
export const SPEAKING_MARK_REASONS = [
  'stress_soft',
  'missing',
  'rushed',
  'slow',
  'unclear',
] as const;
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
  /** SE5: true when this attempt harvested the word (asked, 90%+, not harvested before). */
  harvested: boolean;
}

/** SE5: harvest needs this score (D-3: Fruit at 90%+). */
export const HARVEST_MIN_SCORE = 90;

/** `GET /speaking/harvest?topic_id=`: a bed's words with a speaking item, and which are harvested. */
export interface SpeakingHarvestWord {
  topic_word_id: string;
  item_id: string;
  /** Score it was harvested with; null = not harvested. */
  harvested_score: number | null;
  harvested_at: string | null;
}

/**
 * `GET /speaking/words?topic_word_ids=…` ("Say this one?" offers, T9-a):
 * which of a review session's cards have a speaking item, and whether the
 * learner already spoke it today (their local day).
 */
export interface SpeakingWordLookup {
  topic_word_id: string;
  item_id: string;
  spoken_today: boolean;
}

/** At most this many ids per lookup (a review session has up to 20 cards). */
export const SPEAKING_LOOKUP_MAX = 50;

/** One word's mark from `POST /speaking/check` (handover v2 §3). */
export interface SpeakingCheckMark {
  index: number;
  ok: boolean;
  /** `missing`: not said; `unclear`: said unclearly, or `heard` as another word. */
  reason: 'missing' | 'unclear' | null;
  /** The word the scorer heard instead (`unclear` only), e.g. "migrate" for "mitigate". */
  heard?: string;
}

/**
 * `POST /speaking/check`: the speech scorer's verdict on one recording
 * (Phase 13 S17, G6). Not saved here; the recording is never stored.
 */
export interface SpeakingCheckResult {
  score: number;
  stage: SpeakingStage;
  /** One per word of the sentence (split on spaces), in order. */
  word_marks: SpeakingCheckMark[];
  /** Length of the recording. */
  user_duration_ms: number;
  /** How long the scorer took. */
  check_ms: number;
}

/** Checks per learner per rolling hour (S17), so one learner can't tie up the scorer. */
export const SPEAKING_CHECKS_PER_HOUR = 60;
/** Largest recording accepted (a 30 s AAC clip is ~250 KB). */
export const SPEAKING_CHECK_MAX_BYTES = 1_000_000;

/** Where a queued speech check is (queue v1, 2026-10-06). */
export type SpeakingCheckStatus = 'queued' | 'checking' | 'done' | 'failed';

/** `POST /speaking/check` (202): the check is queued; poll `GET /speaking/check/:id`. */
export interface SpeakingCheckQueued {
  check_id: string;
  status: 'queued';
  /** Checks ahead of this one (waiting + running). */
  position: number;
  /** Rough wait in seconds. */
  eta_s: number;
}

/** `GET /speaking/check/:id`: the check's state, with the result once done. */
export interface SpeakingCheckState {
  check_id: string;
  status: SpeakingCheckStatus;
  result?: SpeakingCheckResult;
  /** When failed: `bad_audio`, `timeout`, `unavailable` or `expired`. */
  reason?: string;
}

/** Seconds a scorer takes per check under load (measured 2026-10-06: 2 scorers × 2 threads on the M2), for `eta_s` and the busy check. */
export const SPEECH_CHECK_AVG_SECONDS = 2.5;
