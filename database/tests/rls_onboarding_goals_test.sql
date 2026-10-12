-- =============================================================================
-- Assertions for onboarding in 2 steps (migrations/20261012_onboarding_goals.sql):
-- the new goals, IELTS General bands, and the first bed picked from the goal
-- (the PATCH /profiles/me/onboarding query, run as the learner under RLS).
-- Run AFTER the schema, seeds/01_core_fixtures.sql, 20261008_onboarding.sql
-- and the migration (apply-migrations.sh --test does this). Rolls back.
-- Fixture people (seeds/01_core_fixtures.sql): Alex (3333…). Topic cccc…0002
-- is public (AWL Sublist 1).
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
\echo '=== G1. New goals and IELTS General bands ==================================='
set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
update public.profiles set study_goal = 'IELTS_GENERAL', target_band = 6.5
 where id = '33333333-3333-3333-3333-333333333333';
select assert_text(
  (select study_goal || '/' || target_band from public.profiles
    where id = '33333333-3333-3333-3333-333333333333'),
  'IELTS_GENERAL/6.5', 'Alex: IELTS General with a half band');
update public.profiles set study_goal = 'WORK', target_band = null
 where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set study_goal = 'TRAVEL', target_band = null
 where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set study_goal = 'PTE', target_band = 65
 where id = '33333333-3333-3333-3333-333333333333';
select assert_text(
  (select study_goal || '/' || target_band from public.profiles
    where id = '33333333-3333-3333-3333-333333333333'),
  'PTE/65.0', 'Alex: PTE rows stay valid');
select assert_sqlstate(
  $$update public.profiles set study_goal = 'TOEFL', target_band = null where id = '33333333-3333-3333-3333-333333333333'$$,
  '23514', 'unknown goal rejected');
select assert_sqlstate(
  $$update public.profiles set study_goal = 'IELTS_GENERAL', target_band = 9.5 where id = '33333333-3333-3333-3333-333333333333'$$,
  '23514', 'IELTS General band above 9');
select assert_sqlstate(
  $$update public.profiles set study_goal = 'WORK', target_band = 7 where id = '33333333-3333-3333-3333-333333333333'$$,
  '23514', 'WORK has no target band');

\echo ''
\echo '=== G2. First bed picked from the goal (only when empty) ===================='
update public.profiles set first_topic_id = null
 where id = '33333333-3333-3333-3333-333333333333';
-- Same statement as PICK_FIRST_BED in profiles.service.ts.
update public.profiles p
   set first_topic_id = (
         select t.id
           from public.topics t
           join public.topic_words tw on tw.topic_id = t.id
          where t.is_public
          group by t.id
          order by (t.title ~* '\mtravel') desc, count(tw.id) desc, t.created_at
          limit 1),
       updated_at = now()
 where p.id = '33333333-3333-3333-3333-333333333333' and p.first_topic_id is null;
select assert_eq(
  (select count(*) from public.profiles p
     join public.topics t on t.id = p.first_topic_id
    where p.id = '33333333-3333-3333-3333-333333333333' and t.is_public), 1,
  'Alex: a public topic with words was picked');
update public.profiles set first_topic_id = 'cccccccc-0000-0000-0000-000000000002'
 where id = '33333333-3333-3333-3333-333333333333';
update public.profiles p
   set first_topic_id = null
 where p.id = '33333333-3333-3333-3333-333333333333' and p.first_topic_id is null;
select assert_text(
  (select first_topic_id::text from public.profiles
    where id = '33333333-3333-3333-3333-333333333333'),
  'cccccccc-0000-0000-0000-000000000002', 'Alex: a bed already set is left alone');
reset role;

\echo ''
\echo 'Onboarding goals (2 steps) assertions: all passed.'
rollback;
