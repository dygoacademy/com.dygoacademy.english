-- Seeds & Harvest Phase 1: the learner's beds ("docs/plans/Seeds and Harvest
-- implementation plan.md"; design S2 Bed harvest, S3 Pick a seed packet).
--
--   user_beds   one row per learner and bed they have planted from.
--               status  active     the bed today's planting takes words from
--                                  (at most one per learner)
--                       resting    left before it was fully planted
--                       harvested  left after every word was planted (S2)
--               Picking a seed packet (POST /beds) makes that bed active and
--               the old one resting or harvested.
--
-- Before this the bed was profiles.first_topic_id (picked from the goal at
-- onboarding). It stays as the fallback for a learner with no active row;
-- every existing first bed is backfilled as active below.
--
-- RLS: owner-only, like daily_missions. No delete.

create table public.user_beds (
  user_id      uuid not null default auth.uid()
                 references public.profiles(id) on delete cascade,
  topic_id     uuid not null references public.topics(id) on delete cascade,
  status       text not null default 'active'
                 check (status in ('active', 'resting', 'harvested')),
  started_at   timestamptz not null default now(),
  harvested_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, topic_id),
  constraint user_beds_harvested_at check ((status = 'harvested') = (harvested_at is not null))
);

create unique index user_beds_one_active on public.user_beds (user_id) where status = 'active';

comment on table public.user_beds is
  'Seeds & Harvest: the beds a learner has planted from. One active bed (today''s planting); '
  'resting = left unfinished; harvested = left after every word was planted (S2).';

alter table public.user_beds enable row level security;

create policy user_beds_select_own on public.user_beds
  for select to authenticated using (user_id = auth.uid());
create policy user_beds_insert_own on public.user_beds
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_read_topic(topic_id));
create policy user_beds_update_own on public.user_beds
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.user_beds from anon, authenticated;
grant select, insert, update on public.user_beds to authenticated;
grant select, insert, update, delete on public.user_beds to service_role;

-- Every learner's first bed is their active bed.
insert into public.user_beds (user_id, topic_id, status, started_at)
select p.id, p.first_topic_id, 'active', coalesce(p.onboarded_at, p.created_at)
  from public.profiles p
 where p.first_topic_id is not null
on conflict do nothing;
