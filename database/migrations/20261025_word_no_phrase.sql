-- Drop master_lexicon.is_phrase (2026-10-25).
--
-- 20261025_word_phrases.sql added it for Seeds & Harvest (true for a
-- multi-word entry such as "mitigate the risk"), but nothing ever read it:
-- no backend, frontend, script, function, view, index or policy uses it, and
-- the code tells a phrase by the space in its spelling. Dylan asked to drop
-- it. Named to sort after 20261025_word_phrases.sql. Safe in either order
-- with a deploy, since no code selects the column.

alter table public.master_lexicon
  drop column if exists is_phrase;
