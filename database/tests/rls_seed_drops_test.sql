-- =============================================================================
-- RLS assertions for Seeds & Harvest Phase 2 (migrations/20261024_seed_drops.sql).
-- Run AFTER the schema, seeds/01_core_fixtures.sql and the migration
-- (apply-migrations.sh --test does this). Rolls back.
-- Fixture people (seeds/01_core_fixtures.sql): Alex (3333…) and Priya (4444…).
-- Lexicon dddd…03 "analyse" is in the public bed cccc…02 (topic word eeee…04).
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
\echo '=== D1. Shape: RLS on both tables, no learner delete ========================'
select assert_eq(
  (select count(*) from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relrowsecurity
      and c.relname in ('word_relations', 'seed_drops')),
  2, 'RLS enabled on word_relations and seed_drops');
select assert_eq(
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename in ('word_relations', 'seed_drops')
      and cmd in ('DELETE', 'INSERT', 'UPDATE') and tablename = 'word_relations'),
  0, 'learners cannot write word_relations');

-- Content: one reviewed relation, one draft.
insert into public.word_relations (lexicon_id, related_word, kind, rank, reviewed_at) values
  ('dddddddd-0000-0000-0000-000000000003', 'analysis', 'family', 1, now()),
  ('dddddddd-0000-0000-0000-000000000003', 'analyse the data', 'pairing', 1, null);

\echo ''
\echo '=== D2. anon sees nothing ===================================================='
set role anon;
select assert_sqlstate($$select count(*) from public.word_relations$$, '42501', 'anon: select word_relations');
select assert_sqlstate($$select count(*) from public.seed_drops$$, '42501', 'anon: select seed_drops');
reset role;

\echo ''
\echo '=== D3. Alex reads reviewed relations only, and keeps his own drops ========='
select login_as('33333333-3333-3333-3333-333333333333');
set role authenticated;
select assert_eq((select count(*) from public.word_relations), 1, 'Alex: sees only the reviewed relation');
select assert_sqlstate(
  $$insert into public.word_relations (lexicon_id, related_word, kind)
    values ('dddddddd-0000-0000-0000-000000000003', 'analyst', 'family')$$,
  '42501', 'Alex: cannot write relations');
insert into public.topic_words (topic_id, source_word, added_by)
values (public.my_words_topic_id(), 'analysis', '33333333-3333-3333-3333-333333333333');
insert into public.seed_drops (topic_word_id, bed_topic_id, dropped_by, kind)
select tw.id, 'cccccccc-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000004', 'family'
  from public.topic_words tw
 where tw.topic_id = public.my_words_topic_id() and tw.source_word = 'analysis';
update public.seed_drops set seen_at = now();
select assert_eq((select count(*) from public.seed_drops where seen_at is not null), 1, 'Alex: drop saved and seen');
select assert_sqlstate(
  $$insert into public.seed_drops (user_id, topic_word_id, bed_topic_id, dropped_by, kind)
    values ('44444444-4444-4444-4444-444444444444', 'eeeeeeee-0000-0000-0000-000000000004',
            'cccccccc-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000004', 'family')$$,
  '42501', 'Alex: cannot drop seeds for Priya');
select assert_sqlstate($$delete from public.seed_drops$$, '42501', 'Alex: cannot delete his drops');
reset role;

\echo ''
\echo '=== D4. Priya sees and changes none of it ===================================='
select login_as('44444444-4444-4444-4444-444444444444');
set role authenticated;
select assert_eq((select count(*) from public.seed_drops), 0, 'Priya: sees none of Alex''s drops');
update public.seed_drops set seen_at = null;
reset role;
select assert_eq(
  (select count(*) from public.seed_drops where seen_at is not null),
  1, 'Priya: her update touched none of Alex''s drops');

\echo ''
\echo 'Seeds & Harvest seed drops RLS assertions: all passed.'
rollback;
