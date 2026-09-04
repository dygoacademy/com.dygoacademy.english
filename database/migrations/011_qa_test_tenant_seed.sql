-- =============================================================================
-- Dygo Academy — 011_qa_test_tenant_seed.sql
-- Optional, on-demand QA fixture: a THIRD tenant, isolated from both of
-- 004_seed_data.sql's ("Oxford English Center" and "Rival Academy"), with
-- its own group and one user per role.
--
-- WHY THIS EXISTS, SEPARATE FROM 004: 004's two tenants already prove
-- cross-tenant isolation once (Rival Academy vs. Oxford). This fixture
-- exists to test it a SECOND, independent time against fresh ids — a bug
-- that happens to special-case "the second tenant" wouldn't be caught by
-- reusing the same two tenants everywhere. It's also deliberately never
-- referenced by anything in 004 or the automation suite, so it's safe to
-- load, poke at, and re-load without disturbing the fixtures other tests
-- depend on.
--
-- SCOPE, DELIBERATELY MINIMAL: tenant + group + members only — no topics,
-- words, or SRS data. This proves group/tenant-level RLS (a member of this
-- tenant can see this group; Sarah/Marco/Alex/Priya/Dana cannot). It does
-- NOT exercise topic- or word-level RLS. If you also want content to query
-- (topics, words, a study queue), that's a separate, explicit ask — don't
-- assume it from this file.
--
-- PERMISSION COLUMNS — learned live, 2026-09-01: the auth.users insert below
-- explicitly sets instance_id/aud/role/raw_app_meta_data rather than relying
-- on the supabase/postgres image's own column defaults. 004_seed_data.sql
-- originally omitted them on that same assumption, and it was live-verified
-- wrong (GoTrue rejected password login with a generic "invalid_credentials"
-- because a blank instance_id never matches its self-hosted single-instance
-- lookup) — see that file's own "CORRECTION" comment for the full story.
-- Every fixture here is seeded the corrected way from the start.
--
-- LOADING: this file is intentionally NOT part of the default migration
-- pipeline or --seed/--test (unlike 004, it's synthetic QA data, not the
-- fixtures the automation suite and rls_test.sql assert against) — load it
-- explicitly:
--   ./database/apply-migrations.sh --qa-seed-only
-- Safe to re-run: every insert below is an upsert or ON CONFLICT DO NOTHING.
-- =============================================================================

-- Tenant ----------------------------------------------------------------------
insert into public.tenants (id, name, purchased_seats, active_seats_used, price_per_seat_cents)
values ('aaaaaaaa-0000-0000-0000-000000000003', 'QA Test Tenant', 5, 2, 399)
on conflict (id) do update set
  name                  = excluded.name,
  purchased_seats       = excluded.purchased_seats,
  active_seats_used     = excluded.active_seats_used,
  price_per_seat_cents  = excluded.price_per_seat_cents;

-- Users -------------------------------------------------------------------
-- One per role (ADMIN/WRITE/READ), same dev-only password as the 004
-- fixtures ('dygo-dev-2026') so these sign in through the real login form
-- too, not just scripts/dev-token.js.
-- CORRECTION (live-verified 2026-09-03, same root cause documented in
-- 004_seed_data.sql's "CORRECTION #2"): GoTrue's Go driver 500s on login
-- if confirmation_token/recovery_token/email_change*/phone_change*/
-- reauthentication_token are NULL rather than ''. 004 now sets a
-- schema-level default for these columns, but that only helps once 004
-- has actually run — set them explicitly here too so this file is correct
-- standalone regardless of ordering.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token,
  created_at, updated_at
) values
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'qa.admin@dygo.test',
   crypt('dygo-dev-2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '', '', '', '', '', '', '', '', now(), now()),
  ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'qa.writer@dygo.test',
   crypt('dygo-dev-2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '', '', '', '', '', '', '', '', now(), now()),
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'qa.reader@dygo.test',
   crypt('dygo-dev-2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '', '', '', '', '', '', '', '', now(), now())
on conflict (id) do update set
  instance_id         = excluded.instance_id,
  aud                 = excluded.aud,
  role                = excluded.role,
  encrypted_password  = excluded.encrypted_password,
  email_confirmed_at  = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
  raw_app_meta_data   = coalesce(auth.users.raw_app_meta_data, excluded.raw_app_meta_data),
  confirmation_token         = coalesce(auth.users.confirmation_token, ''),
  recovery_token              = coalesce(auth.users.recovery_token, ''),
  email_change_token_new      = coalesce(auth.users.email_change_token_new, ''),
  email_change                = coalesce(auth.users.email_change, ''),
  email_change_token_current  = coalesce(auth.users.email_change_token_current, ''),
  phone_change                = coalesce(auth.users.phone_change, ''),
  phone_change_token          = coalesce(auth.users.phone_change_token, ''),
  reauthentication_token      = coalesce(auth.users.reauthentication_token, ''),
  created_at                   = coalesce(auth.users.created_at, excluded.created_at),
  updated_at                   = now();

-- handle_new_auth_user() (001/006) already gave each of the three a bare
-- profile plus an orphaned personal tenant on the insert above — point them
-- at the shared QA tenant instead, same pattern as 004's own profile updates.
update public.profiles set tenant_id = 'aaaaaaaa-0000-0000-0000-000000000003',
       display_name = 'QA Admin',  timezone = 'UTC'
 where id = '66666666-6666-6666-6666-666666666666';
update public.profiles set tenant_id = 'aaaaaaaa-0000-0000-0000-000000000003',
       display_name = 'QA Writer', timezone = 'UTC'
 where id = '77777777-7777-7777-7777-777777777777';
update public.profiles set tenant_id = 'aaaaaaaa-0000-0000-0000-000000000003',
       display_name = 'QA Reader', timezone = 'UTC'
 where id = '88888888-8888-8888-8888-888888888888';

-- Group -------------------------------------------------------------------
insert into public.groups (id, tenant_id, owner_id, name, description, is_public)
values ('bbbbbbbb-0000-0000-0000-000000000004',
        'aaaaaaaa-0000-0000-0000-000000000003',
        '66666666-6666-6666-6666-666666666666',
        'QA Isolation Test Class',
        'Third tenant, independent of Oxford/Rival — probes cross-tenant RLS a second time against fresh ids.',
        false)
on conflict (id) do nothing;

-- Memberships — trg_group_owner_membership (001) already seated the ADMIN
-- row the moment the insert above committed; listed again here for the same
-- "full roster in one place" readability reason 004 gives, reconciled via
-- ON CONFLICT rather than relying on the trigger alone.
insert into public.group_members (group_id, user_id, role) values
  ('bbbbbbbb-0000-0000-0000-000000000004', '66666666-6666-6666-6666-666666666666', 'ADMIN'),
  ('bbbbbbbb-0000-0000-0000-000000000004', '77777777-7777-7777-7777-777777777777', 'WRITE'),
  ('bbbbbbbb-0000-0000-0000-000000000004', '88888888-8888-8888-8888-888888888888', 'READ')
on conflict (group_id, user_id) do update set role = excluded.role;
