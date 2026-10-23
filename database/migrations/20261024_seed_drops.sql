-- Seeds & Harvest Phase 2: fruit drops seeds ("docs/plans/Seeds and Harvest
-- implementation plan.md"; design S1 Fruit drops seeds).
--
--   word_relations   related words for a lexicon entry: a pairing
--                    ("mitigate the risk"), a word-family member
--                    ("mitigation") or a synonym ("reduce"), ranked within
--                    each kind. Content, written by service_role only
--                    (scripts/relations-import.js). Only rows an editor
--                    reviewed (reviewed_at set) are read by learners, so a
--                    draft never drops.
--
--   seed_drops       one row per seed a learner's fruit dropped. The seed
--                    itself is a topic word in the learner's own "My words"
--                    bed (private, so a library bed never changes for
--                    everyone), enriched like any added word; bed_topic_id
--                    is the bed it belongs to (the fruit word's bed) and
--                    dropped_by the fruit word. seen_at = S1 was shown.
--
-- RLS: word_relations readable by signed-in learners (reviewed rows only);
-- seed_drops owner-only, like user_beds. No delete for learners.

create table public.word_relations (
  id           uuid primary key default gen_random_uuid(),
  lexicon_id   uuid not null references public.master_lexicon(id) on delete cascade,
  related_word text not null check (length(trim(related_word)) > 0),
  kind         text not null check (kind in ('pairing', 'family', 'synonym')),
  rank         smallint not null default 1 check (rank >= 1),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint word_relations_unique_word unique (lexicon_id, related_word)
);

comment on table public.word_relations is
  'Seeds & Harvest: related words a fruit (mastered) word can drop as seeds. kind = pairing | '
  'family | synonym, rank within the kind (1 first). Learners only read reviewed rows.';

alter table public.word_relations enable row level security;

create policy word_relations_select_reviewed on public.word_relations
  for select to authenticated using (reviewed_at is not null);

revoke all on public.word_relations from anon, authenticated;
grant select on public.word_relations to authenticated;
grant select, insert, update, delete on public.word_relations to service_role;

create table public.seed_drops (
  user_id       uuid not null default auth.uid()
                  references public.profiles(id) on delete cascade,
  topic_word_id uuid not null references public.topic_words(id) on delete cascade,
  bed_topic_id  uuid not null references public.topics(id) on delete cascade,
  dropped_by    uuid not null references public.topic_words(id) on delete cascade,
  kind          text not null check (kind in ('pairing', 'family', 'synonym')),
  seen_at       timestamptz,
  created_at    timestamptz not null default now(),
  primary key (user_id, topic_word_id)
);

create index seed_drops_bed on public.seed_drops (user_id, bed_topic_id);
create index seed_drops_dropped_by on public.seed_drops (user_id, dropped_by);

comment on table public.seed_drops is
  'Seeds & Harvest: a seed a learner''s fruit word dropped. topic_word_id = the seed (in their '
  'My words bed); bed_topic_id = the bed it belongs to; dropped_by = the fruit word; '
  'seen_at = S1 Fruit drops seeds was shown.';

alter table public.seed_drops enable row level security;

create policy seed_drops_select_own on public.seed_drops
  for select to authenticated using (user_id = auth.uid());
create policy seed_drops_insert_own on public.seed_drops
  for insert to authenticated with check (user_id = auth.uid());
create policy seed_drops_update_own on public.seed_drops
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.seed_drops from anon, authenticated;
grant select, insert, update on public.seed_drops to authenticated;
grant select, insert, update, delete on public.seed_drops to service_role;
