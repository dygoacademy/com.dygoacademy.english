-- =============================================================================
-- RLS assertions for Phase 13 (migrations/20261004_speaking.sql, then
-- 20261004_speaking_per_word.sql: one item per word, no topic_id).
-- Run AFTER the schema and seeds/01_core_fixtures.sql, in a throwaway
-- database:
--
--   psql -d dygo_rls_scratch -f database/migrations/20261004_speaking.sql
--   psql -d dygo_rls_scratch -f database/migrations/20261004_speaking_per_word.sql
--   psql -d dygo_rls_scratch -f database/tests/rls_speaking_test.sql
--
-- Every check raises on failure; the script runs in one transaction and
-- rolls back. Fixture people (seeds/01_core_fixtures.sql): Sarah (1111…) is
-- the group ADMIN, Alex (3333…) and Priya (4444…) are learners in the same
-- tenant; Dana (5555…) is in another. Words dddd…1 ephemeral, dddd…2
-- resilient, dddd…3 analyse.
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

grant execute on function assert_eq(bigint, bigint, text) to authenticated, anon, service_role;
grant execute on function assert_sqlstate(text, text, text) to authenticated, anon, service_role;
grant execute on function login_as(uuid) to authenticated, anon;

begin;

\echo ''
\echo '=== S1. Shape: RLS on, policies, indexes ===================================='
select assert_eq(
  (select count(*) from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relrowsecurity
      and c.relname in ('speaking_items', 'speaking_attempts')),
  2, 'RLS enabled on both tables');
select assert_eq(
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'speaking_items'),
  1, 'speaking_items: one policy (select)');
select assert_eq(
  (select count(*) from pg_policies
    where schemaname = 'public' and cmd in ('UPDATE', 'DELETE', 'ALL')
      and tablename in ('speaking_items', 'speaking_attempts')),
  0, 'no update / delete / all policies');
select assert_eq(
  (select count(*) from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_speaking_attempts_user_item_created'),
  1, 'index speaking_attempts(user_id, item_id, created_at desc)');
select assert_eq(
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'speaking_items' and column_name = 'topic_id'),
  0, 'speaking_items has no topic_id (items belong to the word)');
select assert_eq(
  (select count(*) from pg_constraint
    where conname = 'speaking_items_one_per_word' and contype = 'u'),
  1, 'unique (lexicon_id)');

\echo ''
\echo '=== S2. The content script (service_role) writes items ======================'
set role service_role;
insert into public.speaking_items
  (id, lexicon_id, sentence, target_index, audio_us_path, timings_us) values
  ('5a5a5a5a-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001',
   'Fame in the digital age is often ephemeral.', 6,
   'speaking/en/us/test-1.wav',
   '{"duration": 2.4, "words": [{"text": "Fame", "start": 0.05, "end": 0.3, "syllables": []}]}'),
  ('5a5a5a5a-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002',
   'Small businesses proved remarkably resilient.', 4,
   'speaking/en/us/test-2.wav',
   '{"duration": 2.1, "words": []}');
update public.speaking_items set audio_uk_path = 'speaking/en/uk/test-2.wav',
  timings_uk = '{"duration": 2.2, "words": []}'
 where id = '5a5a5a5a-0000-0000-0000-000000000002';
select assert_eq((select count(*) from public.speaking_items), 2, 'service_role: 2 items');

\echo ''
\echo '=== S3. Item constraints ===================================================='
select assert_sqlstate(
  $$insert into public.speaking_items (lexicon_id, sentence, target_index, audio_us_path, timings_us)
    values ('dddddddd-0000-0000-0000-000000000001',
            'Another sentence.', 0, 'k', '{"duration": 1, "words": []}')$$,
  '23505', 'one item per word');
select assert_sqlstate(
  $$insert into public.speaking_items (lexicon_id, sentence, target_index, audio_us_path, timings_us)
    values ('dddddddd-0000-0000-0000-000000000003',
            'Analyse this.', -1, 'k', '{"duration": 1, "words": []}')$$,
  '23514', 'target_index must be >= 0');
select assert_sqlstate(
  $$insert into public.speaking_items (lexicon_id, sentence, target_index, audio_us_path)
    values ('dddddddd-0000-0000-0000-000000000003',
            'Analyse this.', 0, 'k')$$,
  '23514', 'audio path needs timings');
select assert_sqlstate(
  $$insert into public.speaking_items (lexicon_id, sentence, target_index)
    values ('dddddddd-0000-0000-0000-000000000003',
            'Analyse this.', 0)$$,
  '23514', 'item needs at least one accent');
select assert_sqlstate(
  $$insert into public.speaking_items (lexicon_id, sentence, target_index, audio_us_path, timings_us)
    values ('dddddddd-0000-0000-0000-000000000003',
            'Analyse this.', 0, 'k', '{"words": []}')$$,
  '23514', 'timings need a numeric duration');
reset role;

\echo ''
\echo '=== S4. anon sees and writes nothing ========================================'
set role anon;
select assert_sqlstate($$select count(*) from public.speaking_items$$, '42501', 'anon: select speaking_items');
select assert_sqlstate($$select count(*) from public.speaking_attempts$$, '42501', 'anon: select speaking_attempts');
select assert_sqlstate(
  $$insert into public.speaking_attempts (user_id, item_id, accent, score, stage, user_duration_ms)
    values ('33333333-3333-3333-3333-333333333333', '5a5a5a5a-0000-0000-0000-000000000001', 'US', 50, 'sprout', 2000)$$,
  '42501', 'anon: insert an attempt');
reset role;

\echo ''
\echo '=== S5. Every signed-in user reads items; nobody signed in writes them ======='
set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
select assert_eq((select count(*) from public.speaking_items), 2, 'Alex: reads both items');
select login_as('55555555-5555-5555-5555-555555555555'); -- Dana, other tenant
select assert_eq((select count(*) from public.speaking_items), 2, 'Dana: items are global content');
select login_as('11111111-1111-1111-1111-111111111111'); -- Sarah, group ADMIN
select assert_sqlstate(
  $$insert into public.speaking_items (lexicon_id, sentence, target_index, audio_us_path, timings_us)
    values ('dddddddd-0000-0000-0000-000000000003',
            'Analyse this.', 0, 'k', '{"duration": 1, "words": []}')$$,
  '42501', 'Sarah (group ADMIN): insert an item');
select assert_sqlstate(
  $$update public.speaking_items set sentence = 'Changed.'$$,
  '42501', 'Sarah: update an item');
select assert_sqlstate(
  $$delete from public.speaking_items$$,
  '42501', 'Sarah: delete an item');
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
select assert_sqlstate(
  $$update public.speaking_items set sentence = 'Changed.'$$,
  '42501', 'Alex: update an item');

\echo ''
\echo '=== S6. Owner writes and reads own attempts ================================='
-- user_id left out: it defaults to auth.uid().
insert into public.speaking_attempts (item_id, accent, score, stage, word_marks, user_duration_ms) values
  ('5a5a5a5a-0000-0000-0000-000000000001', 'US', 62, 'sprout',
   '[{"index": 6, "ok": false, "reason": "stress_soft"}]', 2600),
  ('5a5a5a5a-0000-0000-0000-000000000001', 'US', 84, 'bloom', '[]', 2450),
  ('5a5a5a5a-0000-0000-0000-000000000002', 'UK', 91, 'fruit', '[]', 2200);
select assert_eq((select count(*) from public.speaking_attempts), 3, 'Alex: 3 attempts (Try again stores both)');
select assert_eq(
  (select count(*) from public.speaking_attempts
    where user_id = '33333333-3333-3333-3333-333333333333'),
  3, 'Alex: user_id defaulted to auth.uid()');

\echo ''
\echo '=== S7. Attempt constraints ================================================='
select assert_sqlstate(
  $$insert into public.speaking_attempts (item_id, accent, score, stage, user_duration_ms)
    values ('5a5a5a5a-0000-0000-0000-000000000001', 'AU', 50, 'sprout', 2000)$$,
  '23514', 'accent must be UK or US');
select assert_sqlstate(
  $$insert into public.speaking_attempts (item_id, accent, score, stage, user_duration_ms)
    values ('5a5a5a5a-0000-0000-0000-000000000001', 'US', 101, 'fruit', 2000)$$,
  '23514', 'score 0-100');
select assert_sqlstate(
  $$insert into public.speaking_attempts (item_id, accent, score, stage, user_duration_ms)
    values ('5a5a5a5a-0000-0000-0000-000000000001', 'US', 50, 'tree', 2000)$$,
  '23514', 'stage seed/sprout/bloom/fruit');
select assert_sqlstate(
  $$insert into public.speaking_attempts (item_id, accent, score, stage, word_marks, user_duration_ms)
    values ('5a5a5a5a-0000-0000-0000-000000000001', 'US', 50, 'sprout', '{}', 2000)$$,
  '23514', 'word_marks must be an array');
select assert_sqlstate(
  $$insert into public.speaking_attempts (item_id, accent, score, stage, user_duration_ms)
    values ('5a5a5a5a-0000-0000-0000-000000000001', 'US', 50, 'sprout', -1)$$,
  '23514', 'user_duration_ms >= 0');

\echo ''
\echo '=== S8. Non-owners see and change nothing ==================================='
select login_as('44444444-4444-4444-4444-444444444444'); -- Priya, same tenant
select assert_eq((select count(*) from public.speaking_attempts), 0, 'Priya: cannot read Alex''s attempts');
select assert_sqlstate(
  $$insert into public.speaking_attempts (user_id, item_id, accent, score, stage, user_duration_ms)
    values ('33333333-3333-3333-3333-333333333333', '5a5a5a5a-0000-0000-0000-000000000001', 'US', 10, 'seed', 900)$$,
  '42501', 'Priya: insert an attempt for Alex');
select assert_sqlstate(
  $$update public.speaking_attempts set score = 0$$,
  '42501', 'Priya: update attempts (no grant)');
select assert_sqlstate(
  $$delete from public.speaking_attempts$$,
  '42501', 'Priya: delete attempts (no grant)');
select login_as('11111111-1111-1111-1111-111111111111'); -- Sarah, Alex's teacher
select assert_eq((select count(*) from public.speaking_attempts), 0, 'Sarah (teacher): cannot read Alex''s attempts');
select login_as('55555555-5555-5555-5555-555555555555'); -- Dana, other tenant
select assert_eq((select count(*) from public.speaking_attempts), 0, 'Dana: cannot read Alex''s attempts');
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
select assert_sqlstate(
  $$update public.speaking_attempts set score = 100$$,
  '42501', 'Alex: cannot edit own attempts (history)');
select assert_sqlstate(
  $$delete from public.speaking_attempts$$,
  '42501', 'Alex: cannot delete own attempts (history)');
select assert_eq((select max(score) from public.speaking_attempts), 91, 'Alex: attempts unchanged');
reset role;

\echo ''
\echo 'Phase 13 speaking RLS assertions: all passed.'
rollback;
