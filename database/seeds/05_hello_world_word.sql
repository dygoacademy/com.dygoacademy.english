-- seeds/05_hello_world_word.sql — One hand-seeded word with real audio (needs 03_qa_tenant).
-- Formerly migrations/013_hello_world_test_word.sql; content unchanged except
-- where noted. Loaded by database/apply-migrations.sh after the schema.

-- =============================================================================
-- Dygo Academy — 013_hello_world_test_word.sql
-- One hand-seeded word ("hello world") that fakes GeminiEnrichmentService's
-- output end-to-end, for testing the word-detail/audio-playback UI without
-- spending a real Gemini API call.
--
-- WHY A REAL AUDIO FILE, NOT A DUMMY URL: the ask was audio that actually
-- sounds like "hello world" when played, not a placeholder link. GeminiEnrichmentService
-- (com.dygoacademy.backend/src/ai/gemini-enrichment.service.ts) normally
-- calls Gemini's TTS model and wraps the raw PCM in a WAV via its own
-- pcmToWav() (16-bit, mono). Neither Ollama (text-only, no audio) nor gTTS
-- (translate.google.com is blocked by this sandbox's egress policy) could
-- produce that here, so the audio was synthesized locally with espeak-ng
-- and resampled to the same 16-bit/mono/24kHz shape pcmToWav produces —
-- robotic-sounding, but a real recording of the words "Hello World", not
-- silence or noise. Saved to the frontend's public/ folder (Next.js serves
-- it as a static file) rather than uploaded through StorageService, which
-- needs a running MinIO/R2 endpoint this fixture deliberately skips —
-- audio_url below is only valid while the frontend dev server is running
-- on localhost:3000.
--
-- Filed into the QA fixture's existing "Everyday Conversation" topic
-- (011_qa_test_tenant_seed.sql's group, 012_qa_bulk_words_seed.sql's first
-- topic) rather than Sarah's fixtures, since this is throwaway test data,
-- not part of the automation suite's assumed dataset.
--
-- LOADING: depends on 03_qa_tenant / 04_qa_words (foreign keys).
--   ./database/apply-migrations.sh --seed 05_hello_world_word
--
-- UPDATE 2026-09-25: audio_url is now null. The localhost link only ever
-- worked on a dev machine; `npm run audio-backfill` generates real audio for
-- it like every other seed word.
-- Safe to re-run: both inserts are upserts.
-- =============================================================================

insert into public.master_lexicon
  (id, normalized_word, language_code, part_of_speech, ipa_us, ipa_uk, cefr_level,
   definition_en, audio_url, synonyms, antonyms, example_sentences, enriched_at)
values
  ('f0f0f0f0-0000-0000-0000-000000000001', 'hello world', 'en', 'phrase',
   'həˈloʊ wɜːrld', 'həˈləʊ wɜːld', 'A1',
   'A greeting phrase traditionally used as the first output of a beginner''s very first computer program; also simply "hello" said to the whole world.',
   null,  -- was http://localhost:3000/audio/hello-world.wav (dev-only link); filled by `npm run audio-backfill` like every other seed word
   '[]'::jsonb, '[]'::jsonb,
   '[{"sentence": "Every programmer remembers writing their first \"Hello World\" program.", "level": "A1", "translation_hint": null}]'::jsonb,
   now())
on conflict (id) do update set
  definition_en     = excluded.definition_en,
  example_sentences = excluded.example_sentences,
  enriched_at       = now();

insert into public.topic_words (id, topic_id, lexicon_id, source_word, status, added_by)
values
  ('f1f1f1f1-0000-0000-0000-000000000001',
   'c0c0c0c0-0000-0000-0000-000000000001', -- "Everyday Conversation" (012)
   'f0f0f0f0-0000-0000-0000-000000000001',
   'Hello World', 'READY',
   '66666666-6666-6666-6666-666666666666')  -- qa.admin@dygo.test (011)
on conflict (id) do update set
  lexicon_id = excluded.lexicon_id,
  status     = excluded.status;
