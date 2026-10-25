-- Profile accent audio (2026-10-25): every word gets a British clip next to
-- the American one, and the learner hears the one that matches
-- profiles.english_variety (en-GB -> UK, anything else -> US).
--
--   master_lexicon.audio_url      the US clip (en-US-Neural2-F, from ipa_us),
--                                 unchanged.
--   master_lexicon.audio_url_uk   the UK clip (en-GB-Neural2-C, from ipa_uk).
--                                 Null until enrichment or
--                                 `npm run audio-backfill` makes it; the app
--                                 then plays the US clip.

alter table public.master_lexicon
  add column audio_url_uk text null;

comment on column public.master_lexicon.audio_url is
  'The word said in American English (Google en-US Neural2, from ipa_us).';
comment on column public.master_lexicon.audio_url_uk is
  'The word said in British English (Google en-GB Neural2, from ipa_uk); null until made, the app then plays audio_url.';
