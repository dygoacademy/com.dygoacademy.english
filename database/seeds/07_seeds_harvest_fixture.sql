-- =============================================================================
-- Seeds & Harvest test fixture (dev and test databases only): the plan's
-- "mitigate" example. A public 5-word bed "Environment (Seeds & Harvest
-- test)"; "mitigate" has two reviewed relations whose entries have audio,
-- so the review that makes it fruit drops "mitigate the risk" (pairing) and
-- "mitigation" (word family), and a third, unreviewed one ("reduce") that
-- never drops. Needs migrations 20261024_seed_drops and 20261025_word_phrases.
-- The audio URLs are placeholders: the Hear buttons won't play.
-- =============================================================================

insert into public.topics (id, group_id, title, description, is_public) values
  ('cccccccc-5eed-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
   'Environment (Seeds & Harvest test)', 'Five words for the Seeds & Harvest acceptance run.', true)
on conflict (id) do nothing;

insert into public.master_lexicon
  (id, normalized_word, language_code, part_of_speech, ipa_us, ipa_uk, cefr_level,
   definition_en, audio_url, is_phrase, enriched_at) values
  ('dddddddd-5eed-0000-0000-000000000001', 'mitigate', 'en', 'verb', '/ˈmɪt.ɪ.ɡeɪt/', '/ˈmɪt.ɪ.ɡeɪt/', 'B2',
   'make something bad less severe', 'https://media.dygo.test/audio/mitigate.mp3', false, now()),
  ('dddddddd-5eed-0000-0000-000000000002', 'habitat', 'en', 'noun', '/ˈhæb.ɪ.tæt/', '/ˈhæb.ɪ.tæt/', 'B2',
   'the natural home of an animal or plant', 'https://media.dygo.test/audio/habitat.mp3', false, now()),
  ('dddddddd-5eed-0000-0000-000000000003', 'emission', 'en', 'noun', '/iˈmɪʃ.ən/', '/iˈmɪʃ.ən/', 'B2',
   'gas or other substance sent into the air', 'https://media.dygo.test/audio/emission.mp3', false, now()),
  ('dddddddd-5eed-0000-0000-000000000004', 'drought', 'en', 'noun', '/draʊt/', '/draʊt/', 'B2',
   'a long period with little or no rain', 'https://media.dygo.test/audio/drought.mp3', false, now()),
  ('dddddddd-5eed-0000-0000-000000000005', 'renewable', 'en', 'adjective', '/rɪˈnuː.ə.bəl/', '/rɪˈnjuː.ə.bəl/', 'B2',
   'able to be replaced naturally', 'https://media.dygo.test/audio/renewable.mp3', false, now()),
  ('dddddddd-5eed-0000-0000-000000000006', 'mitigate the risk', 'en', 'phrase', '/ˈmɪt.ɪ.ɡeɪt ðə rɪsk/', '/ˈmɪt.ɪ.ɡeɪt ðə rɪsk/', 'B2',
   'make something bad less likely to happen', 'https://media.dygo.test/audio/mitigate-the-risk.mp3', true, now()),
  ('dddddddd-5eed-0000-0000-000000000007', 'mitigation', 'en', 'noun', '/ˌmɪt.ɪˈɡeɪ.ʃən/', '/ˌmɪt.ɪˈɡeɪ.ʃən/', 'C1',
   'the act of making harm less serious', 'https://media.dygo.test/audio/mitigation.mp3', false, now())
on conflict (normalized_word, language_code) do nothing;

insert into public.topic_words (id, topic_id, lexicon_id, source_word, status) values
  ('eeeeeeee-5eed-0000-0000-000000000001', 'cccccccc-5eed-0000-0000-000000000001', 'dddddddd-5eed-0000-0000-000000000001', 'mitigate', 'READY'),
  ('eeeeeeee-5eed-0000-0000-000000000002', 'cccccccc-5eed-0000-0000-000000000001', 'dddddddd-5eed-0000-0000-000000000002', 'habitat', 'READY'),
  ('eeeeeeee-5eed-0000-0000-000000000003', 'cccccccc-5eed-0000-0000-000000000001', 'dddddddd-5eed-0000-0000-000000000003', 'emission', 'READY'),
  ('eeeeeeee-5eed-0000-0000-000000000004', 'cccccccc-5eed-0000-0000-000000000001', 'dddddddd-5eed-0000-0000-000000000004', 'drought', 'READY'),
  ('eeeeeeee-5eed-0000-0000-000000000005', 'cccccccc-5eed-0000-0000-000000000001', 'dddddddd-5eed-0000-0000-000000000005', 'renewable', 'READY')
on conflict (id) do nothing;

insert into public.word_relations (lexicon_id, related_word, kind, rank, reviewed_at) values
  ('dddddddd-5eed-0000-0000-000000000001', 'mitigate the risk', 'pairing', 1, now()),
  ('dddddddd-5eed-0000-0000-000000000001', 'mitigation', 'family', 1, now()),
  ('dddddddd-5eed-0000-0000-000000000001', 'reduce', 'synonym', 1, null)
on conflict (lexicon_id, related_word) do nothing;
