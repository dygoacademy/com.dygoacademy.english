-- Pronunciation v2 (2026-10-25): drop the TTS slow clips.
--
-- 20261025_word_pron_data.sql added master_lexicon.audio_slow_url_us / _uk,
-- the word said by Google TTS at speakingRate 0.7 for "Slowly". Dylan
-- compared it on /garden/_speaking with the word clip slowed in the browser
-- (0.7x, pitch kept) and chose the browser slowdown, so Slowly now always
-- plays audio_url_us / audio_url_uk slowed, and nothing makes or reads the
-- slow clips. Named to sort after 20261025_word_pron_data.sql.
--
-- Apply AFTER the backend that no longer selects these columns is
-- deployed; the backend before it reads them in the Pond item query.
-- The slow clip files stay in storage (audio/en/us/ and audio/en/uk/,
-- 531 + 531 .m4a and their .wav copies); deleting them is separate.

alter table public.master_lexicon
  drop column if exists audio_slow_url_us,
  drop column if exists audio_slow_url_uk;
