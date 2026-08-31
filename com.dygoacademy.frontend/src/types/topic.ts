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
  created_at: string;
}

/** `public.topics`, database/migrations/001_initial_schema.sql line 196. */
export interface Topic {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}
