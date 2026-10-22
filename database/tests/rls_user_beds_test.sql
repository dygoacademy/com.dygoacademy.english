-- =============================================================================
-- RLS assertions for Seeds & Harvest Phase 1 (migrations/20261023_user_beds.sql).
-- Run AFTER the schema, seeds/01_core_fixtures.sql and the migration
-- (apply-migrations.sh --test does this). Rolls back.
-- Fixture people (seeds/01_core_fixtures.sql): Alex (3333…) and Priya (4444…).
-- Topics: cccc…02 public, cccc…03 a rival tenant's private bed.
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
grant execute on function assert_sqlstate(text, text, text) to authenticated, anon;
grant execute on function login_as(uuid) to authenticated, anon;

begin;

\echo ''
\echo '=== B1. Shape: RLS on, no delete policy ======================================'
select assert_eq(
  (select count(*) from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relrowsecurity
      and c.relname = 'user_beds'),
  1, 'RLS enabled on user_beds');
select assert_eq(
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'user_beds' and cmd = 'DELETE'),
  0, 'no delete policy');

\echo ''
\echo '=== B2. anon sees nothing ===================================================='
set role anon;
select assert_sqlstate($$select count(*) from public.user_beds$$, '42501', 'anon: select user_beds');
reset role;

\echo ''
\echo '=== B3. Alex plants and harvests his own beds ================================'
select login_as('33333333-3333-3333-3333-333333333333');
set role authenticated;
update public.user_beds set status = 'resting' where status = 'active';
insert into public.user_beds (topic_id) values ('cccccccc-0000-0000-0000-000000000002')
on conflict (user_id, topic_id) do update set status = 'active';
select assert_eq(
  (select count(*) from public.user_beds where status = 'active'),
  1, 'Alex: one active bed');
select assert_sqlstate(
  $$insert into public.user_beds (topic_id, status) values ('cccccccc-0000-0000-0000-000000000001', 'active')
    on conflict (user_id, topic_id) do update set status = 'active'$$,
  '23505', 'Alex: a second active bed is refused');
select assert_sqlstate(
  $$update public.user_beds set status = 'harvested' where topic_id = 'cccccccc-0000-0000-0000-000000000002'$$,
  '23514', 'Alex: harvested needs harvested_at');
update public.user_beds set status = 'harvested', harvested_at = now()
 where topic_id = 'cccccccc-0000-0000-0000-000000000002';
select assert_eq(
  (select count(*) from public.user_beds where status = 'harvested'),
  1, 'Alex: bed harvested');
select assert_sqlstate(
  $$insert into public.user_beds (topic_id) values ('cccccccc-0000-0000-0000-000000000003')$$,
  '42501', 'Alex: cannot plant a bed he cannot read');
select assert_sqlstate(
  $$insert into public.user_beds (user_id, topic_id)
    values ('44444444-4444-4444-4444-444444444444', 'cccccccc-0000-0000-0000-000000000002')$$,
  '42501', 'Alex: cannot plant a bed for Priya');
select assert_sqlstate(
  $$delete from public.user_beds$$,
  '42501', 'Alex: cannot delete his beds');
reset role;

\echo ''
\echo '=== B4. Priya sees and changes none of it ===================================='
select login_as('44444444-4444-4444-4444-444444444444');
set role authenticated;
select assert_eq(
  (select count(*) from public.user_beds where user_id = '33333333-3333-3333-3333-333333333333'),
  0, 'Priya: sees none of Alex''s beds');
update public.user_beds set status = 'resting'
 where user_id = '33333333-3333-3333-3333-333333333333';
reset role;
select assert_eq(
  (select count(*) from public.user_beds
    where user_id = '33333333-3333-3333-3333-333333333333' and status = 'harvested'),
  1, 'Priya: her update touched none of Alex''s beds');

\echo ''
\echo 'Seeds & Harvest user_beds RLS assertions: all passed.'
rollback;
