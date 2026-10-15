-- =============================================================================
-- Assertions for My words (migrations/20261015_my_words.sql): every learner
-- has a private personal group with one My words bed, at signup and by
-- backfill, and can add words and beds there without any shared group.
-- Run AFTER the schema, seeds/01_core_fixtures.sql and the migration
-- (apply-migrations.sh --test does this). Rolls back.
-- Fixture people (seeds/01_core_fixtures.sql): Alex (3333…).
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
\echo '=== M1. Backfill: one personal group and one My words bed each ============='
select assert_eq(
  (select count(*) from public.profiles p
    where (select count(*) from public.groups g where g.owner_id = p.id and g.is_personal) <> 1),
  0, 'every profile has exactly one personal group');
select assert_eq(
  (select count(*) from public.groups g
    where g.is_personal
      and (select count(*) from public.topics t where t.group_id = g.id and t.is_my_words) <> 1),
  0, 'every personal group has exactly one My words bed');
select assert_eq(
  (select count(*) from public.group_members gm
     join public.groups g on g.id = gm.group_id
    where g.is_personal and gm.user_id = g.owner_id and gm.role = 'ADMIN'),
  (select count(*) from public.groups where is_personal),
  'the owner is ADMIN of their personal group');
select assert_eq(
  (select count(*) from public.groups where is_personal and is_public), 0,
  'personal groups are private');

\echo ''
\echo '=== M2. Signup provisions My words =========================================='
insert into auth.users (id, email) values ('99999999-0000-0000-0000-000000000009', 'Solo@Dygo.test');
select assert_eq(
  (select count(*) from public.topics t join public.groups g on g.id = t.group_id
    where g.owner_id = '99999999-0000-0000-0000-000000000009' and g.is_personal and t.is_my_words
      and t.title = 'My words' and g.tenant_id = (select tenant_id from public.profiles
                                                  where id = '99999999-0000-0000-0000-000000000009')),
  1, 'new signup: My words bed in their own tenant');

\echo ''
\echo '=== M3. A solo learner can add words and beds without a shared group ========'
set role authenticated;
select login_as('99999999-0000-0000-0000-000000000009');
select assert_text(public.my_words_topic_id()::text,
  (select t.id::text from public.topics t join public.groups g on g.id = t.group_id
    where g.owner_id = '99999999-0000-0000-0000-000000000009' and t.is_my_words),
  'my_words_topic_id() is the caller''s bed');
insert into public.topic_words (topic_id, source_word, added_by)
values (public.my_words_topic_id(), 'serendipity', '99999999-0000-0000-0000-000000000009');
insert into public.topics (group_id, title) values (public.my_personal_group_id(), 'Kitchen words');
select assert_eq(
  (select count(*) from public.topics where group_id = public.my_personal_group_id()), 2,
  'solo learner: My words plus their new bed');
select assert_eq(
  (select count(*) from public.groups g
     join public.group_members gm on gm.group_id = g.id and gm.user_id = '99999999-0000-0000-0000-000000000009'
    where not g.is_personal), 0,
  'solo learner is in no shared group');
select assert_sqlstate(
  $$select public.provision_my_words('33333333-3333-3333-3333-333333333333')$$,
  '42501', 'provision_my_words() is not callable by clients');

\echo ''
\echo '=== M4. Other learners can''t see My words =================================='
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
select assert_eq(
  (select count(*) from public.topics t join public.groups g on g.id = t.group_id
    where g.owner_id = '99999999-0000-0000-0000-000000000009'), 0,
  'Alex sees none of the solo learner''s beds');
select assert_eq(
  (select count(*) from public.topic_words where source_word = 'serendipity'), 0,
  'Alex sees none of the solo learner''s words');

\echo ''
\echo '=== M5. A deleted My words bed comes back when needed ======================='
select login_as('99999999-0000-0000-0000-000000000009');
delete from public.topics where id = public.my_words_topic_id();
select assert_eq(
  (select count(*) from public.topics where group_id = public.my_personal_group_id() and is_my_words), 1,
  'My words is recreated on next use');
reset role;

\echo ''
\echo 'My words assertions: all passed.'
rollback;
