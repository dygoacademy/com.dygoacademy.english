-- =============================================================================
-- RLS assertions for the Phase 13 speaking entry points
-- (migrations/20261006_speaking_entry_points.sql): SPEAK missions (SE1),
-- speaking_harvests (SE5) and group_echo_challenge() (SE6). Runs after the
-- speaking migrations and the core fixtures; one transaction, rolled back.
-- Fixture people (seeds/01_core_fixtures.sql): Sarah (1111…) is ADMIN of
-- group bbbb…1 (4 members), Alex (3333…) and Priya (4444…) are READ members.
-- Alex missed "resilient" (topic word eeee…2, word dddd…2) 3 hours ago.
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

grant execute on function assert_eq(bigint, bigint, text) to authenticated, anon, service_role;
grant execute on function assert_sqlstate(text, text, text) to authenticated, anon, service_role;
grant execute on function login_as(uuid) to authenticated, anon;

begin;

\echo ''
\echo '=== E1. Shape ==============================================================='
select assert_eq(
  (select count(*) from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relrowsecurity
      and c.relname = 'speaking_harvests'),
  1, 'RLS enabled on speaking_harvests');
select assert_eq(
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'speaking_harvests'
      and cmd in ('UPDATE', 'DELETE', 'ALL')),
  0, 'speaking_harvests: no update / delete / all policies');

set role service_role;
insert into public.speaking_items
  (id, lexicon_id, sentence, target_index, audio_us_path, timings_us) values
  ('5a5a5a5a-0000-0000-0000-0000000000e2', 'dddddddd-0000-0000-0000-000000000002',
   'Small businesses proved remarkably resilient.', 4,
   'speaking/en/us/test-e2.wav', '{"duration": 2.1, "words": []}');
reset role;

\echo ''
\echo '=== E2. SE1: a learner can hold a SPEAK mission ============================'
set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
insert into public.daily_missions (user_id, local_date, type, target, progress)
  values ('33333333-3333-3333-3333-333333333333', '2026-10-07', 'SPEAK', 3, 0);
select assert_eq(
  (select count(*) from public.daily_missions where type = 'SPEAK'),
  1, 'Alex: SPEAK mission stored');
select assert_sqlstate(
  $$insert into public.daily_missions (user_id, local_date, type, target, progress)
    values ('33333333-3333-3333-3333-333333333333', '2026-10-07', 'SING', 1, 0)$$,
  '23514', 'unknown mission type rejected');

\echo ''
\echo '=== E3. SE5: harvests are the learner''s own, 90+ only, once per word ======='
insert into public.speaking_harvests (lexicon_id, score)
  values ('dddddddd-0000-0000-0000-000000000002', 94);
select assert_eq((select count(*) from public.speaking_harvests), 1, 'Alex: harvest saved');
select assert_sqlstate(
  $$insert into public.speaking_harvests (lexicon_id, score)
    values ('dddddddd-0000-0000-0000-000000000001', 80)$$,
  '23514', 'score below 90 rejected');
select assert_sqlstate(
  $$insert into public.speaking_harvests (lexicon_id, score)
    values ('dddddddd-0000-0000-0000-000000000002', 99)$$,
  '23505', 'one harvest per word');
select assert_sqlstate(
  $$insert into public.speaking_harvests (user_id, lexicon_id, score)
    values ('44444444-4444-4444-4444-444444444444', 'dddddddd-0000-0000-0000-000000000001', 95)$$,
  '42501', 'Alex cannot harvest for Priya');
select assert_sqlstate(
  $$update public.speaking_harvests set score = 100$$,
  '42501', 'no updates (no grant)');
select login_as('44444444-4444-4444-4444-444444444444'); -- Priya
select assert_eq((select count(*) from public.speaking_harvests), 0, 'Priya: sees no one else''s harvest');

\echo ''
\echo '=== E4. SE6: Echo challenge, ADMIN only, totals only ========================='
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex says it
insert into public.speaking_attempts (item_id, accent, score, stage, user_duration_ms)
  values ('5a5a5a5a-0000-0000-0000-0000000000e2', 'US', 80, 'bloom', 2000);
select assert_sqlstate(
  $$select * from public.group_echo_challenge('bbbbbbbb-0000-0000-0000-000000000001', now() - interval '7 days')$$,
  '42501', 'Alex (READ): no Echo totals');
select login_as('11111111-1111-1111-1111-111111111111'); -- Sarah, ADMIN
select assert_eq(
  (select count(*) from public.group_echo_challenge(
     'bbbbbbbb-0000-0000-0000-000000000001', now() - interval '7 days')),
  1, 'Sarah: one Echo word');
select assert_eq(
  (select count(*) from public.group_echo_challenge(
     'bbbbbbbb-0000-0000-0000-000000000001', now() - interval '7 days')
    where word = 'resilient' and topic_word_id = 'eeeeeeee-0000-0000-0000-000000000002'),
  1, 'Echo word is the missed word with a speaking item (resilient)');
select assert_eq(
  (select done_count from public.group_echo_challenge(
     'bbbbbbbb-0000-0000-0000-000000000001', now() - interval '7 days')),
  1, 'done_count: Alex said it');
select assert_eq(
  (select member_count from public.group_echo_challenge(
     'bbbbbbbb-0000-0000-0000-000000000001', now() - interval '7 days')),
  4, 'member_count: 4 gardeners');
select assert_eq(
  (select count(*) from pg_proc
    where proname = 'group_echo_challenge' and 'user_id' = any(proargnames)),
  0, 'returns no user_id');

reset role;
rollback;
