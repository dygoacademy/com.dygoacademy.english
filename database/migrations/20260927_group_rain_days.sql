-- UI-G RD-1 (docs/plans/phase 12 implementation plan.md, "UI-G follow-up: store rain
-- days"): keep a row for each group rain day, so GR1 / GR2 / GR3 can show
-- the banner ("3/5 done · you: 4/10") and "Last rain day" on live data.
--
-- Decided 2026-09-27:
--   * only words from the group's shared beds (topics.group_id) count;
--   * a rain day ends at the end of the local day (23:59) in the starting
--     ADMIN's profiles.timezone — one shared deadline for everyone;
--   * one rain day per group per local day;
--   * members see totals plus their own count, never anyone else's (FR-1.2).
--
-- Writes go only through start_group_rain_day / cancel_group_rain_day (no
-- insert/update/delete policies). Reads of the progress go through
-- group_rain_day_status, which, like 20260926_group_garden.sql:
--   1. re-checks the caller's membership (has_group_role) itself,
--   2. returns counts only: never a user_id, never a per-person row,
--   3. is `set search_path = public` and executable by `authenticated` only.

-- ---------------------------------------------------------------------------
-- Table
create table public.group_rain_days (
  id                 uuid primary key default gen_random_uuid(),
  group_id           uuid not null references public.groups(id) on delete cascade,
  created_by         uuid references public.profiles(id) on delete set null,
  words_per_gardener smallint not null check (words_per_gardener in (5, 10, 20)),
  message            text check (char_length(message) <= 200),
  starts_at          timestamptz not null default now(),
  ends_at            timestamptz not null,
  local_date         date not null,
  timezone           text not null,
  cancelled_at       timestamptz,
  created_at         timestamptz not null default now(),
  check (ends_at > starts_at)
);

comment on table public.group_rain_days is
  'UI-G RD-1: one row per group rain day (POST /notifications/groups/:id/sprint). '
  'ends_at is the end of local_date in the starting ADMIN''s timezone. '
  'Written only by start_group_rain_day / cancel_group_rain_day.';

-- One live rain day per group per local day; a cancelled one frees the day.
create unique index group_rain_days_one_per_day
  on public.group_rain_days (group_id, local_date) where cancelled_at is null;

-- Status lookups: current / last finished rain day of a group.
create index group_rain_days_group_ends
  on public.group_rain_days (group_id, ends_at desc);

alter table public.group_rain_days enable row level security;

create policy group_rain_days_select_member on public.group_rain_days
  for select using (public.has_group_role(group_id, 'READ'));
-- no insert/update/delete policies: writes only through the functions below

grant select on public.group_rain_days to authenticated;
revoke insert, update, delete on public.group_rain_days from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Start a rain day. ADMIN only (42501). local_date and ends_at come from the
-- caller's profiles.timezone ('UTC' if blank). A second live rain day for
-- the group — same local day, or one still running — raises 23505.
create or replace function public.start_group_rain_day(
  p_group_id uuid,
  p_words    smallint,
  p_message  text default null
)
returns public.group_rain_days
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_tz     text;
  v_date   date;
  v_row    public.group_rain_days;
begin
  if v_caller is null or not public.has_group_role(p_group_id, 'ADMIN') then
    raise exception 'Only a group ADMIN can start a rain day.' using errcode = '42501';
  end if;
  if p_words is null or p_words not in (5, 10, 20) then
    raise exception 'words_per_gardener must be 5, 10 or 20.' using errcode = '22023';
  end if;

  select coalesce(nullif(trim(p.timezone), ''), 'UTC') into v_tz
    from public.profiles p
   where p.id = v_caller;
  v_tz := coalesce(v_tz, 'UTC');
  v_date := (now() at time zone v_tz)::date;

  if exists (select 1 from public.group_rain_days r
              where r.group_id = p_group_id
                and r.cancelled_at is null
                and r.ends_at > now()) then
    raise exception 'A rain day is already running for this group.' using errcode = '23505';
  end if;

  -- The unique index is the real guard (23505) if two starts race.
  insert into public.group_rain_days
    (group_id, created_by, words_per_gardener, message,
     starts_at, ends_at, local_date, timezone)
  values
    (p_group_id, v_caller, p_words, nullif(trim(p_message), ''),
     now(), ((v_date + 1)::timestamp at time zone v_tz), v_date, v_tz)
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.start_group_rain_day(uuid, smallint, text) is
  'UI-G RD-1: ADMIN starts today''s rain day (5/10/20 words per gardener). '
  'Ends at midnight at the end of the caller''s local day. 42501 not ADMIN, '
  '22023 bad word count, 23505 one already running today.';

-- ---------------------------------------------------------------------------
-- Cancel the running rain day. ADMIN only (42501). Returns true if a row was
-- cancelled, false if nothing was running.
create or replace function public.cancel_group_rain_day(p_group_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or not public.has_group_role(p_group_id, 'ADMIN') then
    raise exception 'Only a group ADMIN can cancel a rain day.' using errcode = '42501';
  end if;

  update public.group_rain_days r
     set cancelled_at = now()
   where r.group_id = p_group_id
     and r.cancelled_at is null
     and r.ends_at > now();
  get diagnostics v_count = row_count;

  return v_count > 0;
end;
$$;

comment on function public.cancel_group_rain_day(uuid) is
  'UI-G RD-1: ADMIN cancels the group''s running rain day (sets cancelled_at, '
  'which frees the day for a new one). true if one was cancelled. 42501 not ADMIN.';

-- ---------------------------------------------------------------------------
-- GR1 / GR2 / GR3: the current rain day and the last finished one (up to two
-- rows, newest first), with totals and the caller's own count. READ members
-- only (42501).
--   gardeners = current member count
--   done      = members who watered >= words_per_gardener distinct words of
--               the group's shared beds between starts_at and ends_at
--   mine      = distinct group words the caller watered in that window
-- Never returns a user id.
create or replace function public.group_rain_day_status(p_group_id uuid)
returns table (
  id                 uuid,
  words_per_gardener smallint,
  starts_at          timestamptz,
  ends_at            timestamptz,
  is_current         boolean,
  gardeners          bigint,
  done               bigint,
  mine               bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null or not public.has_group_role(p_group_id, 'READ') then
    raise exception 'Only members can see a group rain day.' using errcode = '42501';
  end if;

  return query
    with days as (
      (select r.id, r.words_per_gardener, r.starts_at, r.ends_at
         from public.group_rain_days r
        where r.group_id = p_group_id
          and r.cancelled_at is null
          and r.starts_at <= now()
          and r.ends_at > now()
        order by r.starts_at desc
        limit 1)
      union all
      (select r.id, r.words_per_gardener, r.starts_at, r.ends_at
         from public.group_rain_days r
        where r.group_id = p_group_id
          and r.cancelled_at is null
          and r.ends_at <= now()
        order by r.ends_at desc
        limit 1)
    ),
    -- distinct group words each current member watered in each rain day
    watered as (
      select d.id as day_id, rl.user_id, count(distinct rl.topic_word_id) as words
        from days d
        join public.review_logs rl
          on rl.reviewed_at >= d.starts_at and rl.reviewed_at < d.ends_at
        join public.topic_words tw on tw.id = rl.topic_word_id
        join public.topics t on t.id = tw.topic_id
        join public.group_members gm on gm.group_id = t.group_id and gm.user_id = rl.user_id
       where t.group_id = p_group_id
       group by d.id, rl.user_id
    )
    select d.id,
           d.words_per_gardener,
           d.starts_at,
           d.ends_at,
           (d.ends_at > now()) as is_current,
           (select count(*) from public.group_members gm where gm.group_id = p_group_id),
           (select count(*) from watered w
             where w.day_id = d.id and w.words >= d.words_per_gardener),
           coalesce((select w.words from watered w
                      where w.day_id = d.id and w.user_id = v_caller), 0)
      from days d
     order by d.starts_at desc;
end;
$$;

comment on function public.group_rain_day_status(uuid) is
  'UI-G RD-1: current and last finished rain day of a group with gardeners, '
  'done (members who reached the target) and mine (caller''s own distinct '
  'words). Members only (42501). Totals only, never a user_id (FR-1.2).';

-- Execute: signed-in users only (not anon).
revoke all on function public.start_group_rain_day(uuid, smallint, text) from public;
revoke all on function public.cancel_group_rain_day(uuid) from public;
revoke all on function public.group_rain_day_status(uuid) from public;
grant execute on function public.start_group_rain_day(uuid, smallint, text) to authenticated;
grant execute on function public.cancel_group_rain_day(uuid) to authenticated;
grant execute on function public.group_rain_day_status(uuid) to authenticated;
