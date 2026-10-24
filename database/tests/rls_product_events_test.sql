-- =============================================================================
-- RLS assertions for Seeds & Harvest analytics (migrations/20261025_product_events.sql).
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
\echo '=== E1. A learner writes only their own events and reads none back ========'
select login_as('33333333-3333-3333-3333-333333333333');
set role authenticated;
insert into public.product_events (name, props) values ('packet_shown', '{"slot": "bee"}');
select assert_sqlstate($$select count(*) from public.product_events$$, '42501', 'Alex: cannot read events');
select assert_sqlstate(
  $$insert into public.product_events (user_id, name) values ('44444444-4444-4444-4444-444444444444', 'packet_shown')$$,
  '42501', 'Alex: cannot write an event for Priya');
select assert_sqlstate(
  $$insert into public.product_events (name) values ('something_else')$$,
  '23514', 'Alex: only the plan''s event names');
reset role;
select assert_eq((select count(*) from public.product_events), 1, 'one event stored');
select assert_eq((select events from public.product_events_daily where name = 'packet_shown'), 1, 'daily view counts it');

\echo ''
\echo '=== E2. anon writes nothing ================================================='
set role anon;
select assert_sqlstate($$insert into public.product_events (name) values ('packet_shown')$$, '42501', 'anon: insert');
reset role;

\echo ''
\echo 'Seeds & Harvest product_events RLS assertions: all passed.'
rollback;
