-- Phase 13 speaking entry points (design changelog SE1 / SE5 / SE6, approved
-- by Dylan 2026-10-06; boards docs/design/garden/source/Entry*.dc.html).
--
--   * SE1: daily_missions can hold a SPEAK mission ("Say 3 ripe words"). It
--     takes QUIZ's place as the 3rd mission on alternate days (the API
--     decides, missions.store.ts); still 3 missions a day.
--   * SE5: speaking_harvests: a ripe word said well (90%+) from a bed's
--     "Ready to harvest" card. Visual only: it never changes SRS or review
--     dates (D-3, Phase 13 D5). One row per learner and word; owner-only.
--   * SE6: group_echo_challenge(): the group's trickiest word that has a
--     speaking item, and how many gardeners said it since p_since. ADMIN
--     only, like GR3's tricky patches; totals only, never a user_id (D-4).

-- ---------------------------------------------------------------------------
-- SE1: SPEAK missions
alter table public.daily_missions drop constraint daily_missions_type_check;
alter table public.daily_missions add constraint daily_missions_type_check
  check (type in ('REVIEW_DUE', 'LEARN_NEW', 'QUIZ', 'SPEAK'));

-- ---------------------------------------------------------------------------
-- SE5: harvested words
create table public.speaking_harvests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references public.profiles(id) on delete cascade,
  lexicon_id  uuid not null references public.master_lexicon(id) on delete cascade,
  score       smallint not null check (score between 90 and 100),
  created_at  timestamptz not null default now(),
  constraint speaking_harvests_one_per_word unique (user_id, lexicon_id)
);

comment on table public.speaking_harvests is
  'Phase 13 SE5: a ripe word the learner said at 90%+ from "Ready to harvest". '
  'Shown as picked fruit; never changes SRS (D5). No audio is stored (D2).';

alter table public.speaking_harvests enable row level security;

create policy speaking_harvests_select_own on public.speaking_harvests
  for select to authenticated using (user_id = auth.uid());
create policy speaking_harvests_insert_own on public.speaking_harvests
  for insert to authenticated with check (user_id = auth.uid());

revoke all on public.speaking_harvests from anon, authenticated;
grant select, insert on public.speaking_harvests to authenticated;
grant select, insert, update, delete on public.speaking_harvests to service_role;

-- ---------------------------------------------------------------------------
-- SE6: Echo challenge totals
create or replace function public.group_echo_challenge(
  p_group_id uuid,
  p_since timestamptz
)
returns table (
  topic_word_id uuid,
  word          text,
  ipa_uk        text,
  ipa_us        text,
  done_count    bigint,
  member_count  bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_group_role(p_group_id, 'ADMIN') then
    raise exception 'Only a group ADMIN can see the Echo challenge.' using errcode = '42501';
  end if;

  return query
    with tricky as (
      select tw.id, tw.lexicon_id, count(*) as misses, tw.source_word
        from public.review_logs rl
        join public.topic_words tw on tw.id = rl.topic_word_id
        join public.topics t on t.id = tw.topic_id
        join public.speaking_items si on si.lexicon_id = tw.lexicon_id
       where t.group_id = p_group_id
         and rl.reviewed_at >= p_since
         and rl.was_correct = false
       group by tw.id, tw.lexicon_id, tw.source_word
       order by count(*) desc, tw.source_word
       limit 1
    )
    select tr.id, ml.normalized_word, ml.ipa_uk, ml.ipa_us,
           (select count(distinct a.user_id)
              from public.speaking_attempts a
              join public.speaking_items si on si.id = a.item_id
              join public.group_members gm on gm.user_id = a.user_id and gm.group_id = p_group_id
             where si.lexicon_id = tr.lexicon_id
               and a.created_at >= p_since),
           (select count(*) from public.group_members gm where gm.group_id = p_group_id)
      from tricky tr
      join public.master_lexicon ml on ml.id = tr.lexicon_id;
end;
$$;

comment on function public.group_echo_challenge(uuid, timestamptz) is
  'Phase 13 SE6: the group''s most-missed word since p_since that has a speaking '
  'item, with how many gardeners spoke it since then and the member count. '
  'ADMIN only (42501). Totals only, never a user_id.';

revoke all on function public.group_echo_challenge(uuid, timestamptz) from public;
grant execute on function public.group_echo_challenge(uuid, timestamptz) to authenticated;
