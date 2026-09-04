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

-- Like assert_denied, but for application-level rejections raised on purpose
-- (redeem_group_invite's "expired" / "revoked" / "not found" checks) rather
-- than an RLS policy or CHECK constraint. Catches WHEN OTHERS deliberately —
-- these are plain `raise exception`, not a fixed Postgres error class.
create or replace function assert_raises(stmt text, label text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice '  pass: % (raised: %)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % — statement succeeded but should have raised', label;
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

\echo ''
\echo '=== E. Self-service group creation ==========================================='
-- Regression test for trg_group_owner_membership (001_initial_schema.sql).
-- groups_insert only requires owner_id = auth.uid(); without the trigger, a
-- brand-new group has zero group_members rows, and group_members_insert_admin
-- requires has_group_role(group_id, 'ADMIN') to add one — a deadlock that
-- would let a user create a group and then never be able to manage it, add a
-- topic to it, or add classmates to it. 004_seed_data.sql never exercised
-- this because its fixtures are inserted as service_role, which bypasses RLS.
reset role;
set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333');   -- Alex, READ everywhere else
with g as (
  insert into groups (owner_id, tenant_id, name, is_public)
  values ('33333333-3333-3333-3333-333333333333',
          public.current_user_tenant_id(), 'Alex''s Study Group', false)
  returning id
)
select assert_eq(
  (select count(*) from group_members gm join g on g.id = gm.group_id
    where gm.user_id = '33333333-3333-3333-3333-333333333333' and gm.role = 'ADMIN'),
  1,
  'Creating a group immediately seats the owner as ADMIN (trg_group_owner_membership)');
-- ADMIN outranks WRITE (group_role_rank), so the newly-seated owner should be
-- able to add a topic to their own brand-new group in the same session —
-- proof the deadlock is actually broken, not just that a row exists.
select assert_eq(
  (select count(*) from topics
    where group_id = (select id from groups where name = 'Alex''s Study Group')),
  0,
  'sanity: no topic yet');
insert into topics (group_id, title, is_public)
  values ((select id from groups where name = 'Alex''s Study Group'), 'First Topic', false);
select assert_eq(
  (select count(*) from topics
    where group_id = (select id from groups where name = 'Alex''s Study Group')),
  1,
  'Owner of a self-created group can add a topic to it without any other setup');

\echo ''
\echo '=== F. Invite redemption (redeem_group_invite, 005) ========================='
-- Dana (Rival tenant) holds no membership in Sarah's Oxford group — the
-- cross-tenant boundary from §A. She is exactly the caller the function
-- exists for: someone RLS would otherwise hide the group from entirely.
reset role;
set role authenticated;
select login_as('55555555-5555-5555-5555-555555555555');   -- Dana, Rival tenant
select assert_eq(
  (select count(*) from group_members
    where group_id = 'bbbbbbbb-0000-0000-0000-000000000001'
      and user_id  = '55555555-5555-5555-5555-555555555555'),
  0, 'sanity: Dana is not yet a member of Sarah''s group');

select assert_eq(
  (select count(*) from public.redeem_group_invite('dygo-dev-invite-token')
    where group_id = 'bbbbbbbb-0000-0000-0000-000000000001'
      and granted_role = 'READ' and already_member = false),
  1, 'Dana redeems the seeded invite and is seated READ, not already a member');
select assert_eq(
  (select count(*) from group_members
    where group_id = 'bbbbbbbb-0000-0000-0000-000000000001'
      and user_id  = '55555555-5555-5555-5555-555555555555' and role = 'READ'),
  1, 'Redemption actually wrote the group_members row RLS was hiding the group behind');
select assert_eq(
  (select use_count from group_invites
    where token_hash = public.hash_invite_token('dygo-dev-invite-token')),
  21, 'use_count incremented from the seeded 20');

-- Replaying the same token must not double-count or error — a learner who
-- clicks the link twice (double-tap, page refresh) should not burn a
-- second use of a max_uses-limited invite for a join that already happened.
select assert_eq(
  (select count(*) from public.redeem_group_invite('dygo-dev-invite-token')
    where already_member = true),
  1, 'Replaying an already-redeemed invite reports already_member, not an error');
select assert_eq(
  (select use_count from group_invites
    where token_hash = public.hash_invite_token('dygo-dev-invite-token')),
  21, 'Replaying a redeemed invite does not increment use_count a second time');

select assert_raises(
  $$select * from public.redeem_group_invite('this-token-does-not-exist')$$,
  'Unknown token is rejected, not silently ignored');

-- Revoked and expired invites must be rejected even though the token is
-- otherwise valid — the exact two states the frontend "Create a group"
-- turn's invite-link screen needs to distinguish from a live link.
-- group_invites_insert_admin requires both has_group_role(..., 'ADMIN') AND
-- created_by = auth.uid(), so these fixtures must be created as Sarah (the
-- group's ADMIN), not as Dana — Dana only comes back for the redeem attempt.
reset role;
set role authenticated;
select login_as('11111111-1111-1111-1111-111111111111');   -- Sarah, ADMIN
insert into group_invites (group_id, created_by, token_hash, grant_role, revoked_at)
  values ('bbbbbbbb-0000-0000-0000-000000000001',
          '11111111-1111-1111-1111-111111111111',
          public.hash_invite_token('revoked-test-token'), 'READ', now());
insert into group_invites (group_id, created_by, token_hash, grant_role, expires_at)
  values ('bbbbbbbb-0000-0000-0000-000000000001',
          '11111111-1111-1111-1111-111111111111',
          public.hash_invite_token('expired-test-token'), 'READ', now() - interval '1 hour');

reset role;
set role authenticated;
select login_as('55555555-5555-5555-5555-555555555555');   -- Dana, still not a member
select assert_raises(
  $$select * from public.redeem_group_invite('revoked-test-token')$$,
  'A revoked invite cannot be redeemed even with the right token');
select assert_raises(
  $$select * from public.redeem_group_invite('expired-test-token')$$,
  'An expired invite cannot be redeemed even before revocation catches up to it');

\echo ''
\echo '=== G. Solo-user tenant provisioning (006) =================================='
-- Regression test for handle_new_auth_user() (006_solo_tenant_provisioning.sql).
-- Runs as postgres (superuser), matching how 004_seed_data.sql itself
-- inserts into auth.users — application traffic never does this directly,
-- GoTrue does, but the trigger fires identically either way.
reset role;
insert into auth.users (id, email) values
  ('99999999-9999-9999-9999-999999999999', 'newkid@example.com');
select assert_eq(
  (select count(*) from public.profiles
    where id = '99999999-9999-9999-9999-999999999999' and tenant_id is not null),
  1, 'A brand-new signup gets a non-null tenant_id, not the old bare-profile row');
select assert_eq(
  (select count(*) from public.tenants t
     join public.profiles p on p.tenant_id = t.id
    where p.id = '99999999-9999-9999-9999-999999999999'
      and t.purchased_seats = 0 and t.price_per_seat_cents = 0),
  1, 'The auto-provisioned personal tenant is unpaid (0 seats) — free until Phase 4 billing upgrades it');

-- The new user can now do what the standing gap this migration fixes used
-- to make impossible: create their first group at all.
set role authenticated;
select login_as('99999999-9999-9999-9999-999999999999');
with g as (
  insert into groups (owner_id, tenant_id, name, is_public)
  values ('99999999-9999-9999-9999-999999999999',
          public.current_user_tenant_id(), 'New Kid''s First Group', false)
  returning id
)
select assert_eq(
  (select count(*) from group_members gm join g on g.id = gm.group_id
    where gm.user_id = '99999999-9999-9999-9999-999999999999' and gm.role = 'ADMIN'),
  1,
  'A brand-new solo signup can now create a group and gets seated ADMIN — the original bug, fixed');

\echo ''
\echo '=== H. Cohort mistake heatmap (007, FR-8.2) =================================='
-- Sarah's private class (bbbbbbbb-...0001) has 3 seeded review_logs rows,
-- all under topic cccccccc-...0001: Alex AGAIN on 'resilient' (a failure),
-- Alex GOOD on 'ephemeral', Priya EASY on 'resilient'. See 004_seed_data.sql.
reset role;
set role authenticated;
select login_as('22222222-2222-2222-2222-222222222222');   -- Marco, WRITE — not ADMIN
select assert_raises(
  $$select * from public.group_word_heatmap('bbbbbbbb-0000-0000-0000-000000000001')$$,
  'A WRITE (non-ADMIN) member cannot read the group heatmap, even though they can read the roster');

reset role;
set role authenticated;
select login_as('11111111-1111-1111-1111-111111111111');   -- Sarah, ADMIN
select assert_eq(
  (select count(*) from public.group_word_heatmap('bbbbbbbb-0000-0000-0000-000000000001')),
  2, 'ADMIN sees both distinct words with review activity in her group (ephemeral, resilient)');
select assert_eq(
  (select sum(attempts) from public.group_word_heatmap('bbbbbbbb-0000-0000-0000-000000000001'))::bigint,
  3, 'Total attempts across the heatmap matches the 3 seeded review_logs rows for this group');
select assert_eq(
  (select failures from public.group_word_heatmap('bbbbbbbb-0000-0000-0000-000000000001')
    where source_word = 'resilient'),
  1, '''resilient'' shows exactly 1 failure — Alex''s AGAIN — not Priya''s EASY too');
-- The function's RETURNS TABLE signature (declared in 007_group_word_heatmap.sql)
-- has no user_id/reviewed_at column at all — by construction, not by a
-- runtime check, there is no row shape this function could return that
-- identifies which student made which mistake. review_logs_select_own's
-- per-student isolation is preserved even though ADMIN can now see the
-- cohort total.

\echo ''
\echo '=== I. Roster visibility for invite-redeemed members (008) ==================='
-- Regression test for the standing "roster shows no name for an
-- invite-redeemed member" gap (open since the 6th pass, precisely
-- diagnosed by 006, actually fixed by 008). Reuses section G's brand-new
-- signup ('99999999-...') — a genuinely fresh account with its OWN
-- personal tenant, distinct from Sarah's Oxford tenant, which is exactly
-- the case the old tenant-equality check could never pass.
reset role;
set role authenticated;
select login_as('11111111-1111-1111-1111-111111111111');   -- Sarah, ADMIN of bbbbbbbb-...0001
with i as (
  insert into group_invites (group_id, created_by, token_hash, grant_role, expires_at)
  values ('bbbbbbbb-0000-0000-0000-000000000001',
          '11111111-1111-1111-1111-111111111111',
          public.hash_invite_token('newkid-test-token'), 'READ', now() + interval '1 day')
  returning id
)
select assert_eq((select count(*) from i), 1, 'Sarah can mint an invite for her own group');

reset role;
set role authenticated;
select login_as('99999999-9999-9999-9999-999999999999');   -- new kid, own personal tenant
select assert_eq(
  (select count(*) from public.redeem_group_invite('newkid-test-token')
    where group_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  1, 'New kid redeems Sarah''s invite and joins her group despite having a different tenant');

reset role;
set role authenticated;
select login_as('11111111-1111-1111-1111-111111111111');   -- Sarah again, reading her roster
select assert_eq(
  (select count(*) from public.group_members gm
     join public.profiles p on p.id = gm.user_id
    where gm.group_id = 'bbbbbbbb-0000-0000-0000-000000000001'
      and gm.user_id = '99999999-9999-9999-9999-999999999999'
      and p.email = 'newkid@example.com'),
  1,
  'The exact bug: before 008, this inner join returned 0 rows (profiles side '
  'filtered out by tenant mismatch) even though the group_members row existed — '
  'GroupsService''s left join rendered a blank name. Now Sarah sees the real email.');

reset role;
set role authenticated;
select login_as('55555555-5555-5555-5555-555555555555');   -- Dana, Rival Academy ADMIN — shares no group
select assert_eq(
  (select count(*) from public.profiles where id = '99999999-9999-9999-9999-999999999999'),
  0,
  'Isolation still holds: Dana shares no group and no tenant with new kid, so '
  'shares_group_with() is false and the profile stays invisible to her');

reset role;

\echo ''
\echo '=== J. Tenant-admin read expansion (009) ====================================='
-- Regression test for the gap found while wireframing turn 12 (17th pass):
-- is_tenant_admin() already let a tenant admin see that a sibling group in
-- their tenant existed (groups_select), but not read its topics, words, or
-- roster. 009 closes that. Uses a brand-new group inserted inside this
-- transaction rather than touching 004's seed data, so it can't perturb any
-- of the exact-count assertions elsewhere in this file (section A's
-- `count(*) from groups = 2` for Alex, etc.) — this whole section rolls
-- back with everything else.
set role authenticated;
select login_as('22222222-2222-2222-2222-222222222222');   -- Marco, WRITE in 0001, not ADMIN anywhere yet
with g as (
  insert into public.groups (id, tenant_id, owner_id, name, is_public)
  values ('bbbbbbbb-0000-0000-0000-000000000009',
          'aaaaaaaa-0000-0000-0000-000000000001',           -- Oxford, same tenant as Sarah
          '22222222-2222-2222-2222-222222222222', 'Marco''s New Section', false)
  returning id
)
select assert_eq((select count(*) from g), 1,
  'Marco creates a brand-new private Oxford group Sarah is not a member of '
  '(trg_group_owner_membership seats Marco himself as its ADMIN)');

insert into public.topics (id, group_id, title, is_public)
values ('cccccccc-0000-0000-0000-000000000009',
        'bbbbbbbb-0000-0000-0000-000000000009', 'Marco-only topic', false);

reset role;
set role authenticated;
select login_as('11111111-1111-1111-1111-111111111111');   -- Sarah — ADMIN elsewhere in Oxford, NOT a member of Marco's new group
select assert_eq(
  (select count(*) from public.group_members
    where group_id = 'bbbbbbbb-0000-0000-0000-000000000009'),
  1,
  'Before 009 this was 0 (group_members_select had no is_tenant_admin branch) — '
  'Sarah now sees Marco''s roster in a group she never joined, via tenant-admin reach only');
select assert_eq(
  (select count(*) from public.topics where id = 'cccccccc-0000-0000-0000-000000000009'), 1,
  'Before 009 this was 0 (can_read_group had no is_tenant_admin branch, so '
  'topics_select/can_read_topic could not see it either) — now visible tenant-wide');
select assert_eq(
  (select count(*) from public.groups where id = 'bbbbbbbb-0000-0000-0000-000000000009'), 1,
  'Sanity check: groups_select already granted this before 009 (unchanged by this migration)');

reset role;
set role authenticated;
select login_as('55555555-5555-5555-5555-555555555555');   -- Dana, Rival Academy ADMIN — different tenant entirely
select assert_eq(
  (select count(*) from public.group_members
    where group_id = 'bbbbbbbb-0000-0000-0000-000000000009'),
  0,
  'Cross-tenant isolation still holds: is_tenant_admin(Oxford) is false for Dana, '
  'so 009''s wider grant does not leak across the tenant boundary');

reset role;

\echo ''
\echo '=== K. Tenant-wide mistake heatmap (010, FR-8.2 "across cohorts") ============'
-- Regression test for tenant_word_heatmap() (010_tenant_word_heatmap.sql),
-- the 19th pass's widening of section H's group-scoped heatmap. Reuses
-- section H's own known baseline (Sarah's ieltsClass group: 2 distinct
-- words, 3 attempts, 1 failure on 'resilient') as the "before" state, then
-- adds a second Oxford group with its own review activity to prove the
-- function genuinely aggregates ACROSS groups rather than just re-serving
-- one group's numbers under a new name — the entire point of "across
-- cohorts" that section H's single-group function cannot do.
set role authenticated;
select login_as('11111111-1111-1111-1111-111111111111');   -- Sarah, ADMIN of ieltsClass, tenant admin of Oxford
select assert_eq(
  (select count(*) from public.tenant_word_heatmap('aaaaaaaa-0000-0000-0000-000000000001')),
  2, 'Before adding a second group''s activity, the tenant-wide total matches section H''s single-group baseline exactly (only ieltsClass has review activity so far)');
select assert_eq(
  (select sum(attempts) from public.tenant_word_heatmap('aaaaaaaa-0000-0000-0000-000000000001'))::bigint,
  3, 'Baseline attempts also match section H''s 3 seeded review_logs rows');

-- Sarah opens a brand-new second Oxford group and logs review activity in
-- it. She is already tenant admin via ieltsClass, so this does not change
-- *why* she can read the rollup — only *what* the rollup now contains.
with g as (
  insert into public.groups (id, tenant_id, owner_id, name, is_public)
  values ('bbbbbbbb-0000-0000-0000-00000000000a',
          'aaaaaaaa-0000-0000-0000-000000000001', -- Oxford, same tenant as ieltsClass
          '11111111-1111-1111-1111-111111111111', 'Sarah''s Evening Section', false)
  returning id
)
select assert_eq((select count(*) from g), 1,
  'Sarah opens a second, separate Oxford class');

insert into public.topics (id, group_id, title, is_public) values
  ('cccccccc-0000-0000-0000-00000000000a',
   'bbbbbbbb-0000-0000-0000-00000000000a', 'Evening Unit 1', false);
-- No explicit status: defaults to ENRICHING. topic_words_ready_requires_lexicon
-- would reject a bare READY with no lexicon_id, and the heatmap function
-- doesn't care about enrichment status — it only needs a review_logs row
-- pointing at a real topic_word.
insert into public.topic_words (id, topic_id, source_word) values
  ('eeeeeeee-0000-0000-0000-00000000000a',
   'cccccccc-0000-0000-0000-00000000000a', 'tenacious');
insert into public.review_logs (user_id, topic_word_id, rating, was_correct) values
  ('11111111-1111-1111-1111-111111111111',
   'eeeeeeee-0000-0000-0000-00000000000a', 'AGAIN', false);

select assert_eq(
  (select count(*) from public.tenant_word_heatmap('aaaaaaaa-0000-0000-0000-000000000001')),
  3, 'The new word from the second group now appears alongside ieltsClass''s two — proof this is a real cross-group aggregate, not group_word_heatmap(ieltsClass) reused under a new name');
select assert_eq(
  (select sum(attempts) from public.tenant_word_heatmap('aaaaaaaa-0000-0000-0000-000000000001'))::bigint,
  4, 'Total attempts: the 3 seeded ieltsClass rows plus this section''s 1 new row');
select assert_eq(
  (select group_id from public.tenant_word_heatmap('aaaaaaaa-0000-0000-0000-000000000001')
    where source_word = 'tenacious'),
  'bbbbbbbb-0000-0000-0000-00000000000a',
  'Each row is attributed to the group it actually happened in, not to whichever group the caller is ADMIN of first — the exact thing a multi-class rollup needs and a single-group function cannot express');
select assert_eq(
  (select group_name from public.tenant_word_heatmap('aaaaaaaa-0000-0000-0000-000000000001')
    where source_word = 'resilient'),
  'IELTS Band 8.0 Masterclass',
  'The pre-existing ieltsClass row still carries its own group''s name, unaffected by the new group being added');

reset role;
set role authenticated;
select login_as('22222222-2222-2222-2222-222222222222');   -- Marco, WRITE in ieltsClass only, ADMIN nowhere
select assert_raises(
  $$select * from public.tenant_word_heatmap('aaaaaaaa-0000-0000-0000-000000000001')$$,
  'WRITE-in-one-group is not tenant admin — same ADMIN-only gate as the single-group heatmap (section H), now enforced tenant-wide');

reset role;
set role authenticated;
select login_as('55555555-5555-5555-5555-555555555555');   -- Dana, Rival Academy ADMIN — a real tenant admin, just of the WRONG tenant
select assert_raises(
  $$select * from public.tenant_word_heatmap('aaaaaaaa-0000-0000-0000-000000000001')$$,
  'Being a genuine tenant admin of Rival Academy does not grant Oxford''s rollup — is_tenant_admin() is checked against the SPECIFIC p_tenant_id argument, not "is this caller a tenant admin of anything"');

reset role;
rollback;

\echo ''
\echo '=== ALL RLS CHECKS PASSED =================================================='
