-- =============================================================================
-- RLS assertions for A4 This week (migrations/20261017_weekly_missions.sql).
-- Run AFTER the schema, seeds/01_core_fixtures.sql and the migration
-- (apply-migrations.sh --test does this). Rolls back.
-- Fixture people (seeds/01_core_fixtures.sql): Alex (3333…) and Priya (4444…).
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
\echo '=== W1. Shape: RLS on, no delete policy, freezes allow 3 ======================'
select assert_eq(
  (select count(*) from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relrowsecurity
      and c.relname = 'weekly_missions'),
  1, 'RLS enabled on weekly_missions');
select assert_eq(
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'weekly_missions' and cmd = 'DELETE'),
  0, 'no delete policy');

\echo ''
\echo '=== W2. anon sees nothing ===================================================='
set role anon;
select assert_sqlstate($$select count(*) from public.weekly_missions$$, '42501', 'anon: select weekly_missions');
reset role;

\echo ''
\echo '=== W3. Alex keeps his own week =============================================='
select login_as('33333333-3333-3333-3333-333333333333');
set role authenticated;
insert into public.weekly_missions (week_start, sound, goals)
values ('2026-10-12', 'th_think', '{"rescue": 3, "sentence": 3, "sound": 5}');
update public.weekly_missions
   set rescued_word_ids = array_append(rescued_word_ids, 'eeeeeeee-0000-0000-0000-000000000002'::uuid)
 where week_start = '2026-10-12';
select assert_eq(
  (select coalesce(cardinality(rescued_word_ids), 0) from public.weekly_missions
    where user_id = '33333333-3333-3333-3333-333333333333'),
  1, 'Alex: rescued word saved');
update public.profiles set streak_freezes_available = 3
 where id = '33333333-3333-3333-3333-333333333333';
select assert_eq(
  (select streak_freezes_available from public.profiles
    where id = '33333333-3333-3333-3333-333333333333'),
  3, 'Alex: may hold 3 rain barrels');
select assert_sqlstate(
  $$update public.profiles set streak_freezes_available = 4
     where id = '33333333-3333-3333-3333-333333333333'$$,
  '23514', 'Alex: rain barrels capped at 3');
select assert_sqlstate(
  $$insert into public.weekly_missions (user_id, week_start, sound, goals)
    values ('44444444-4444-4444-4444-444444444444', '2026-10-12', 'th_think', '{}')$$,
  '42501', 'Alex: cannot create a week for Priya');
select assert_sqlstate(
  $$delete from public.weekly_missions where user_id = '33333333-3333-3333-3333-333333333333'$$,
  '42501', 'Alex: cannot delete his weeks');
reset role;

\echo ''
\echo '=== W4. Priya sees and changes none of it ===================================='
select login_as('44444444-4444-4444-4444-444444444444');
set role authenticated;
select assert_eq((select count(*) from public.weekly_missions), 0, 'Priya: sees no weeks of Alex');
update public.weekly_missions set rewarded_at = now();
reset role;
select assert_eq(
  (select count(*) from public.weekly_missions where rewarded_at is not null),
  0, 'Priya: her update touched none of Alex''s weeks');

\echo ''
\echo 'A4 weekly missions RLS assertions: all passed.'
rollback;
