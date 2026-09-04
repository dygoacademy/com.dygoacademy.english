import type { LexiconExampleSentence, LexiconRelatedWord } from './srs';

/**
 * `word_status` enum, database/migrations/001_initial_schema.sql line 31.
 * FAILED exists for exhausted BullMQ retries — not in the ERD, added so a
 * permanently-failed word is distinguishable from one still enriching
 * (see the migration's own comment). The frontend's status polling
 * (Phase 1, Module 2) must handle all three, not just ENRICHING/READY.
 */
export type WordStatus = 'ENRICHING' | 'READY' | 'FAILED';

/** `cefr_level` enum, database/migrations/001_initial_schema.sql line 33. */
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** `public.topic_words`, database/migrations/001_initial_schema.sql line 209. */
export interface TopicWord {
  id: string;
  topic_id: string;
  lexicon_id: string | null;
  source_word: string;
  language_code: string;
  status: WordStatus;
  custom_note: string | null;
  added_by: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * `GET /api/v1/words/:id` response — mirrors WordsService.WordCard
 * field-for-field. Same shape as DueCard (srs.ts) minus the SRS
 * scheduling fields, since this is a due-status-independent "show me this
 * one word's card" fetch, not a study-session card.
 */
export interface WordCard {
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
}
