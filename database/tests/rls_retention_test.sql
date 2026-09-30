-- =============================================================================
-- RLS assertions for UI-6 U6-1 (migrations/20261001_retention.sql).
-- Run AFTER the schema, migrations/ and seeds/01_core_fixtures.sql, in a
-- throwaway database:
--
--   psql -d dygo_rls_scratch -f database/migrations/20261001_retention.sql
--   psql -d dygo_rls_scratch -f database/tests/rls_retention_test.sql
--
-- Every check raises on failure; the script runs in one transaction and
-- rolls back. Fixture people (seeds/01_core_fixtures.sql): Alex (3333…) and
-- Priya (4444…) are learners in the same tenant; Dana (5555…) is in another.
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

\echo ''
\echo '=== T1. Shape: RLS on, no delete policies, profile defaults ================='
select assert_eq(
  (select count(*) from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relrowsecurity
      and c.relname in ('daily_missions', 'streak_freeze_uses', 'user_keepsakes')),
  3, 'RLS enabled on all three tables');
select assert_eq(
  (select count(*) from pg_policies
    where schemaname = 'public' and cmd = 'DELETE'
      and tablename in ('daily_missions', 'streak_freeze_uses', 'user_keepsakes')),
  0, 'no delete policies');
select assert_text(
  (select streak_freezes_available || '/' || english_variety || '/' || daily_goal_minutes
     || '/' || coalesce(freezes_refilled_on::text, 'null')
     from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  '2/en-US/10/null', 'profile defaults: 2 freezes, en-US, 10 minutes, never refilled');

\echo ''
\echo '=== T2. anon sees and writes nothing ========================================='
set role anon;
select assert_sqlstate($$select count(*) from public.daily_missions$$, '42501', 'anon: select daily_missions');
select assert_sqlstate($$select count(*) from public.streak_freeze_uses$$, '42501', 'anon: select streak_freeze_uses');
select assert_sqlstate($$select count(*) from public.user_keepsakes$$, '42501', 'anon: select user_keepsakes');
reset role;

\echo ''
\echo '=== T3. Owner writes and reads own rows ======================================'
set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
insert into public.daily_missions (user_id, local_date, type, target) values
  ('33333333-3333-3333-3333-333333333333', current_date, 'REVIEW_DUE', 4),
  ('33333333-3333-3333-3333-333333333333', current_date, 'LEARN_NEW', 5),
  ('33333333-3333-3333-3333-333333333333', current_date, 'QUIZ', 1);
update public.daily_missions set progress = 1, completed_at = now()
 where user_id = '33333333-3333-3333-3333-333333333333' and type = 'QUIZ';
insert into public.streak_freeze_uses (user_id, local_date)
  values ('33333333-3333-3333-3333-333333333333', current_date - 2);
insert into public.user_keepsakes (user_id, kind, value)
  values ('33333333-3333-3333-3333-333333333333', 'STREAK', 7);
update public.profiles set english_variety = 'en-GB', daily_goal_minutes = 15
 where id = '33333333-3333-3333-3333-333333333333';
select assert_eq((select count(*) from public.daily_missions), 3, 'Alex: 3 missions today');
select assert_eq((select count(*) from public.daily_missions where completed_at is not null), 1, 'Alex: QUIZ completed');
select assert_eq((select count(*) from public.streak_freeze_uses), 1, 'Alex: 1 freeze use');
select assert_eq((select count(*) from public.user_keepsakes), 1, 'Alex: 1 keepsake');
select assert_text(
  (select english_variety || '/' || daily_goal_minutes from public.profiles
    where id = '33333333-3333-3333-3333-333333333333'),
  'en-GB/15', 'Alex: own prefs updated');

\echo ''
\echo '=== T4. Constraints ========================================================='
select assert_sqlstate(
  $$insert into public.daily_missions (user_id, local_date, type, target)
    values ('33333333-3333-3333-3333-333333333333', current_date, 'QUIZ', 1)$$,
  '23505', 'Alex: second QUIZ mission the same day');
select assert_sqlstate(
  $$insert into public.daily_missions (user_id, local_date, type, target)
    values ('33333333-3333-3333-3333-333333333333', current_date, 'DANCE', 1)$$,
  '23514', 'Alex: unknown mission type');
select assert_sqlstate(
  $$insert into public.streak_freeze_uses (user_id, local_date)
    values ('33333333-3333-3333-3333-333333333333', current_date - 2)$$,
  '23505', 'Alex: two freezes on one day');
select assert_sqlstate(
  $$insert into public.user_keepsakes (user_id, kind, value)
    values ('33333333-3333-3333-3333-333333333333', 'STREAK', 7)$$,
  '23505', 'Alex: same keepsake twice');
select assert_sqlstate(
  $$update public.profiles set english_variety = 'en-AU'
     where id = '33333333-3333-3333-3333-333333333333'$$,
  '23514', 'Alex: english_variety must be en-US or en-GB');
select assert_sqlstate(
  $$update public.profiles set streak_freezes_available = 9
     where id = '33333333-3333-3333-3333-333333333333'$$,
  '23514', 'Alex: freezes capped at 2');

\echo ''
\echo '=== T5. Non-owners see nothing ============================================='
select login_as('44444444-4444-4444-4444-444444444444'); -- Priya, same tenant
select assert_eq((select count(*) from public.daily_missions), 0, 'Priya: no missions visible');
select assert_eq((select count(*) from public.streak_freeze_uses), 0, 'Priya: no freeze uses visible');
select assert_eq((select count(*) from public.user_keepsakes), 0, 'Priya: no keepsakes visible');
select login_as('55555555-5555-5555-5555-555555555555'); -- Dana, other tenant
select assert_eq(
  (select (select count(*) from public.daily_missions)
        + (select count(*) from public.streak_freeze_uses)
        + (select count(*) from public.user_keepsakes)),
  0, 'Dana: nothing visible in any table');

\echo ''
\echo '=== T6. Non-owners cannot write others'' rows ================================'
select login_as('44444444-4444-4444-4444-444444444444'); -- Priya
select assert_sqlstate(
  $$insert into public.daily_missions (user_id, local_date, type, target)
    values ('33333333-3333-3333-3333-333333333333', current_date + 1, 'QUIZ', 1)$$,
  '42501', 'Priya: insert a mission for Alex');
select assert_sqlstate(
  $$insert into public.streak_freeze_uses (user_id, local_date)
    values ('33333333-3333-3333-3333-333333333333', current_date - 1)$$,
  '42501', 'Priya: insert a freeze use for Alex');
select assert_sqlstate(
  $$insert into public.user_keepsakes (user_id, kind, value)
    values ('33333333-3333-3333-3333-333333333333', 'STREAK', 30)$$,
  '42501', 'Priya: insert a keepsake for Alex');
update public.daily_missions set progress = 99
 where user_id = '33333333-3333-3333-3333-333333333333';
update public.profiles set daily_goal_minutes = 60
 where id = '33333333-3333-3333-3333-333333333333';
select assert_sqlstate(
  $$delete from public.daily_missions where user_id = '33333333-3333-3333-3333-333333333333'$$,
  '42501', 'Priya: delete (no grant)');
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex again
-- Priya owns no mission rows, so this re-own attempt must fail the check.
select assert_sqlstate(
  $$update public.daily_missions set user_id = '44444444-4444-4444-4444-444444444444'
     where type = 'QUIZ'$$,
  '42501', 'Alex: cannot hand a mission row to Priya');
select assert_eq(
  (select max(progress) from public.daily_missions), 1,
  'Alex: Priya''s update touched none of his missions');
select assert_eq(
  (select daily_goal_minutes from public.profiles
    where id = '33333333-3333-3333-3333-333333333333'),
  15, 'Alex: Priya could not change his daily goal');
select assert_sqlstate(
  $$delete from public.user_keepsakes where user_id = '33333333-3333-3333-3333-333333333333'$$,
  '42501', 'Alex: cannot delete own keepsakes (history)');
reset role;

\echo ''
\echo 'UI-6 U6-1 retention RLS assertions: all passed.'
rollback;
