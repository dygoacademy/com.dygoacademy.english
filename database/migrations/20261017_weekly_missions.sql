-- A4 This week: weekly missions (docs/design/garden/CHANGELOG.md,
-- 2026-10-17; "docs/plans/A4 weekly missions implementation plan.md").
--
--   weekly_missions   one row per learner and local week (week_start = the
--                     learner's Monday), created by GET /missions/weekly on
--                     the week's first read. Fixes the week's sound and the
--                     goals ({rescue|water, sentence, sound}); counts are read
--                     from review_logs / speaking_attempts / speaking_harvests,
--                     except rescued words (a wilting word answered right in
--                     the leech drill), kept here once each. rewarded_at = the
--                     week's +1 rain barrel was given (once per week).
--
--   profiles.streak_freezes_available   now 0–3 (was 0–2): the weekly reward
--                     can add a 3rd; the Monday refill tops up to 2 and keeps
--                     a 3rd.
--
-- RLS: owner-only, like daily_missions. No delete.

create table public.weekly_missions (
  user_id          uuid not null default auth.uid()
                     references public.profiles(id) on delete cascade,
  week_start       date not null,
  sound            text not null,
  goals            jsonb not null check (jsonb_typeof(goals) = 'object'),
  rescued_word_ids uuid[] not null default '{}',
  rewarded_at      timestamptz,
  created_at       timestamptz not null default now(),
  primary key (user_id, week_start)
);

comment on table public.weekly_missions is
  'A4 This week: a learner''s weekly missions for one local week (Monday). sound = the week''s '
  'sound key (weekly.plan.ts WEEKLY_SOUNDS); goals = {rescue|water, sentence, sound}; '
  'rescued_word_ids = topic words rescued in the leech drill; rewarded_at = +1 rain barrel given.';

alter table public.weekly_missions enable row level security;

create policy weekly_missions_select_own on public.weekly_missions
  for select to authenticated using (user_id = auth.uid());
create policy weekly_missions_insert_own on public.weekly_missions
  for insert to authenticated with check (user_id = auth.uid());
create policy weekly_missions_update_own on public.weekly_missions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.weekly_missions from anon, authenticated;
grant select, insert, update on public.weekly_missions to authenticated;
grant select, insert, update, delete on public.weekly_missions to service_role;

-- ---------------------------------------------------------------------------
-- Rain barrels: up to 3 held.
alter table public.profiles
  drop constraint if exists profiles_streak_freezes_available_check;
alter table public.profiles
  add constraint profiles_streak_freezes_available_check
  check (streak_freezes_available between 0 and 3);

comment on column public.profiles.streak_freezes_available is
  'UI-6: freezes left (0–3). Refilled to at least 2 on Monday (local); A4''s weekly missions add 1, max 3.';
