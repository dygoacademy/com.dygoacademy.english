/**
 * `srs_rating` enum, database/schema/01_extensions_types.sql —
 * also the canonical enum example in the tech spec §3.2. Drives the
 * mistake-weighted retention formula (Phase 2, Module 3); the study
 * session UI (Phase 0 wireframe implementation) collects one of these
 * four per card even where the student only sees two buttons — see
 * components/flashcard/RatingButtons.tsx.
 */
export type SrsRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
/**
 * UI-4 — Interval preview for rating buttons. Shows what date each rating would
 * schedule on the Watering Page (A2 · Review).
 */
export type RatingInterval =
  | { unit: 'lessThanMinute' }
  | { unit: 'minutes' | 'hours' | 'days' | 'months'; count: number };


/** FR-4.3's three study modes — StartSessionDto on the backend. */
export type SessionMode = 'STANDARD' | 'REVERSE' | 'LISTENING';

/** Shape documented in tech spec §4.2, `master_lexicon.synonyms`/`antonyms`. */
export interface LexiconRelatedWord {
  word: string;
  level: string;
}

/** Shape documented in tech spec §4.2, `master_lexicon.example_sentences`. */
export interface LexiconExampleSentence {
  sentence: string;
  level: string;
  translation_hint?: string;
}

/**
 * `GET /api/v1/srs/due` and `GET /api/v1/topics/:id/cards/due` — mirrors
 * `SrsService.DueCard` (com.dygoacademy.backend/src/modules/srs/srs.service.ts)
 * field-for-field, same "no camelCase" rule as topic.ts's TopicSummary.
 */
export interface DueCard {
  topic_word_id: string;
  topic_id: string;
  source_word: string;
  part_of_speech: string | null;
  ipa_us: string | null;
  ipa_uk: string | null;
  definition_en: string | null;
  audio_url: string | null;
  synonyms: LexiconRelatedWord[];
  antonyms: LexiconRelatedWord[];
  example_sentences: LexiconExampleSentence[];
  /**
   * The review card's meaning-language line (design system §14.8),
   * translated from `definition_en` (and `meaning_example_translation`
   * from the first example sentence) by the enrichment pipeline into
   * whichever locale `profiles.meaning_locale` is set to. Both null when
   * meaning_locale is unset (English only) or this word hasn't been
   * translated into it yet.
   */
  meaning_locale: 'vi-VN' | 'zh-CN' | null;
  meaning_translation: string | null;
  meaning_example_translation: string | null;
  /** No user_word_srs row yet — never reviewed before. */
  is_new: boolean;
  /** Phase 10 — FSRS memory state (backend `fsrs-scheduler.ts`). */
  state: FsrsState;
  /** Days until recall probability falls to 90%. Null for a new card. */
  stability: number | null;
  /** 1 (easiest) – 10 (hardest). Null for a new card. */
  difficulty: number | null;
  reps: number;
  lapses: number;
  scheduled_days: number;
  last_reviewed_at: string | null;
  /** Recall probability right now, 0–1. Null for a new card. */
  retrievability: number | null;
  is_mastered: boolean;
  is_leech: boolean;
  next_due_at: string | null;
  /**
   * UI-4 — Next-due interval per rating. Shows "< 1 min", "5 days", etc.
   * under each rating button on the Watering Page (A2 · Review).
   * Computed by ts-fsrs's repeat() for each grade (Again/Hard/Good/Easy);
   * null when intervals cannot be computed.
   */
  interval_preview: Record<SrsRating, RatingInterval> | null;
}

export type FsrsState = 'New' | 'Learning' | 'Review' | 'Relearning';

/** `POST /api/v1/srs/sessions` response — SrsService.SessionResult. */
export interface SrsSession {
  mode: SessionMode;
  cards: DueCard[];
}

/** `POST /api/v1/srs/rate` response — SrsService.RateWordResult. */
export interface RateWordResult {
  topic_word_id: string;
  /** The rating actually applied (a flashcard EASY on a never-seen word counts as GOOD). */
  rating: SrsRating;
  /**
   * Phase 10 — false when the review was logged but didn't move the
   * schedule (a success on a word that wasn't due, or a repeat mistake the
   * same day).
   */
  graded: boolean;
  state: FsrsState;
  stability: number | null;
  difficulty: number | null;
  reps: number;
  lapses: number;
  scheduled_days: number;
  is_leech: boolean;
  is_mastered: boolean;
  was_correct: boolean;
  next_due_at: string;
  /**
   * Phase 9, "Session Mastery Count" — true exactly when *this* rating
   * crossed the mastery threshold, not merely whether the word is
   * currently mastered. See `SrsService.RateWordResult`'s own doc comment
   * (backend) for the full reasoning.
   */
  just_mastered: boolean;
}

/** `GET /api/v1/srs/stats` response — SrsService.SrsStats. */
export interface SrsStats {
  total_words: number;
  mastered_words: number;
  due_now: number;
  leech_count: number;
  current_streak_days: number;
  /**
   * `public.profiles.display_name` for the caller, added 2026-09-21 for
   * Home's greeting personalization — null for the common case (real
   * registrations never collect one; only hand-seeded fixture accounts
   * like Sarah's have one).
   */
  display_name: string | null;
}

/**
 * `GET /api/v1/srs/tier-progress` response — SrsService.TierProgress
 * (Phase 9, "Vocabulary Mastery Tier Ladder"). camelCase, not snake_case
 * like `SrsStats`/`LeechCard` above — this isn't a raw SQL row passthrough
 * (this file's own header comment on why those two ARE snake_case doesn't
 * apply here), it's hand-constructed by `SrsService.getTierProgress()`,
 * same precedent as `SyncItemResult`'s `topicWordId` below.
 */
export interface TierProgress {
  tier: number;
  tierName: string;
  masteredInTier: number;
  wordsInTier: number;
  nextTierName: string | null;
  wordsToNextTier: number | null;
}

/** `GET /api/v1/srs/activity` row shape — SrsService.DailyActivity (Phase 3 Module 18, FR-18.1). */
export interface DailyActivity {
  review_date: string;
  review_count: number;
}

/**
 * `GET /api/v1/srs/activity/upcoming` row shape — SrsService.UpcomingActivity
 * (Phase 9, "Upcoming Path"). `due_count` is a projection, not a
 * commitment — see the backend's own doc comment on `getUpcomingActivity`.
 */
export interface UpcomingActivity {
  due_date: string;
  due_count: number;
}

/** `GET /api/v1/srs/leeches` row shape — SrsService.LeechCard. */
export interface LeechCard {
  topic_word_id: string;
  topic_id: string;
  source_word: string;
  recent_mistakes: number;
  total_mistakes: number;
  next_due_at: string;
}

/**
 * One offline-queued review, as sent to `POST /api/v1/srs/sync` — mirrors
 * the backend's `SyncReviewItemDto` field-for-field. camelCase, unlike this
 * file's `select`-shaped response types (`DueCard`, `RateWordResult`, etc.):
 * this is a request body the client constructs, not a row echoed back from
 * Postgres, so the "no camelCase" rule those types follow doesn't apply.
 */
export interface SyncReviewItem {
  topicWordId: string;
  rating: SrsRating;
  reviewedAt: string;
  responseMs?: number;
}

/**
 * `POST /api/v1/srs/sync` per-item result — SrsService.SyncItemResult.
 * Discriminated on `status` so a caller can tell a genuinely-applied
 * rating from one the server rejected (e.g. the word was deleted since it
 * was queued offline) without a runtime type check on `result`/`error`.
 */
export type SyncItemResult =
  | { topicWordId: string; status: 'applied'; result: RateWordResult }
  | { topicWordId: string; status: 'error'; error: string };

/**
 * `GET /api/v1/groups/:id/heatmap` row shape — Module 8, FR-8.2. Mirrors
 * `HeatmapEntry` (com.dygoacademy.backend/src/modules/analytics/heatmap-aggregator.ts)
 * field-for-field. `failure_rate` is a fraction (0–1), not a percentage —
 * format with `Math.round(failure_rate * 100)` at the render site.
 */
export interface GroupHeatmapEntry {
  topic_word_id: string;
  source_word: string;
  topic_id: string;
  topic_title: string;
  attempts: number;
  failures: number;
  failure_rate: number;
}
