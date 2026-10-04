-- Phase 13, Dylan's answer to question 2 (2026-10-04): speaking starts from
-- the Missions tab (Sound Garden → The Pond) and from a flashcard ("Say this
-- one?"), never from one topic bed. So a speaking item belongs to the WORD
-- (master_lexicon), shared by every bed that contains it, not to a topic.
--
--   * drop speaking_items.topic_id (and its unique key and index);
--   * one item per word: unique (lexicon_id).
--
-- Safe whether or not 20261004_speaking.sql already has rows: duplicates of
-- a word (one per bed) are merged into the oldest item first, and their
-- attempts are moved onto it, so no learner history is lost. RLS and grants
-- are unchanged.

-- Merge duplicates: keep the oldest item per word.
create temporary table speaking_item_merge as
select si.id as dup_id, keep.id as keep_id
  from public.speaking_items si
  join lateral (
    select k.id from public.speaking_items k
     where k.lexicon_id = si.lexicon_id
     order by k.created_at, k.id
     limit 1
  ) keep on keep.id <> si.id;

update public.speaking_attempts a
   set item_id = m.keep_id
  from speaking_item_merge m
 where a.item_id = m.dup_id;

delete from public.speaking_items si
 using speaking_item_merge m
 where si.id = m.dup_id;

drop table speaking_item_merge;

alter table public.speaking_items
  drop constraint speaking_items_one_per_word_per_topic;
drop index public.idx_speaking_items_topic_id;
alter table public.speaking_items drop column topic_id;

-- The unique key's index replaces idx_speaking_items_lexicon_id.
drop index public.idx_speaking_items_lexicon_id;
alter table public.speaking_items
  add constraint speaking_items_one_per_word unique (lexicon_id);

comment on table public.speaking_items is
  'Phase 13: one sentence per word (master_lexicon), shared by every bed that '
  'contains the word, with native UK/US audio (R2 object keys) and timings '
  '{duration, words:[{text,start,end,syllables:[{start,end,stressed}]}]}. '
  'Written by the content script as service_role; read-only for learners.';
