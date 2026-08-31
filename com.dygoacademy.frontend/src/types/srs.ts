/**
 * `srs_rating` enum, database/migrations/001_initial_schema.sql line 35 —
 * also the canonical enum example in the tech spec §3.2. Drives the
 * mistake-weighted retention formula (Phase 2, Module 3); the study
 * session UI (Phase 0 wireframe implementation) collects one of these
 * four per card even where the student only sees two buttons — see
 * components/flashcard/RatingButtons.tsx.
 */
export type SrsRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

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
  /** No user_word_srs row yet — never reviewed before. */
  is_new: boolean;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  is_leech: boolean;
  next_due_at: string | null;
}

/** `POST /api/v1/srs/sessions` response — SrsService.SessionResult. */
export interface SrsSession {
  mode: SessionMode;
  cards: DueCard[];
}

/** `POST /api/v1/srs/rate` response — SrsService.RateWordResult. */
export interface RateWordResult {
  topic_word_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  is_leech: boolean;
  was_correct: boolean;
  next_due_at: string;
}

/** `GET /api/v1/srs/stats` response — SrsService.SrsStats. */
export interface SrsStats {
  total_words: number;
  mastered_words: number;
  due_now: number;
  leech_count: number;
  current_streak_days: number;
}
