-- Profile accent audio, part 2 (2026-10-25): the US clip's column is named
-- for its accent, to pair with audio_url_uk (20261025_word_audio_uk.sql).
--
--   master_lexicon.audio_url  ->  master_lexicon.audio_url_us
--
-- Nothing else in the database names the column (no view, function, index,
-- constraint or policy), so this is the whole change. The API field
-- follows: audio_url -> audio_url_us (word_audio_url -> word_audio_url_us
-- in the Pond, audioUrl -> audioUrlUs in quizzes).
--
-- Apply it together with the backend that reads audio_url_us: the backend
-- before it selects audio_url and fails until restarted.

alter table public.master_lexicon
  rename column audio_url to audio_url_us;

comment on column public.master_lexicon.audio_url_us is
  'The word said in American English (Google en-US Neural2, from ipa_us).';
comment on column public.master_lexicon.audio_url_uk is
  'The word said in British English (Google en-GB Neural2, from ipa_uk); null until made, the app then plays audio_url_us.';
