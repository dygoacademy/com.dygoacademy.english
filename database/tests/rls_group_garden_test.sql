-- =============================================================================
-- RLS / privacy assertions for UI-G (migrations/20260926_group_garden.sql).
-- Run AFTER the schema, migrations/ and seeds/01_core_fixtures.sql, in a
-- throwaway database, e.g. right after the main suite:
--
--   psql -d dygo_rls_scratch -f database/migrations/20260926_group_garden.sql
--   psql -d dygo_rls_scratch -f database/tests/rls_group_garden_test.sql
--
-- Every check raises on failure; the script runs in one transaction and
-- rolls back. Fixture people (seeds/01_core_fixtures.sql), group
-- "IELTS Band 8.0 Masterclass" (bbbbbbbb-…01): Sarah ADMIN, Marco WRITE,
-- Alex READ, Priya READ. Dana is in another tenant and not a member.
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

create or replace function assert_denied(stmt text, label text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when insufficient_privilege then
    raise notice '  pass: % (blocked: %)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % — statement was ALLOWED but should have been denied', label;
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
grant execute on function assert_raises(text, text) to authenticated, anon;
grant execute on function assert_denied(text, text) to authenticated, anon;
grant execute on function login_as(uuid) to authenticated, anon;

begin;

\echo ''
\echo '=== G1. Functions return counts only (no user ids) ==========================='
select assert_eq(
  (select count(*) from pg_proc p
    where p.proname in ('group_garden_counts', 'group_garden_activity',
                        'group_tricky_patches', 'group_invite_preview')
      and p.pronamespace = 'public'::regnamespace
      and exists (select 1 from unnest(coalesce(p.proargnames, '{}')) a
                   where a in ('user_id', 'email'))),
  0, 'no UI-G function has a user_id or email column');
select assert_eq(
  (select count(*) from pg_proc p
    where p.proname in ('group_garden_counts', 'group_garden_activity',
                        'group_tricky_patches', 'group_invite_preview')
      and p.pronamespace = 'public'::regnamespace and p.prosecdef),
  4, 'all four are SECURITY DEFINER with their own checks');

\echo ''
\echo '=== G2. anon cannot call them ================================================'
set role anon;
select assert_denied(
  $$select * from public.group_garden_counts('bbbbbbbb-0000-0000-0000-000000000001')$$,
  'anon: group_garden_counts');
select assert_denied(
  $$select * from public.group_invite_preview('dygo-dev-invite-token')$$,
  'anon: group_invite_preview');
reset role;

\echo ''
\echo '=== G3. Garden counts: a Viewer gets the real totals, RLS still hides rows ==='
set role authenticated;
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex, READ
select assert_eq(
  (select count(*) from public.group_members where group_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  1, 'Alex (READ) still sees only his own group_members row');
select assert_eq(
  (select member_count from public.group_garden_counts('bbbbbbbb-0000-0000-0000-000000000001')),
  4, 'Alex: gardener count is the real total (4)');
select assert_eq(
  (select bed_count from public.group_garden_counts('bbbbbbbb-0000-0000-0000-000000000001')),
  1, 'Alex: 1 shared bed');
select assert_eq(
  (select word_count from public.group_garden_counts('bbbbbbbb-0000-0000-0000-000000000001')),
  3, 'Alex: 3 words');
select assert_eq(
  (select count(*) from public.user_word_srs where user_id = '44444444-4444-4444-4444-444444444444'),
  0, 'Alex still cannot read Priya''s word-level progress (FR-1.2)');

\echo ''
\echo '=== G4. Non-members get nothing ============================================='
select login_as('55555555-5555-5555-5555-555555555555'); -- Dana, other tenant
select assert_eq(
  (select count(*) from public.group_garden_counts('bbbbbbbb-0000-0000-0000-000000000001')),
  0, 'Dana: no counts row for a group she is not in');
select assert_raises(
  $$select * from public.group_garden_activity('bbbbbbbb-0000-0000-0000-000000000001', now() - interval '1 day')$$,
  'Dana: group_garden_activity raises');
select assert_raises(
  $$select * from public.group_tricky_patches('bbbbbbbb-0000-0000-0000-000000000001', now() - interval '7 days', 5)$$,
  'Dana: group_tricky_patches raises');

\echo ''
\echo '=== G5. Garden activity (GR2 hero) ==========================================='
select login_as('44444444-4444-4444-4444-444444444444'); -- Priya, READ
select assert_eq(
  (select watered_count from public.group_garden_activity('bbbbbbbb-0000-0000-0000-000000000001', now() - interval '1 day')),
  1, 'Priya: 1 gardener watered in the last day (a count, not who)');
select assert_eq(
  (select watered_count from public.group_garden_activity('bbbbbbbb-0000-0000-0000-000000000001', now() - interval '7 days')),
  2, 'Priya: 2 gardeners watered in the last 7 days');
select assert_eq(
  (select ripe_count from public.group_garden_activity('bbbbbbbb-0000-0000-0000-000000000001', now() - interval '1 day')),
  2, 'Priya: 2 ripe plants in the garden');

\echo ''
\echo '=== G6. Tricky patches: ADMIN only, totals only ==============================='
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex, READ
select assert_raises(
  $$select * from public.group_tricky_patches('bbbbbbbb-0000-0000-0000-000000000001', now() - interval '7 days', 5)$$,
  'Alex (READ): tricky patches raise');
select login_as('22222222-2222-2222-2222-222222222222'); -- Marco, WRITE
select assert_raises(
  $$select * from public.group_tricky_patches('bbbbbbbb-0000-0000-0000-000000000001', now() - interval '7 days', 5)$$,
  'Marco (WRITE): tricky patches raise');
select login_as('11111111-1111-1111-1111-111111111111'); -- Sarah, ADMIN
select assert_eq(
  (select count(*) from public.group_tricky_patches('bbbbbbbb-0000-0000-0000-000000000001', now() - interval '7 days', 5)),
  1, 'Sarah (ADMIN): one tricky word this week');
select assert_text(
  (select source_word from public.group_tricky_patches('bbbbbbbb-0000-0000-0000-000000000001', now() - interval '7 days', 5)),
  'resilient', 'Sarah: it is "resilient"');
select assert_eq(
  (select misses from public.group_tricky_patches('bbbbbbbb-0000-0000-0000-000000000001', now() - interval '7 days', 5)),
  1, 'Sarah: 1 miss');
select assert_eq(
  (select gardeners from public.group_tricky_patches('bbbbbbbb-0000-0000-0000-000000000001', now() - interval '7 days', 5)),
  1, 'Sarah: by 1 gardener');

\echo ''
\echo '=== G7. My due words per group: RLS keeps it to my own rows ================='
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
select assert_eq(
  (select count(*)
     from public.user_word_srs s
     join public.topic_words tw on tw.id = s.topic_word_id
     join public.topics t on t.id = tw.topic_id
    where t.group_id = 'bbbbbbbb-0000-0000-0000-000000000001'
      and s.next_due_at <= now()),
  1, 'Alex: 1 due word in the group (his own; Priya''s due word is not counted)');

\echo ''
\echo '=== G8. Invite preview (GR6) ================================================='
select login_as('55555555-5555-5555-5555-555555555555'); -- Dana, not a member
select assert_text(
  (select group_name from public.group_invite_preview('dygo-dev-invite-token')),
  'IELTS Band 8.0 Masterclass', 'Dana: preview shows the group name');
select assert_text(
  (select inviter_name from public.group_invite_preview('dygo-dev-invite-token')),
  'Sarah Chen', 'Dana: the inviter''s display name (never the email)');
select assert_text(
  (select grant_role::text from public.group_invite_preview('dygo-dev-invite-token')),
  'READ', 'Dana: the role she would get');
select assert_eq(
  (select member_count from public.group_invite_preview('dygo-dev-invite-token')),
  4, 'Dana: gardener count');
select assert_eq(
  (select word_count from public.group_invite_preview('dygo-dev-invite-token')),
  3, 'Dana: word count');
select assert_eq(
  (select count(*) from public.group_invite_preview('dygo-dev-invite-token') where already_member),
  0, 'Dana: not already a member');
select assert_eq(
  (select count(*) from public.group_members where group_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  0, 'Dana: the preview did not make her a member (still sees no rows)');
select assert_raises(
  $$select * from public.group_invite_preview('not-a-real-token')$$,
  'unknown token raises (P0002)');
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
select assert_eq(
  (select count(*) from public.group_invite_preview('dygo-dev-invite-token') where already_member),
  1, 'Alex: already a member');
reset role;
select assert_eq(
  (select use_count from public.group_invites where token_hash = public.hash_invite_token('dygo-dev-invite-token')),
  0, 'previews do not use up the invite');
update public.group_invites set revoked_at = now()
 where token_hash = public.hash_invite_token('dygo-dev-invite-token');
set role authenticated;
select login_as('55555555-5555-5555-5555-555555555555');
select assert_raises(
  $$select * from public.group_invite_preview('dygo-dev-invite-token')$$,
  'revoked invite raises (22023)');
reset role;

\echo ''
\echo 'UI-G group garden RLS assertions: all passed.'
rollback;
