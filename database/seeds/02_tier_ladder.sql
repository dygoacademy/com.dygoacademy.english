-- seeds/02_tier_ladder.sql — Phase 9 tier-ladder test topics (needs 01_core_fixtures).
-- Formerly migrations/018_tier_ladder_seed.sql; content unchanged except
-- where noted. Loaded by database/apply-migrations.sh after the schema.

-- =============================================================================
-- Dygo Academy — 018_tier_ladder_seed.sql
-- 4 topics, 6 real dictionary words each (24 total), built specifically to
-- back Phase 9's "Vocabulary Mastery Tier Ladder" feature
-- (../../phase 9 implementation plan.md) — a `TIER_TOPIC_TITLES`-style
-- tier→topic mapping needs a real topic per tier to compute a ratio against,
-- and no such curriculum-ordered content existed in any prior seed file.
--
-- DEVELOPMENT ONLY, same caveat as 004: safe to re-run (every insert is
-- ON CONFLICT), but never intended for production — this is explicitly a
-- *test* dataset ("Let's map tiers to topics ourselves for now" / "You can
-- build test dataset by yourself", live-requested 2026-09-20), standing in
-- for the real curriculum-content decision `phase 9 implementation plan.md`
-- flags as the one non-dev-task prerequisite for this feature. Swap this
-- file's topic ids for real production topic ids in the backend's tier
-- config once that decision is actually made — don't ship this seed's ids
-- as the permanent mapping.
--
-- Lives under 004's "IELTS Band 8.0 Masterclass" group
-- (bbbbbbbb-0000-0000-0000-000000000001, Sarah/11111111…, part of the
-- DEFAULT --seed sequence) rather than 011's QA-only group — unlike
-- 011/012/013 (opt-in QA fixtures), this needs to exist in every freshly
-- seeded environment for the tier-ladder feature to be testable at all
-- without an extra flag. `is_public = true` on all 4 topics: unlike Sarah's
-- other private cohort content, these represent shared "core" curriculum
-- collections, matching how the Phase 9 mockup itself showed
-- "IELTS Band 6.5 Core" tagged public.
--
-- CEFR grading per tier is a rough real-world correlation to IELTS bands
-- (A2≈4-5, B1-B2≈5-6, B2-C1≈6-6.5, C1-C2≈7-8), not an exact/official
-- mapping — good enough for a test dataset meant to exercise the tier
-- ladder's mechanics, not a claim about real IELTS scoring.
--
-- Word list is entirely new vocabulary, cross-checked against every word
-- already seeded in 004_seed_data.sql and 012_qa_bulk_words_seed.sql to
-- avoid colliding with `master_lexicon_unique_word_per_language`.
--
-- LOADING:
--   ./database/apply-migrations.sh --tier-ladder-seed-only   # needs 004 first
--   (also runs automatically as part of --seed / --test, same as 004)
-- =============================================================================

-- Topics ----------------------------------------------------------------------
insert into public.topics (id, group_id, title, description, is_public) values
  ('c9c9c9c9-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'Foundation Vocabulary', 'Everyday A2 words — tier 1 of the vocabulary mastery ladder.', true),
  ('c9c9c9c9-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001',
   'Core Vocabulary', 'B1-B2 words for general fluency — tier 2 of the vocabulary mastery ladder.', true),
  ('c9c9c9c9-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001',
   'Band 6.5 Ready', 'B2-C1 words correlated with a 6.5 band — tier 3 of the vocabulary mastery ladder.', true),
  ('c9c9c9c9-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000001',
   'Band 7.5 Ready', 'C1-C2 words correlated with a 7.5+ band — tier 4 of the vocabulary mastery ladder.', true)
on conflict (id) do update set title = excluded.title, description = excluded.description, is_public = excluded.is_public;

-- Master lexicon — 24 real entries, 6 per tier ---------------------------------
-- audio_url_us is null on purpose: `npm run audio-backfill` (backend) queues
-- every word without audio, reusing existing R2 audio or generating it with
-- Gemini TTS. (These seeds used to ship placeholder
-- links on cdn.dygo.academy, a domain that never existed.)
insert into public.master_lexicon
  (id, normalized_word, language_code, part_of_speech, ipa_us, ipa_uk, cefr_level,
   definition_en, audio_url_us, synonyms, antonyms, example_sentences, enriched_at) values

  -- Tier 1: Foundation Vocabulary (A2) -----------------------------------------
  ('d9d9d9d9-0000-0000-0000-000000000001', 'polite', 'en', 'adjective', '/pəˈlaɪt/', '/pəˈlaɪt/', 'A2',
   'Having or showing good manners or respect for others.', null,
   '[{"word": "courteous", "level": "B1"}, {"word": "well-mannered", "level": "B1"}]'::jsonb,
   '[{"word": "rude", "level": "A2"}]'::jsonb,
   '[{"sentence": "It''s polite to say thank you when someone helps you.", "level": "A2", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000002', 'punctual', 'en', 'adjective', '/ˈpʌŋk.tʃu.əl/', '/ˈpʌŋk.tʃu.əl/', 'A2',
   'Arriving or doing something at the expected time; not late.', null,
   '[{"word": "prompt", "level": "B2"}, {"word": "on time", "level": "A1"}]'::jsonb,
   '[{"word": "late", "level": "A1"}]'::jsonb,
   '[{"sentence": "She is always punctual for her morning classes.", "level": "A2", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000003', 'cautious', 'en', 'adjective', '/ˈkɔː.ʃəs/', '/ˈkɔː.ʃəs/', 'A2',
   'Careful to avoid danger or mistakes.', null,
   '[{"word": "careful", "level": "A1"}, {"word": "wary", "level": "B2"}]'::jsonb,
   '[{"word": "reckless", "level": "B2"}]'::jsonb,
   '[{"sentence": "Drivers should be cautious on icy roads.", "level": "A2", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000004', 'cheerful', 'en', 'adjective', '/ˈtʃɪə.fəl/', '/ˈtʃɪə.fəl/', 'A2',
   'Noticeably happy and positive.', null,
   '[{"word": "happy", "level": "A1"}, {"word": "upbeat", "level": "B2"}]'::jsonb,
   '[{"word": "gloomy", "level": "B2"}]'::jsonb,
   '[{"sentence": "The cheerful waiter greeted every customer with a smile.", "level": "A2", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000005', 'ordinary', 'en', 'adjective', '/ˈɔː.dɪn.ər.i/', '/ˈɔːr.dən.er.i/', 'A2',
   'Not special or unusual; normal.', null,
   '[{"word": "normal", "level": "A1"}, {"word": "typical", "level": "B1"}]'::jsonb,
   '[{"word": "extraordinary", "level": "B2"}]'::jsonb,
   '[{"sentence": "It was just an ordinary Tuesday at the office.", "level": "A2", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000006', 'straightforward', 'en', 'adjective', '/streɪtˈfɔːr.wərd/', '/streɪtˈfɔː.wəd/', 'B1',
   'Easy to understand or do; simple.', null,
   '[{"word": "simple", "level": "A1"}, {"word": "uncomplicated", "level": "B2"}]'::jsonb,
   '[{"word": "complicated", "level": "B1"}]'::jsonb,
   '[{"sentence": "The instructions were straightforward, so assembly took only ten minutes.", "level": "B1", "translation_hint": null}]'::jsonb, now()),

  -- Tier 2: Core Vocabulary (B1-B2) ---------------------------------------------
  ('d9d9d9d9-0000-0000-0000-000000000007', 'diligent', 'en', 'adjective', '/ˈdɪl.ɪ.dʒənt/', '/ˈdɪl.ɪ.dʒənt/', 'B2',
   'Showing care and effort in one''s work or duties.', null,
   '[{"word": "hardworking", "level": "B1"}, {"word": "conscientious", "level": "C1"}]'::jsonb,
   '[{"word": "lazy", "level": "A2"}]'::jsonb,
   '[{"sentence": "The diligent student reviewed her notes every evening.", "level": "B2", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000008', 'ambitious', 'en', 'adjective', '/æmˈbɪʃ.əs/', '/æmˈbɪʃ.əs/', 'B1',
   'Having a strong desire to succeed or achieve something.', null,
   '[{"word": "driven", "level": "B2"}, {"word": "aspiring", "level": "B2"}]'::jsonb,
   '[{"word": "unambitious", "level": "C1"}]'::jsonb,
   '[{"sentence": "His ambitious plan was to open three new stores within a year.", "level": "B1", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000009', 'adequate', 'en', 'adjective', '/ˈæd.ɪ.kwət/', '/ˈæd.ɪ.kwət/', 'B2',
   'Enough or satisfactory for a particular purpose.', null,
   '[{"word": "sufficient", "level": "B2"}, {"word": "acceptable", "level": "B1"}]'::jsonb,
   '[{"word": "inadequate", "level": "B2"}]'::jsonb,
   '[{"sentence": "The team had adequate time to finish the project before the deadline.", "level": "B2", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000010', 'substantial', 'en', 'adjective', '/səbˈstæn.ʃəl/', '/səbˈstæn.ʃəl/', 'B2',
   'Large in amount, size, or importance.', null,
   '[{"word": "considerable", "level": "B2"}, {"word": "significant", "level": "B2"}]'::jsonb,
   '[{"word": "negligible", "level": "C1"}]'::jsonb,
   '[{"sentence": "The company reported a substantial increase in profits this quarter.", "level": "B2", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000011', 'consequently', 'en', 'adverb', '/ˈkɒn.sɪ.kwənt.li/', '/ˈkɒn.sɪ.kwənt.li/', 'B2',
   'As a result of something; therefore.', null,
   '[{"word": "therefore", "level": "B1"}, {"word": "as a result", "level": "B1"}]'::jsonb,
   '[]'::jsonb,
   '[{"sentence": "It rained heavily all week; consequently, the match was postponed.", "level": "B2", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000012', 'gradually', 'en', 'adverb', '/ˈɡrædʒ.u.ə.li/', '/ˈɡræd.ju.ə.li/', 'B1',
   'Slowly, over a period of time.', null,
   '[{"word": "slowly", "level": "A1"}, {"word": "steadily", "level": "B2"}]'::jsonb,
   '[{"word": "suddenly", "level": "A2"}]'::jsonb,
   '[{"sentence": "Her English gradually improved after months of daily practice.", "level": "B1", "translation_hint": null}]'::jsonb, now()),

  -- Tier 3: Band 6.5 Ready (B2-C1) ------------------------------------------------
  ('d9d9d9d9-0000-0000-0000-000000000013', 'contentious', 'en', 'adjective', '/kənˈten.ʃəs/', '/kənˈten.ʃəs/', 'C1',
   'Likely to cause disagreement or argument.', null,
   '[{"word": "controversial", "level": "B2"}, {"word": "disputed", "level": "C1"}]'::jsonb,
   '[{"word": "uncontroversial", "level": "C1"}]'::jsonb,
   '[{"sentence": "Immigration remains a contentious issue in national politics.", "level": "C1", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000014', 'ubiquitous', 'en', 'adjective', '/juːˈbɪk.wɪ.təs/', '/juːˈbɪk.wɪ.təs/', 'C1',
   'Seeming to be everywhere at the same time; very common.', null,
   '[{"word": "pervasive", "level": "C1"}, {"word": "omnipresent", "level": "C2"}]'::jsonb,
   '[{"word": "rare", "level": "B1"}]'::jsonb,
   '[{"sentence": "Smartphones have become ubiquitous in modern daily life.", "level": "C1", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000015', 'credible', 'en', 'adjective', '/ˈkred.ɪ.bəl/', '/ˈkred.ɪ.bəl/', 'B2',
   'Able to be believed; convincing.', null,
   '[{"word": "believable", "level": "B1"}, {"word": "plausible", "level": "C1"}]'::jsonb,
   '[{"word": "implausible", "level": "C1"}]'::jsonb,
   '[{"sentence": "The witness gave a credible account of what happened.", "level": "B2", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000016', 'discern', 'en', 'verb', '/dɪˈsɜːn/', '/dɪˈsɜːn/', 'C1',
   'To notice or understand something, often with difficulty.', null,
   '[{"word": "perceive", "level": "C1"}, {"word": "detect", "level": "B2"}]'::jsonb,
   '[{"word": "overlook", "level": "B2"}]'::jsonb,
   '[{"sentence": "It was hard to discern any real difference between the two proposals.", "level": "C1", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000017', 'mundane', 'en', 'adjective', '/mʌnˈdeɪn/', '/mʌnˈdeɪn/', 'C1',
   'Lacking excitement; ordinary and dull.', null,
   '[{"word": "tedious", "level": "B2"}, {"word": "routine", "level": "B1"}]'::jsonb,
   '[{"word": "extraordinary", "level": "B2"}]'::jsonb,
   '[{"sentence": "He longed for adventure beyond his mundane office job.", "level": "C1", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000018', 'robust', 'en', 'adjective', '/roʊˈbʌst/', '/rəʊˈbʌst/', 'B2',
   'Strong and healthy, or not likely to fail or break.', null,
   '[{"word": "sturdy", "level": "B2"}, {"word": "resilient", "level": "B2"}]'::jsonb,
   '[{"word": "fragile", "level": "B1"}]'::jsonb,
   '[{"sentence": "The company built a robust system to handle sudden spikes in traffic.", "level": "B2", "translation_hint": null}]'::jsonb, now()),

  -- Tier 4: Band 7.5 Ready (C1-C2) ------------------------------------------------
  ('d9d9d9d9-0000-0000-0000-000000000019', 'juxtapose', 'en', 'verb', '/ˈdʒʌk.stə.poʊz/', '/ˈdʒʌk.stə.pəʊz/', 'C2',
   'To place two things side by side, especially to compare or contrast them.', null,
   '[{"word": "contrast", "level": "B2"}, {"word": "compare", "level": "A2"}]'::jsonb,
   '[{"word": "separate", "level": "A2"}]'::jsonb,
   '[{"sentence": "The exhibition juxtaposes photographs from the 1950s with images from today.", "level": "C2", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000020', 'ostensibly', 'en', 'adverb', '/ɑːˈsten.sə.bli/', '/ɒˈsten.sɪ.bli/', 'C1',
   'Apparently, or according to what seems true, though not necessarily so.', null,
   '[{"word": "apparently", "level": "B1"}, {"word": "supposedly", "level": "B2"}]'::jsonb,
   '[]'::jsonb,
   '[{"sentence": "The meeting was ostensibly about budgets, but really about the merger.", "level": "C1", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000021', 'corroborate', 'en', 'verb', '/kəˈrɑː.bə.reɪt/', '/kəˈrɒb.ə.reɪt/', 'C2',
   'To confirm or give support to a statement or theory.', null,
   '[{"word": "confirm", "level": "B1"}, {"word": "substantiate", "level": "C2"}]'::jsonb,
   '[{"word": "contradict", "level": "B2"}]'::jsonb,
   '[{"sentence": "New evidence has emerged to corroborate her original testimony.", "level": "C2", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000022', 'nuanced', 'en', 'adjective', '/ˈnuː.ɑːnst/', '/ˈnjuː.ɑːnst/', 'C1',
   'Characterized by subtle shades of meaning or expression.', null,
   '[{"word": "subtle", "level": "B2"}, {"word": "refined", "level": "C1"}]'::jsonb,
   '[{"word": "crude", "level": "B2"}]'::jsonb,
   '[{"sentence": "Her nuanced argument acknowledged both sides of the debate.", "level": "C1", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000023', 'intrinsic', 'en', 'adjective', '/ɪnˈtrɪn.zɪk/', '/ɪnˈtrɪn.zɪk/', 'C1',
   'Belonging naturally to something; essential.', null,
   '[{"word": "inherent", "level": "C1"}, {"word": "fundamental", "level": "B2"}]'::jsonb,
   '[{"word": "extrinsic", "level": "C2"}]'::jsonb,
   '[{"sentence": "The intrinsic value of education goes beyond exam results.", "level": "C1", "translation_hint": null}]'::jsonb, now()),
  ('d9d9d9d9-0000-0000-0000-000000000024', 'unequivocal', 'en', 'adjective', '/ˌʌn.ɪˈkwɪv.ə.kəl/', '/ˌʌn.ɪˈkwɪv.ə.kəl/', 'C2',
   'Leaving no doubt; completely clear.', null,
   '[{"word": "unambiguous", "level": "C1"}, {"word": "clear", "level": "A1"}]'::jsonb,
   '[{"word": "ambiguous", "level": "B2"}]'::jsonb,
   '[{"sentence": "The board gave an unequivocal rejection of the takeover bid.", "level": "C2", "translation_hint": null}]'::jsonb, now())
on conflict (id) do update set
  definition_en = excluded.definition_en,
  synonyms      = excluded.synonyms,
  antonyms      = excluded.antonyms,
  example_sentences = excluded.example_sentences;

-- Topic words — every one READY (fully enriched), one per lexicon entry -------
insert into public.topic_words (id, topic_id, lexicon_id, source_word, status, added_by) values
  ('e9e9e9e9-0000-0000-0000-000000000001', 'c9c9c9c9-0000-0000-0000-000000000001', 'd9d9d9d9-0000-0000-0000-000000000001', 'polite', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000002', 'c9c9c9c9-0000-0000-0000-000000000001', 'd9d9d9d9-0000-0000-0000-000000000002', 'punctual', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000003', 'c9c9c9c9-0000-0000-0000-000000000001', 'd9d9d9d9-0000-0000-0000-000000000003', 'cautious', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000004', 'c9c9c9c9-0000-0000-0000-000000000001', 'd9d9d9d9-0000-0000-0000-000000000004', 'cheerful', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000005', 'c9c9c9c9-0000-0000-0000-000000000001', 'd9d9d9d9-0000-0000-0000-000000000005', 'ordinary', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000006', 'c9c9c9c9-0000-0000-0000-000000000001', 'd9d9d9d9-0000-0000-0000-000000000006', 'straightforward', 'READY', '11111111-1111-1111-1111-111111111111'),

  ('e9e9e9e9-0000-0000-0000-000000000007', 'c9c9c9c9-0000-0000-0000-000000000002', 'd9d9d9d9-0000-0000-0000-000000000007', 'diligent', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000008', 'c9c9c9c9-0000-0000-0000-000000000002', 'd9d9d9d9-0000-0000-0000-000000000008', 'ambitious', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000009', 'c9c9c9c9-0000-0000-0000-000000000002', 'd9d9d9d9-0000-0000-0000-000000000009', 'adequate', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000010', 'c9c9c9c9-0000-0000-0000-000000000002', 'd9d9d9d9-0000-0000-0000-000000000010', 'substantial', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000011', 'c9c9c9c9-0000-0000-0000-000000000002', 'd9d9d9d9-0000-0000-0000-000000000011', 'consequently', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000012', 'c9c9c9c9-0000-0000-0000-000000000002', 'd9d9d9d9-0000-0000-0000-000000000012', 'gradually', 'READY', '11111111-1111-1111-1111-111111111111'),

  ('e9e9e9e9-0000-0000-0000-000000000013', 'c9c9c9c9-0000-0000-0000-000000000003', 'd9d9d9d9-0000-0000-0000-000000000013', 'contentious', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000014', 'c9c9c9c9-0000-0000-0000-000000000003', 'd9d9d9d9-0000-0000-0000-000000000014', 'ubiquitous', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000015', 'c9c9c9c9-0000-0000-0000-000000000003', 'd9d9d9d9-0000-0000-0000-000000000015', 'credible', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000016', 'c9c9c9c9-0000-0000-0000-000000000003', 'd9d9d9d9-0000-0000-0000-000000000016', 'discern', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000017', 'c9c9c9c9-0000-0000-0000-000000000003', 'd9d9d9d9-0000-0000-0000-000000000017', 'mundane', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000018', 'c9c9c9c9-0000-0000-0000-000000000003', 'd9d9d9d9-0000-0000-0000-000000000018', 'robust', 'READY', '11111111-1111-1111-1111-111111111111'),

  ('e9e9e9e9-0000-0000-0000-000000000019', 'c9c9c9c9-0000-0000-0000-000000000004', 'd9d9d9d9-0000-0000-0000-000000000019', 'juxtapose', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000020', 'c9c9c9c9-0000-0000-0000-000000000004', 'd9d9d9d9-0000-0000-0000-000000000020', 'ostensibly', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000021', 'c9c9c9c9-0000-0000-0000-000000000004', 'd9d9d9d9-0000-0000-0000-000000000021', 'corroborate', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000022', 'c9c9c9c9-0000-0000-0000-000000000004', 'd9d9d9d9-0000-0000-0000-000000000022', 'nuanced', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000023', 'c9c9c9c9-0000-0000-0000-000000000004', 'd9d9d9d9-0000-0000-0000-000000000023', 'intrinsic', 'READY', '11111111-1111-1111-1111-111111111111'),
  ('e9e9e9e9-0000-0000-0000-000000000024', 'c9c9c9c9-0000-0000-0000-000000000004', 'd9d9d9d9-0000-0000-0000-000000000024', 'unequivocal', 'READY', '11111111-1111-1111-1111-111111111111')
on conflict (id) do update set
  lexicon_id = excluded.lexicon_id,
  status     = excluded.status;
