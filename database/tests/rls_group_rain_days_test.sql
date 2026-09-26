-- =============================================================================
-- RLS / privacy assertions for UI-G RD-1 (migrations/20260927_group_rain_days.sql).
-- Run AFTER the schema, migrations/ and seeds/01_core_fixtures.sql, in a
-- throwaway database:
--
--   psql -d dygo_rls_scratch -f database/migrations/20260927_group_rain_days.sql
--   psql -d dygo_rls_scratch -f database/tests/rls_group_rain_days_test.sql
--
-- Every check raises on failure; the script runs in one transaction and
-- rolls back (so now() is one fixed instant throughout). Fixture people
-- (seeds/01_core_fixtures.sql), group "IELTS Band 8.0 Masterclass"
-- (bbbbbbbb-…01): Sarah ADMIN, Marco WRITE, Alex READ, Priya READ. Dana is
-- in another tenant and not a member.
-- =============================================================================
\set ON_ERROR_STOP on

create or replace function assert_eq(actual bigint, expected bigint, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % — expected %, got %', label, expected, actual;
  end if;
  raise notice '  pass: % (%)', label, actual;
end $$;

create or replace function assert_text(actual text, expected text, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % — expected %, got %', label, expected, actual;
  end if;
  raise notice '  pass: % (%)', label, actual;
end $$;

-- Passes only if stmt raises with the given SQLSTATE.
create or replace function assert_sqlstate(stmt text, expected_state text, label text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = expected_state then
      raise notice '  pass: % (raised %: %)', label, sqlstate, sqlerrm;
      return;
    end if;
    raise exception 'FAIL: % — expected SQLSTATE %, got % (%)', label, expected_state, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % — statement succeeded but should have raised %', label, expected_state;
end $$;

create or replace function login_as(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, false);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, false);
end $$;

grant execute on function assert_eq(bigint, bigint, text) to authenticated, anon;
grant execute on function assert_text(text, text, text) to authenticated, anon;
grant execute on function assert_sqlstate(text, text, text) to authenticated, anon;
grant execute on function login_as(uuid) to authenticated, anon;

begin;

-- Test data (as the owner, rolled back): Sarah's time zone, three more words
-- in the group's shared bed (6 in all), one word in a bed of another group.
update public.profiles set timezone = 'Asia/Singapore'
 where id = '11111111-1111-1111-1111-111111111111';
insert into public.topic_words (id, topic_id, source_word, added_by) values
  ('eeeeeeee-0000-0000-0000-0000000000a1', 'cccccccc-0000-0000-0000-000000000001', 'candid',   '11111111-1111-1111-1111-111111111111'),
  ('eeeeeeee-0000-0000-0000-0000000000a2', 'cccccccc-0000-0000-0000-000000000001', 'diligent', '11111111-1111-1111-1111-111111111111'),
  ('eeeeeeee-0000-0000-0000-0000000000a3', 'cccccccc-0000-0000-0000-000000000001', 'frugal',   '11111111-1111-1111-1111-111111111111');

\echo ''
\echo '=== R1. Shape: no user ids out of status, all SECURITY DEFINER ==============='
select assert_eq(
  (select count(*) from pg_proc p
    where p.proname = 'group_rain_day_status'
      and p.pronamespace = 'public'::regnamespace
      and exists (select 1 from unnest(coalesce(p.proargnames, '{}')) a
                   where a in ('user_id', 'created_by', 'email'))),
  0, 'group_rain_day_status has no user_id / created_by / email column');
select assert_eq(
  (select count(*) from pg_proc p
    where p.proname in ('start_group_rain_day', 'cancel_group_rain_day', 'group_rain_day_status')
      and p.pronamespace = 'public'::regnamespace and p.prosecdef),
  3, 'all three are SECURITY DEFINER with their own checks');
select assert_eq(
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'group_rain_days' and cmd <> 'SELECT'),
  0, 'no insert/update/delete policies on group_rain_days');

\echo ''
\echo '=== R2. anon cannot call them ================================================'
set role anon;
select assert_sqlstate(
  $$select * from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001')$$,
  '42501', 'anon: group_rain_day_status');
select assert_sqlstate(
  $$select public.start_group_rain_day('bbbbbbbb-0000-0000-0000-000000000001', 10::smallint, null)$$,
  '42501', 'anon: start_group_rain_day');
reset role;

\echo ''
\echo '=== R3. READ and WRITE members cannot start or cancel ======================='
set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex, READ
select assert_sqlstate(
  $$select public.start_group_rain_day('bbbbbbbb-0000-0000-0000-000000000001', 10::smallint, null)$$,
  '42501', 'Alex (READ): start raises 42501');
select assert_sqlstate(
  $$select public.cancel_group_rain_day('bbbbbbbb-0000-0000-0000-000000000001')$$,
  '42501', 'Alex (READ): cancel raises 42501');
select assert_sqlstate(
  $$insert into public.group_rain_days (group_id, words_per_gardener, ends_at, local_date, timezone)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 10, now() + interval '1 hour', current_date, 'UTC')$$,
  '42501', 'Alex (READ): direct insert blocked');
select login_as('22222222-2222-2222-2222-222222222222'); -- Marco, WRITE
select assert_sqlstate(
  $$select public.start_group_rain_day('bbbbbbbb-0000-0000-0000-000000000001', 10::smallint, null)$$,
  '42501', 'Marco (WRITE): start raises 42501');
select assert_eq(
  (select count(*) from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001')),
  0, 'Marco: no rain day yet');

\echo ''
\echo '=== R4. ADMIN starts one; a second the same day fails; cancel + restart ====='
select login_as('11111111-1111-1111-1111-111111111111'); -- Sarah, ADMIN
select assert_sqlstate(
  $$select public.start_group_rain_day('bbbbbbbb-0000-0000-0000-000000000001', 7::smallint, null)$$,
  '22023', 'Sarah: 7 words per gardener is refused');
select assert_text(
  (select (r).timezone from (select public.start_group_rain_day(
     'bbbbbbbb-0000-0000-0000-000000000001', 10::smallint, 'Rain day! 10 words each') as r) s),
  'Asia/Singapore', 'Sarah: rain day started in her time zone');
select assert_text(
  (select local_date::text from public.group_rain_days
    where group_id = 'bbbbbbbb-0000-0000-0000-000000000001' and cancelled_at is null),
  ((now() at time zone 'Asia/Singapore')::date)::text, 'local_date is today in Singapore');
select assert_eq(
  (select count(*) from public.group_rain_days
    where group_id = 'bbbbbbbb-0000-0000-0000-000000000001' and cancelled_at is null
      and ends_at = (((now() at time zone 'Asia/Singapore')::date + 1)::timestamp at time zone 'Asia/Singapore')),
  1, 'ends_at is the end of that local day (Singapore midnight)');
select assert_sqlstate(
  $$select public.start_group_rain_day('bbbbbbbb-0000-0000-0000-000000000001', 5::smallint, null)$$,
  '23505', 'Sarah: a second rain day the same day raises 23505');
select assert_text(
  public.cancel_group_rain_day('bbbbbbbb-0000-0000-0000-000000000001')::text,
  'true', 'Sarah: cancel today''s rain day');
select assert_text(
  public.cancel_group_rain_day('bbbbbbbb-0000-0000-0000-000000000001')::text,
  'false', 'Sarah: nothing left to cancel');
select assert_eq(
  (select count(*) from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001')),
  0, 'a cancelled rain day is not reported');
select assert_eq(
  (select words_per_gardener from public.start_group_rain_day(
     'bbbbbbbb-0000-0000-0000-000000000001', 5::smallint, null)),
  5, 'Sarah: starting again after cancel works (5 words)');

\echo ''
\echo '=== R5. Non-members see nothing ============================================='
select login_as('55555555-5555-5555-5555-555555555555'); -- Dana
select assert_eq(
  (select count(*) from public.group_rain_days where group_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  0, 'Dana: no group_rain_days rows');
select assert_sqlstate(
  $$select * from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001')$$,
  '42501', 'Dana: status raises 42501');
select assert_sqlstate(
  $$select public.start_group_rain_day('bbbbbbbb-0000-0000-0000-000000000001', 10::smallint, null)$$,
  '42501', 'Dana: start raises 42501');

\echo ''
\echo '=== R6. Progress: totals + own count only ===================================='
reset role;
-- Reviews during the rain day (now() is fixed inside this transaction).
-- Alex: 5 distinct group words (one twice) + a word of another group's bed.
-- Priya: 1 group word. Alex's seeded review 3 hours ago is before the start.
insert into public.review_logs (user_id, topic_word_id, rating, was_correct, reviewed_at) values
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-000000000001', 'GOOD', true,  now()),
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-000000000001', 'GOOD', true,  now()),
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-000000000002', 'HARD', true,  now()),
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-0000000000a1', 'GOOD', true,  now()),
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-0000000000a2', 'AGAIN', false, now()),
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-0000000000a3', 'EASY', true,  now()),
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-0000-0000-0000-000000000004', 'GOOD', true,  now()),
  ('44444444-4444-4444-4444-444444444444', 'eeeeeeee-0000-0000-0000-000000000002', 'GOOD', true,  now());
-- A finished rain day yesterday (inserted as the owner), no reviews in it.
insert into public.group_rain_days
  (group_id, created_by, words_per_gardener, starts_at, ends_at, local_date, timezone)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 20,
   now() - interval '30 hours', now() - interval '20 hours', current_date - 1, 'UTC');

set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex, READ
select assert_eq(
  (select count(*) from public.group_rain_days where group_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  3, 'Alex (READ): can select the group''s rain-day rows (incl. the cancelled one)');
select assert_eq(
  (select count(*) from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001')),
  2, 'Alex: status has the current and the last finished rain day');
select assert_eq(
  (select count(*) from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001') where is_current),
  1, 'Alex: exactly one is current');
select assert_eq(
  (select gardeners from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001') where is_current),
  4, 'Alex: 4 gardeners');
select assert_eq(
  (select done from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001') where is_current),
  1, 'Alex: 1 gardener reached 5 words (a count, not who)');
select assert_eq(
  (select mine from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001') where is_current),
  5, 'Alex: mine = 5 distinct group words (repeat and other group''s word not counted)');
select assert_eq(
  (select words_per_gardener from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001') where not is_current),
  20, 'Alex: last finished rain day was 20 words');
select assert_eq(
  (select done + mine from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001') where not is_current),
  0, 'Alex: nobody watered in yesterday''s window');

select login_as('44444444-4444-4444-4444-444444444444'); -- Priya, READ
select assert_eq(
  (select mine from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001') where is_current),
  1, 'Priya: mine = 1 (her own reviews only)');
select assert_eq(
  (select done from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001') where is_current),
  1, 'Priya: same total (1 done)');
select login_as('11111111-1111-1111-1111-111111111111'); -- Sarah
select assert_eq(
  (select mine from public.group_rain_day_status('bbbbbbbb-0000-0000-0000-000000000001') where is_current),
  0, 'Sarah: mine = 0');
reset role;

\echo ''
\echo 'UI-G RD-1 group rain days RLS assertions: all passed.'
rollback;
