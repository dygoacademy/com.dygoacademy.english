-- UI-6 U6-1 (docs/plans/phase 12 implementation plan.md, "UI-6 finish"): tables and
-- profile columns for daily missions, streak freezes, keepsakes and the two
-- new learner preferences (UK/US English, daily goal in minutes).
--
-- Decided 2026-10-01 (defaults, Dylan can change later):
--   * 3 missions per learner per local day: REVIEW_DUE (target = due words
--     at the day's first read, min 1), LEARN_NEW (target 5), QUIZ (target 1);
--     Golden Bloom = all 3 done that local day (derived, not stored);
--   * streak freezes: 2 available, refilled to 2 every Monday in the
--     learner's time zone, one used automatically per missed day (lazily,
--     when the streak is computed) — one streak_freeze_uses row per day used;
--   * keepsakes: FIRST_HARVEST (value 0), STREAK (7/30/100),
--     GOLDEN_BLOOMS (10/50).
--
-- local_date is always the learner's local day (profiles.timezone), set by
-- the backend. RLS: owner rows only. Like user_word_srs, a learner can
-- select / insert / update their own rows; nobody can touch anyone else's,
-- and there are no delete policies (rows are history).

-- ---------------------------------------------------------------------------
-- Daily missions
create table public.daily_missions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  local_date   date not null,
  type         text not null check (type in ('REVIEW_DUE', 'LEARN_NEW', 'QUIZ')),
  target       smallint not null check (target >= 1),
  progress     smallint not null default 0 check (progress >= 0),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint daily_missions_one_per_type unique (user_id, local_date, type)
);

comment on table public.daily_missions is
  'UI-6 U6-1: one row per learner, local day and mission type (3 per day), '
  'created on the first GET /missions/today. completed_at is set when '
  'progress reaches target. Golden Bloom = all 3 completed that local_date.';

alter table public.daily_missions enable row level security;

create policy daily_missions_select_own on public.daily_missions
  for select to authenticated using (user_id = auth.uid());
create policy daily_missions_insert_own on public.daily_missions
  for insert to authenticated with check (user_id = auth.uid());
create policy daily_missions_update_own on public.daily_missions
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Streak freezes used (one per missed local day)
create table public.streak_freeze_uses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  local_date date not null,
  created_at timestamptz not null default now(),
  constraint streak_freeze_uses_one_per_day unique (user_id, local_date)
);

comment on table public.streak_freeze_uses is
  'UI-6 U6-1: a missed local_date the learner''s streak survived by using a '
  'freeze (decision 7). Written lazily when the streak is computed.';

alter table public.streak_freeze_uses enable row level security;

create policy streak_freeze_uses_select_own on public.streak_freeze_uses
  for select to authenticated using (user_id = auth.uid());
create policy streak_freeze_uses_insert_own on public.streak_freeze_uses
  for insert to authenticated with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Keepsakes earned
create table public.user_keepsakes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  kind      text not null check (kind in ('FIRST_HARVEST', 'STREAK', 'GOLDEN_BLOOMS')),
  value     integer not null default 0 check (value >= 0),
  earned_at timestamptz not null default now(),
  constraint user_keepsakes_one_each unique (user_id, kind, value)
);

comment on table public.user_keepsakes is
  'UI-6 U6-1: keepsakes a learner has earned: FIRST_HARVEST (value 0), '
  'STREAK (7/30/100 days), GOLDEN_BLOOMS (10/50). Awarded lazily by '
  'GET /me/keepsakes; one row per kind + value.';

alter table public.user_keepsakes enable row level security;

create policy user_keepsakes_select_own on public.user_keepsakes
  for select to authenticated using (user_id = auth.uid());
create policy user_keepsakes_insert_own on public.user_keepsakes
  for insert to authenticated with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Profile columns (existing profiles_update_self policy covers them)
alter table public.profiles
  add column streak_freezes_available smallint not null default 2
    check (streak_freezes_available between 0 and 2),
  add column freezes_refilled_on date,
  add column english_variety text not null default 'en-US'
    check (english_variety in ('en-US', 'en-GB')),
  add column daily_goal_minutes smallint not null default 10
    check (daily_goal_minutes between 1 and 120);

comment on column public.profiles.streak_freezes_available is
  'UI-6: freezes left this week (0–2), refilled to 2 on Monday (local).';
comment on column public.profiles.freezes_refilled_on is
  'UI-6: local date (a Monday) of the last refill; null = never refilled.';
comment on column public.profiles.english_variety is
  'UI-6: learner''s English variety for spellings/audio: en-US or en-GB.';
comment on column public.profiles.daily_goal_minutes is
  'UI-6: daily goal in minutes shown on A4 / A8 (default 10).';

-- ---------------------------------------------------------------------------
-- Grants: signed-in users only, no delete, nothing for anon.
grant select, insert, update on public.daily_missions to authenticated;
grant select, insert on public.streak_freeze_uses to authenticated;
grant select, insert on public.user_keepsakes to authenticated;
revoke all on public.daily_missions, public.streak_freeze_uses, public.user_keepsakes from anon;
grant select, insert, update, delete on
  public.daily_missions, public.streak_freeze_uses, public.user_keepsakes
to service_role;
