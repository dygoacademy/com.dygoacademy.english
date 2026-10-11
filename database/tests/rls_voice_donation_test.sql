-- =============================================================================
-- RLS assertions for voice donation (migrations/20261011_voice_donation.sql).
-- Runs after the onboarding migration and its test (helpers assert_eq,
-- assert_sqlstate, login_as come from there); one transaction, rolled back.
-- Fixture people (seeds/01_core_fixtures.sql): Alex (3333…) and Priya (4444…).
-- =============================================================================
\set ON_ERROR_STOP on

begin;

\echo ''
\echo '=== V1. Consent: own rows only, one active, only withdrawn_at changes ====='
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
set local role authenticated;
insert into public.voice_donation_consents (text_version, method, locale)
  values ('2026-10-v1', 'setting', 'vi-VN');
select assert_eq((select count(*) from public.voice_donation_consents), 1, 'Alex: consent saved');
select assert_sqlstate(
  $$insert into public.voice_donation_consents (text_version, method) values ('2026-10-v1', 'setting')$$,
  '23505', 'one active consent per learner');
select assert_sqlstate(
  $$insert into public.voice_donation_consents (user_id, text_version, method)
    values ('44444444-4444-4444-4444-444444444444', '2026-10-v1', 'setting')$$,
  '42501', 'consent for someone else rejected');
select assert_sqlstate(
  $$update public.voice_donation_consents set text_version = 'x'$$,
  '42501', 'text_version cannot be changed');
select assert_sqlstate(
  $$delete from public.voice_donation_consents$$,
  '42501', 'consents cannot be deleted');
update public.voice_donation_consents set withdrawn_at = now() where withdrawn_at is null;
select assert_eq((select count(*) from public.voice_donation_consents where withdrawn_at is null), 0,
  'Alex: withdrawn');

\echo ''
\echo '=== V2. Donor code and donations: own only ================================='
insert into public.voice_donors (region) values ('south');
insert into public.voice_donations (donor_code, object_key, kind)
  select donor_code, 'donations/test-a.enc', 'word' from public.voice_donors;
select assert_eq((select count(*) from public.voice_donations), 1, 'Alex: one donation');
select assert_sqlstate(
  $$insert into public.voice_donations (donor_code, object_key, kind)
    values (gen_random_uuid(), 'donations/test-x.enc', 'word')$$,
  '42501', 'donation under a code that is not yours rejected');
select assert_sqlstate(
  $$select count(*) from public.voice_donation_deletions$$,
  '42501', 'deletions queue not readable');

select login_as('44444444-4444-4444-4444-444444444444'); -- Priya
select assert_eq((select count(*) from public.voice_donors), 0, 'Priya: no donor rows of Alex');
select assert_eq((select count(*) from public.voice_donations), 0, 'Priya: no donations of Alex');
select assert_eq((select count(*) from public.voice_donation_consents), 0, 'Priya: no consents of Alex');

\echo ''
\echo '=== V3. Deleting the donor row queues the code; consent row stays ========'
select login_as('33333333-3333-3333-3333-333333333333'); -- Alex
delete from public.voice_donors;
select assert_eq((select count(*) from public.voice_donors), 0, 'Alex: donor link gone');
reset role;
select assert_eq((select count(*) from public.voice_donation_deletions where done_at is null), 1,
  'deletion queued by the trigger');
select assert_eq((select count(*) from public.voice_donation_consents
  where user_id = '33333333-3333-3333-3333-333333333333'), 1, 'consent record kept');

\echo ''
\echo '=== V4. Deleting the account queues its code too =========================='
insert into public.voice_donors (user_id) values ('44444444-4444-4444-4444-444444444444');
delete from public.profiles where id = '44444444-4444-4444-4444-444444444444';
select assert_eq((select count(*) from public.voice_donation_deletions), 2, 'account deletion queued');

rollback;
