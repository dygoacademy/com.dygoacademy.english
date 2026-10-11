-- =============================================================================
-- Assertions for migrations/20261011_pronunciation_pollinate.sql: a word said
-- at 80 %+ is pollinated (D-3, 2026-10-11). Runs after the speaking entry
-- points migration and its test (helpers assert_eq / assert_sqlstate /
-- login_as come from there); one transaction, rolled back.
-- Alex (3333…) can read "resilient" (word dddd…2) from the core fixtures.
-- =============================================================================
\set ON_ERROR_STOP on

begin;

\echo ''
\echo '=== P1. Pollinated at 80+, still once per word, still the learner''s own ===='
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
set local role authenticated;
insert into public.speaking_harvests (lexicon_id, score)
  values ('dddddddd-0000-0000-0000-000000000002', 80);
select assert_eq((select count(*) from public.speaking_harvests), 1, 'Alex: 80 pollinates');
select assert_sqlstate(
  $$insert into public.speaking_harvests (lexicon_id, score)
    values ('dddddddd-0000-0000-0000-000000000001', 79)$$,
  '23514', 'score below 80 rejected');
select assert_sqlstate(
  $$insert into public.speaking_harvests (lexicon_id, score)
    values ('dddddddd-0000-0000-0000-000000000002', 95)$$,
  '23505', 'one row per word');

reset role;
rollback;
