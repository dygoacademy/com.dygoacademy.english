import type { PronBlockedReason } from './pron-config';
import type { StoredSyllable } from './pron-syllables';
import type { SpeakingSyllable } from './speaking-syllables';
import type { SpeakingAccent, SpeakingTimings } from './speaking-timings';

export type { SpeakingSyllable } from './speaking-syllables';
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
  /** The word said on its own (master_lexicon.audio_url_us), for Pronunciation's "Hear it"; null if none. */
  word_audio_url_us: string | null;
  /** The same in British English (master_lexicon.audio_url_uk); null until made, then play word_audio_url_us. */
  word_audio_url_uk: string | null;
  /**
   * The stones (MI · ti · gate), stored per accent (master_lexicon.syllables_us / _uk): the
   * profile accent's, else the other accent's; [] when the word has none (not offered in
   * Pronunciation). `start_ms` / `end_ms` are inside `syllables_clip_url`.
   */
  syllables: StoredSyllable[];
  /** The word clip the syllable spans belong to (that accent's word_audio_url); null without one. */
  syllables_clip_url: string | null;
}

/** The Pond (Sound Garden on the Missions tab). */
export interface SpeakingSession {
  /** How many of the learner's words have a speaking item. */
  item_count: number;
  /** From profiles.english_variety: en-GB → UK, otherwise US. */
  default_accent: SpeakingAccent;
  items: SpeakingSessionItem[];
}

/** "Say this one?" on a flashcard, and one Pronunciation word. */
export interface SpeakingWordItem {
  default_accent: SpeakingAccent;
  item: SpeakingSessionItem;
  /** Set when the word isn't offered in Pronunciation (pronunciation v2): `no_syllables`. Null otherwise. */
  blocked: PronBlockedReason | null;
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

/** A word said at this score or more is Pollinated (D-3, changed 2026-10-11: one 80 % rule, visual only). */
export const POLLINATE_MIN_SCORE = 80;

/** `GET /speaking/harvest?topic_id=`: a bed's words with a speaking item, and which are harvested. */
export interface SpeakingHarvestWord {
  topic_word_id: string;
  item_id: string;
  /** Score it was harvested with; null = not harvested. */
  harvested_score: number | null;
  harvested_at: string | null;
  /** Both IPAs for the "Bees are waiting" row; the app shows the profile accent's (2026-10-25). */
  ipa_uk: string | null;
  ipa_us: string | null;
  /** The word's stored syllables for the bee row (MI · ti · gate), profile accent's (else the other's). Never empty: words without are left out. */
  syllables: StoredSyllable[];
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

/** One word's mark from `POST /speaking/check-speech` (handover v2 §3). */
export interface SpeakingCheckMark {
  index: number;
  ok: boolean;
  /** `missing`: not said; `unclear`: said unclearly, or `heard` as another word. */
  reason: 'missing' | 'unclear' | null;
  /** The word the scorer heard instead (`unclear` only), e.g. "migrate" for "mitigate". */
  heard?: string;
}

/**
 * `POST /speaking/check-speech`: the speech scorer's verdict on one recording
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

/** `POST /speaking/check-speech` (202): the check is queued; poll `GET /speaking/check/:id`. */
export interface SpeakingCheckQueued {
  check_id: string;
  status: 'queued';
  /** Checks ahead of this one (waiting + running). */
  position: number;
  /** Rough wait in seconds. */
  eta_s: number;
}

/** One syllable in a word check: one stored stone and how it went. */
export interface SpeakingWordCheckSyllable {
  /** The syllable's IPA ("tɪ"), else the stone's text. */
  ipa: string;
  /** The stone's text (MI, ti, gate). */
  text: string;
  score: number;
  /** Under 60 (PRON.wobblyBelow): the stone wobbles on P4. */
  wobbly: boolean;
  /** What the syllable sounded like ("taɪ"), when the scorer is sure; else null. */
  heard_ipa: string | null;
  /** Where the syllable is in the learner's take (ms), for "You" on its chip; null when unknown. */
  start_ms: number | null;
  end_ms: number | null;
}

/**
 * `POST /speaking/check-pronunciation` (Pronunciation P3 → P4): one word, a score
 * per syllable. `passed` = said clearly at POLLINATE_MIN_SCORE or more,
 * which pollinates the word (once per word; never touches SRS).
 */
export interface SpeakingWordCheckResult {
  kind: 'word';
  status: 'ok' | 'not_heard' | 'other_word';
  passed: boolean;
  /** True when this check pollinated the word (it wasn't before). */
  pollinated: boolean;
  total: number;
  heard_text: string;
  /** One per stored stone, in order (pronunciation v2: always as many as the word's syllables). */
  syllables: SpeakingWordCheckSyllable[];
  /** The stones (MI · ti · gate): the word's stored syllables for the accent. */
  spelling: SpeakingSyllable[];
  user_duration_ms: number;
  check_ms: number;
}

/** `GET /speaking/check/:id`: the check's state, with the result once done. */
export interface SpeakingCheckState {
  check_id: string;
  status: SpeakingCheckStatus;
  result?: SpeakingCheckResult | SpeakingWordCheckResult;
  /** When failed: `bad_audio`, `timeout`, `unavailable` or `expired`. */
  reason?: string;
}

/** Seconds a scorer takes per check under load (measured 2026-10-06: 2 scorers × 2 threads on the M2), for `eta_s` and the busy check. */
export const SPEECH_CHECK_AVG_SECONDS = 2.5;
