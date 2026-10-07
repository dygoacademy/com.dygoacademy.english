-- =============================================================================
-- RLS assertions for onboarding OB1–OB5 (migrations/20261008_onboarding.sql).
-- Run AFTER the schema, seeds/01_core_fixtures.sql and the migration, in a
-- throwaway database (apply-migrations.sh --test does this):
--
--   psql -d dygo_rls_scratch -f database/migrations/20261008_onboarding.sql
--   psql -d dygo_rls_scratch -f database/tests/rls_onboarding_test.sql
--
-- Every check raises on failure; the script runs in one transaction and
-- rolls back. Fixture people (seeds/01_core_fixtures.sql): Alex (3333…) and
-- Priya (4444…) are learners in the same tenant; Dana (5555…) is in another.
-- Topic cccc…0002 is public (AWL Sublist 1); cccc…0003 is Rival's private one.
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
\echo '=== O1. Backfill: every existing profile is onboarded ======================='
select assert_eq(
  (select count(*) from public.profiles where onboarded_at is null), 0,
  'no existing profile is left un-onboarded');
select assert_eq(
  (select count(*) from public.profiles where onboarded_at <> created_at), 0,
  'backfilled onboarded_at = created_at');
select assert_eq(
  (select count(*) from public.profiles
    where cefr_level is not null or study_goal is not null
       or target_band is not null or first_topic_id is not null), 0,
  'choices start empty');

\echo ''
\echo '=== O2. A new sign-up starts un-onboarded =================================='
insert into auth.users (id, email)
  values ('99999999-0000-0000-0000-00000000000b', 'new.learner@dygo.test');
select assert_text(
  (select coalesce(onboarded_at::text, 'null') from public.profiles
    where id = '99999999-0000-0000-0000-00000000000b'),
  'null', 'new profile: onboarded_at is null (garden home opens OB1)');

\echo ''
\echo '=== O3. anon cannot write ==================================================='
set role anon;
select assert_sqlstate(
  $$update public.profiles set onboarded_at = now()$$,
  '42501', 'anon: update profiles');
reset role;

\echo ''
\echo '=== O4. The owner saves their choices and finishes =========================='
set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
update public.profiles
   set onboarded_at = null, cefr_level = 'B2', study_goal = 'IELTS', target_band = 7.5,
       first_topic_id = 'cccccccc-0000-0000-0000-000000000002'
 where id = '33333333-3333-3333-3333-333333333333';
select assert_text(
  (select cefr_level || '/' || study_goal || '/' || target_band || '/' || first_topic_id
     from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  'B2/IELTS/7.5/cccccccc-0000-0000-0000-000000000002', 'Alex: own choices saved');
update public.profiles set study_goal = 'PTE', target_band = 65
 where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set study_goal = 'LIFE', target_band = null
 where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set onboarded_at = now()
 where id = '33333333-3333-3333-3333-333333333333';
select assert_eq(
  (select count(*) from public.profiles
    where id = '33333333-3333-3333-3333-333333333333' and onboarded_at is not null), 1,
  'Alex: finished onboarding');

\echo ''
\echo '=== O5. Constraints ========================================================='
select assert_sqlstate(
  $$update public.profiles set study_goal = 'TOEFL' where id = '33333333-3333-3333-3333-333333333333'$$,
  '23514', 'study_goal must be IELTS, PTE or LIFE');
select assert_sqlstate(
  $$update public.profiles set study_goal = 'IELTS', target_band = 9.5 where id = '33333333-3333-3333-3333-333333333333'$$,
  '23514', 'IELTS band above 9');
select assert_sqlstate(
  $$update public.profiles set study_goal = 'IELTS', target_band = 6.3 where id = '33333333-3333-3333-3333-333333333333'$$,
  '23514', 'IELTS band not a half band');
select assert_sqlstate(
  $$update public.profiles set study_goal = 'PTE', target_band = 65.5 where id = '33333333-3333-3333-3333-333333333333'$$,
  '23514', 'PTE score not a whole number');
select assert_sqlstate(
  $$update public.profiles set study_goal = 'PTE', target_band = 20 where id = '33333333-3333-3333-3333-333333333333'$$,
  '23514', 'PTE score below 30');
select assert_sqlstate(
  $$update public.profiles set study_goal = 'LIFE', target_band = 7 where id = '33333333-3333-3333-3333-333333333333'$$,
  '23514', 'LIFE has no target band');
select assert_sqlstate(
  $$update public.profiles set cefr_level = 'D1' where id = '33333333-3333-3333-3333-333333333333'$$,
  '22P02', 'cefr_level must be a CEFR level');
select assert_sqlstate(
  $$update public.profiles set first_topic_id = '12345678-0000-0000-0000-000000000000' where id = '33333333-3333-3333-3333-333333333333'$$,
  '23503', 'first_topic_id must be a real topic');

\echo ''
\echo '=== O6. Others cannot change Alex''s onboarding ============================='
select login_as('44444444-4444-4444-4444-444444444444'); -- Priya, same tenant
update public.profiles set onboarded_at = null, cefr_level = 'A2'
 where id = '33333333-3333-3333-3333-333333333333';
select login_as('55555555-5555-5555-5555-555555555555'); -- Dana, other tenant
update public.profiles set onboarded_at = null, cefr_level = 'A2'
 where id = '33333333-3333-3333-3333-333333333333';
select assert_eq(
  (select count(*) from public.profiles where id = '33333333-3333-3333-3333-333333333333'), 0,
  'Dana: cannot even see Alex''s profile');
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex again
select assert_text(
  (select cefr_level || '/' || (onboarded_at is not null) from public.profiles
    where id = '33333333-3333-3333-3333-333333333333'),
  'B2/true', 'Alex: Priya and Dana changed nothing');
reset role;

\echo ''
\echo '=== O7. Deleting the first topic clears it, not the profile ================='
update public.profiles set first_topic_id = 'cccccccc-0000-0000-0000-000000000003'
 where id = '55555555-5555-5555-5555-555555555555';
delete from public.topics where id = 'cccccccc-0000-0000-0000-000000000003';
select assert_text(
  (select coalesce(first_topic_id::text, 'null') from public.profiles
    where id = '55555555-5555-5555-5555-555555555555'),
  'null', 'first_topic_id set null when the topic goes');

\echo ''
\echo 'Onboarding OB1–OB5 RLS assertions: all passed.'
rollback;
