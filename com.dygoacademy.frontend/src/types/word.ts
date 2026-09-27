import type { LexiconExampleSentence, LexiconRelatedWord } from './srs';

/**
 * `word_status` enum, database/schema/01_extensions_types.sql.
 * FAILED exists for exhausted BullMQ retries — not in the ERD, added so a
 * permanently-failed word is distinguishable from one still enriching
 * (see the migration's own comment). The frontend's status polling
 * (Phase 1, Module 2) must handle all three, not just ENRICHING/READY.
 */
export type WordStatus = 'ENRICHING' | 'READY' | 'FAILED';

/** `cefr_level` enum, database/schema/01_extensions_types.sql. */
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** `public.topic_words`, database/schema/02_tables.sql. */
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

/**
 * `GET /api/v1/words/guest-lookup` response -- mirrors
 * WordsService.GuestWordCard field-for-field. Leaner than WordCard: no
 * topic_word_id/topic_id, since a guest lookup has no signed-in user or
 * topic to attach to, just whatever master_lexicon already has cached.
 */
export interface GuestWordCard {
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
