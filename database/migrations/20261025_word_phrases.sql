-- Seeds & Harvest Phase 2 (full task, 2026-10-24): pairings such as
-- "mitigate the risk" are phrases, stored in master_lexicon like words.
--
--   master_lexicon.is_phrase   true for a multi-word entry. Backfilled from
--                              the spelling (any space); set by whoever adds
--                              phrase entries (scripts/relations-import.js
--                              reports related words that have no entry or
--                              no audio yet).
--
-- A related word drops as a seed only when its entry exists with audio
-- (modules/beds/seed-drops.ts), so phrases need an entry first.

alter table public.master_lexicon
  add column is_phrase boolean not null default false;

comment on column public.master_lexicon.is_phrase is
  'Seeds & Harvest: a multi-word entry (a pairing such as "mitigate the risk").';

update public.master_lexicon set is_phrase = true where normalized_word ~ '\s';
