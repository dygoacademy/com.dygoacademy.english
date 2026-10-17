import type { WordStatus } from './word';

/**
 * Matches TopicsService.TopicSummary in
 * com.dygoacademy.backend/src/modules/topics/topics.service.ts exactly —
 * this is the one shape with a live endpoint (GET /api/v1/topics) as of
 * Phase 0, so it's verified against the running response, not just the
 * schema. `word_count` comes back as a string: Postgres's `count()`
 * returns bigint, and node-pg serializes bigint as string to avoid silent
 * precision loss past 2^53. The API does not camelCase its output —
 * every field name here is the literal SQL column alias.
 */
export interface TopicSummary {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  word_count: string;
  /**
   * Count of this topic's words at `mastered_at is not null` (Phase 10 sticky FSRS mastery; was `repetitions >= 4`) for the caller
   * (Phase 3 Module 19, FR-19.1) — same string-typed bigint reasoning as
   * `word_count` above.
   */
  mastered_count: string;
  /**
   * Count of this topic's words currently flagged `is_leech` for the
   * caller (Phase 9, "Topics as Collections" subtext — "N words · M
   * focus words"), added 2026-09-21 — same string-typed bigint reasoning
   * as `word_count` above.
   */
  focus_word_count: string;
  /** The learner's own My words bed (where words from beds they can't edit go). Optional until the backend sends it. */
  is_my_words?: boolean;
  created_at: string;
}

/** `public.topics`, database/schema/02_tables.sql. */
export interface Topic {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * `POST`/`PATCH /api/v1/topics(/:id)` response shape — matches
 * TopicsService.TopicRow exactly. Narrower than `Topic` above: no
 * `updated_at`, since neither endpoint's SELECT/RETURNING list includes
 * it — same "don't claim a field the response doesn't have" rule
 * `TopicWordSummary` documents below.
 */
export interface TopicRow {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

/**
 * The word shape `GET /api/v1/topics/:id` actually nests under `words` —
 * matches TopicsService.TopicWordRow's SELECT list exactly (topics.service.ts
 * `findById`), which is deliberately narrower than the full `TopicWord`
 * (word.ts): no `topic_id`/`lexicon_id`/`added_by`/`updated_at`, since the
 * endpoint never selects those columns. Using the full `TopicWord` type here
 * would compile but lie about what the response actually contains.
 */
export interface TopicWordSummary {
  id: string;
  source_word: string;
  language_code: string;
  status: WordStatus;
  custom_note: string | null;
  failure_reason: string | null;
  created_at: string;
}

/** `GET /api/v1/topics/:id` response — TopicsService.TopicDetail. */
export interface TopicDetail extends Topic {
  words: TopicWordSummary[];
}

/**
 * One `GET /api/v1/topics/word-search?q=` result (A6b "Looking for a
 * word?", 2026-10-17) — TopicsService.WordSearchHit. `matched` says
 * whether the English word matched or only its meaning.
 */
export interface WordSearchHit {
  word: string;
  topic_id: string;
  topic_title: string;
  matched: 'word' | 'meaning';
}
