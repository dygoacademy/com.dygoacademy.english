-- Pronunciation v2 (2026-10-25): drop the stored P1 tip.
--
-- 20261025_word_pron_data.sql added master_lexicon.pron_tip, the P1 tip
-- ("Hop across the stones: land hard on MI, ...") built once per word in
-- en-US / vi-VN / zh-CN. The honeycomb redesign rewords the tip, and stored
-- text would need a backfill for every copy change, so Dylan chose to drop
-- it: the app builds the tip from the word's syllables with its own i18n
-- strings (it already did when pron_tip was null). Nothing writes or reads
-- the column any more. Named to sort after 20261025_word_pron_no_slow.sql.
--
-- Apply AFTER the backend that no longer selects this column is deployed;
-- the backend before it reads it in the Pond item query.

alter table public.master_lexicon
  drop column if exists pron_tip;
