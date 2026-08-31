-- =============================================================================
-- RLS verification suite. Every check raises an exception on failure, so the
-- script aborts loudly rather than printing a wrong number nobody reads.
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

create or replace function assert_denied(stmt text, label text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when insufficient_privilege or check_violation then
    raise notice '  pass: % (blocked: %)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % — statement was ALLOWED but should have been denied', label;
end $$;

-- Sets the request settings exactly as Supabase's PostgREST does, so this
-- suite exercises the real auth.uid() rather than a test-only shortcut.
create or replace function login_as(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, false);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, false);
end $$;

-- Run everything inside one transaction and roll back at the end, so the suite
-- leaves no residue and can be run repeatedly against the same database.
begin;

\echo ''
\echo '=== A. Cross-tenant isolation ==============================================='
set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333');   -- Alex, Oxford, READ
select assert_eq((select count(*) from groups), 2,
  'Alex sees his private group + the public one, NOT Rival Academy');
select assert_eq((select count(*) from groups where id='bbbbbbbb-0000-0000-0000-000000000003'), 0,
  'Alex cannot see the rival tenant group');
select assert_eq((select count(*) from topics where id='cccccccc-0000-0000-0000-000000000003'), 0,
  'Alex cannot see the rival tenant private topic');
select assert_eq((select count(*) from tenants), 1,
  'Alex sees only his own tenant');

reset role;
set role authenticated;
select login_as('55555555-5555-5555-5555-555555555555');   -- Dana, Rival, ADMIN
select assert_eq((select count(*) from topics where id='cccccccc-0000-0000-0000-000000000001'), 0,
  'Dana cannot see Oxford''s private topic');
select assert_eq((select count(*) from topic_words where source_word='ephemeral'), 0,
  'Dana cannot see words inside Oxford''s private topic');

\echo ''
\echo '=== B. Personal SRS isolation (FR-1.2) ======================================'
reset role;
set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333');   -- Alex
select assert_eq((select count(*) from user_word_srs), 2,
  'Alex sees exactly his own 2 SRS rows');
select assert_eq((select count(*) from user_word_srs
                  where user_id='44444444-4444-4444-4444-444444444444'), 0,
  'Alex cannot see Priya''s SRS rows for the same words');

reset role;
set role authenticated;
select login_as('44444444-4444-4444-4444-444444444444');   -- Priya
select assert_eq((select count(*) from user_word_srs), 2,
  'Priya sees exactly her own 2 SRS rows');
-- Compare in hundredths so the assertion is exact rather than rounded.
select assert_eq((select round(ease_factor::numeric * 100) from user_word_srs
                  where topic_word_id='eeeeeeee-0000-0000-0000-000000000002')::bigint, 280,
  'Priya''s ease_factor on ''resilient'' is hers (2.80), not Alex''s (1.40)');

reset role;
set role authenticated;
select login_as('11111111-1111-1111-1111-111111111111');   -- Sarah, ADMIN/tutor
select assert_eq((select count(*) from user_word_srs), 0,
  'Even the group ADMIN cannot read a student''s SRS state');
select assert_eq((select count(*) from review_logs), 0,
  'Even the group ADMIN cannot read a student''s review history');

\echo ''
\echo '=== C. Role hierarchy: ADMIN > WRITE > READ ================================='
reset role;
set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333');   -- Alex, READ
select assert_denied(
  $$insert into topic_words (topic_id, source_word, added_by)
    values ('cccccccc-0000-0000-0000-000000000001','forbidden',
            '33333333-3333-3333-3333-333333333333')$$,
  'READ member cannot add a word');
select assert_eq((select count(*) from group_members), 1,
  'READ member sees only their own membership, not the class roster');
select assert_eq((select count(*) from group_invites), 0,
  'READ member cannot read invite tokens');

reset role;
set role authenticated;
select login_as('22222222-2222-2222-2222-222222222222');   -- Marco, WRITE
select assert_eq((select count(*) from group_members), 4,
  'WRITE member (co-teacher) can see the full roster');
insert into topic_words (topic_id, source_word, added_by)
  values ('cccccccc-0000-0000-0000-000000000001','ubiquity',
          '22222222-2222-2222-2222-222222222222');
select assert_eq((select count(*) from topic_words where source_word='ubiquity'), 1,
  'WRITE member CAN add a word');
-- WRITE must not delete a topic (tech spec §4.1). A policy mismatch filters the
-- row out rather than erroring, so assert on rows affected.
with d as (delete from topics where id='cccccccc-0000-0000-0000-000000000001' returning 1)
  select assert_eq((select count(*) from d), 0,
    'WRITE member CANNOT delete the topic');
select assert_eq((select count(*) from group_invites), 0,
  'WRITE member cannot read invite tokens either');

reset role;
set role authenticated;
select login_as('11111111-1111-1111-1111-111111111111');   -- Sarah, ADMIN
select assert_eq((select count(*) from group_invites), 1,
  'ADMIN can read the invite token for her group');
-- 5, not 4: Sarah is ADMIN of BOTH the private class (4 members) and the
-- public AWL group (1 member, herself).
select assert_eq((select count(*) from group_members), 5,
  'ADMIN sees the rosters of every group she administers');

\echo ''
\echo '=== D. Anonymous / SEO surface (Phase 5 SSR) ================================'
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claims', '', false);
select assert_eq((select count(*) from topics), 1,
  'Anonymous visitor sees ONLY the public topic');
select assert_eq((select count(*) from topic_words), 1,
  'Anonymous visitor sees ONLY words in public topics');

\echo ''
\echo '=== E. Privilege escalation attempts ========================================'
reset role;
set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333');   -- Alex, READ
-- Try to promote self to ADMIN.
with u as (update group_members set role='ADMIN'
           where user_id='33333333-3333-3333-3333-333333333333' returning 1)
  select assert_eq((select count(*) from u), 0,
    'READ member cannot promote themselves to ADMIN');
-- Try to write an SRS row belonging to Priya.
select assert_denied(
  $$insert into user_word_srs (user_id, topic_word_id)
    values ('44444444-4444-4444-4444-444444444444',
            'eeeeeeee-0000-0000-0000-000000000004')$$,
  'Cannot forge an SRS row for another user');
-- Try to log a review as another user.
select assert_denied(
  $$insert into review_logs (user_id, topic_word_id, rating, was_correct)
    values ('44444444-4444-4444-4444-444444444444',
            'eeeeeeee-0000-0000-0000-000000000001','EASY',true)$$,
  'Cannot forge a review log for another user');

reset role;
rollback;

\echo ''
\echo '=== ALL RLS CHECKS PASSED =================================================='
