-- Pronunciation v2, Step A (Dylan's plan of 2026-10-25): what the stones and
-- the sound buttons need, stored per word instead of worked out on each request.
--
--   syllables_us / syllables_uk  the stones, per accent: a JSON array of
--       {text, stressed, start_ms, end_ms}. text is the spelling part shown on
--       the stone (MI, ti, gate), stressed the big stone, start_ms / end_ms
--       where the syllable is in that accent's word clip (audio_url_us /
--       audio_url_uk; null when not measured). Null = no syllable data: the
--       word is not offered in Pronunciation (Bees, Say all) and
--       GET /speaking/words/:id says blocked = no_syllables.
--   pron_tip  the P1 tip by app locale: {"en-US": "...", "vi-VN": "...", "zh-CN": "..."}.
--   audio_slow_url_us / audio_slow_url_uk  the word said slowly (Google TTS,
--       speakingRate 0.7) for "Slowly".
--
-- Filled by the enrichment worker for new words and by
-- `npm run pron-backfill` for existing ones. Additive only: the running
-- backend doesn't read these columns.

alter table public.master_lexicon
  add column syllables_us jsonb check (syllables_us is null or jsonb_typeof(syllables_us) = 'array'),
  add column syllables_uk jsonb check (syllables_uk is null or jsonb_typeof(syllables_uk) = 'array'),
  add column pron_tip jsonb check (pron_tip is null or jsonb_typeof(pron_tip) = 'object'),
  add column audio_slow_url_us text,
  add column audio_slow_url_uk text;

comment on column public.master_lexicon.syllables_us is
  'Pronunciation stones, US: [{text, stressed, start_ms, end_ms}], spans inside audio_url_us. Null = not offered.';
comment on column public.master_lexicon.syllables_uk is
  'Pronunciation stones, UK: [{text, stressed, start_ms, end_ms}], spans inside audio_url_uk. Null = not offered.';
comment on column public.master_lexicon.pron_tip is
  'P1 tip by app locale: {"en-US", "vi-VN", "zh-CN"}.';
comment on column public.master_lexicon.audio_slow_url_us is
  'The word said slowly (Google TTS speakingRate 0.7), US voice, for "Slowly".';
comment on column public.master_lexicon.audio_slow_url_uk is
  'The word said slowly (Google TTS speakingRate 0.7), UK voice, for "Slowly".';
