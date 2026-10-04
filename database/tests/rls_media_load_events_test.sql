-- =============================================================================
-- RLS assertions for migrations/20261004_media_load_events.sql.
-- Run AFTER the schema, seeds/01_core_fixtures.sql and that migration, in a
-- throwaway database (./database/apply-migrations.sh --test does this).
-- One transaction, rolled back. Alex (3333…) and Priya (4444…) are learners.
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

grant execute on function assert_eq(bigint, bigint, text) to authenticated, anon;
grant execute on function assert_sqlstate(text, text, text) to authenticated, anon;
grant execute on function login_as(uuid) to authenticated, anon;

begin;

\echo ''
\echo '=== M1. Learners insert their own rows, user_id from auth.uid() ============'
set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
insert into public.media_load_events (kind, host, outcome, ms, from_cache, effective_type, country, city)
values ('word', 'media.dygoacademy.com', 'played', 180, false, '4g', 'VN', 'Hanoi'),
       ('speaking', 'media.dygoacademy.com', 'played', 12, true, null, 'VN', 'Hanoi');

\echo ''
\echo '=== M2. Nobody signed in can read, change or delete rows ==================='
select assert_sqlstate($$select count(*) from public.media_load_events$$, '42501', 'Alex: cannot read (not even own rows)');
select assert_sqlstate($$update public.media_load_events set ms = 0$$, '42501', 'Alex: cannot update');
select assert_sqlstate($$delete from public.media_load_events$$, '42501', 'Alex: cannot delete');
select login_as('44444444-4444-4444-4444-444444444444'); -- Priya
select assert_sqlstate(
  $$insert into public.media_load_events (user_id, kind, host, outcome, ms)
    values ('33333333-3333-3333-3333-333333333333', 'word', 'x', 'played', 1)$$,
  '42501', 'Priya: cannot insert a row for Alex');

\echo ''
\echo '=== M3. Constraints ========================================================='
select assert_sqlstate(
  $$insert into public.media_load_events (kind, host, outcome, ms) values ('video', 'x', 'played', 1)$$,
  '23514', 'kind must be word or speaking');
select assert_sqlstate(
  $$insert into public.media_load_events (kind, host, outcome, ms) values ('word', 'x', 'played', 999999)$$,
  '23514', 'ms capped at 120000');
select assert_sqlstate(
  $$insert into public.media_load_events (kind, host, outcome, ms) values ('word', 'x', 'slow', 1)$$,
  '23514', 'outcome must be played or error');
reset role;

\echo ''
\echo '=== M4. anon has nothing; the owner (service side) sees the rows ==========='
set role anon;
select assert_sqlstate(
  $$insert into public.media_load_events (kind, host, outcome, ms) values ('word', 'x', 'played', 1)$$,
  '42501', 'anon: cannot insert');
reset role;
select assert_eq(
  (select count(*) from public.media_load_events
    where user_id = '33333333-3333-3333-3333-333333333333' and country = 'VN'),
  2, 'service side: Alex''s 2 rows stored with user_id = auth.uid()');

\echo ''
\echo 'media_load_events RLS assertions: all passed.'
rollback;
