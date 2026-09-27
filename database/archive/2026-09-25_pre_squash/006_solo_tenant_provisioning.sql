-- =============================================================================
-- Dygo Academy — 006_solo_tenant_provisioning.sql
-- Fixes the standing "no solo-user tenant provisioning" gap, flagged since
-- the very first session report and reconfirmed in dygo_academy_api_surface.md
-- ("solo-user tenant provisioning is unspecified") and the 8th pass's own
-- "Known gaps" entry.
--
-- THE BUG: handle_new_auth_user() (001_initial_schema.sql) inserts a bare
-- profiles row (id, email only) on every Supabase signup — tenant_id stays
-- NULL. public.groups.tenant_id is NOT NULL references tenants, and
-- GroupsService.create() inserts using public.current_user_tenant_id(),
-- which reads profiles.tenant_id. Net effect: any freshly-registered user
-- who is not one of the 5 seeded fixtures cannot create their first group
-- at all — POST /groups fails outright on a NOT NULL violation.
--
-- CORRECTING THE 8TH PASS'S "SAME ROOT CAUSE" FRAMING: that pass's report
-- linked this gap to the roster showing no name for invite-redeemed
-- members, on the theory that both trace back to a NULL profiles.tenant_id.
-- That's only half right. Tracing profiles_select_self_or_tenant
-- (002_rls_policies.sql) precisely: `id = auth.uid() or (tenant_id is not
-- null and tenant_id = current_user_tenant_id())`. The `is not null` check
-- is actually redundant — `null = anything` is already not-true in SQL, so
-- the real gate is tenant EQUALITY between the row and the caller. Once
-- this migration lands, an invite-redeemed student has a real, non-null
-- tenant_id — but it's their OWN personal tenant, deliberately distinct
-- from the inviting teacher's tenant (see "WHY THIS DOESN'T COLLIDE..."
-- below). So the equality check still fails for a teacher viewing that
-- student's profile, and the roster's left join (8th pass) still renders
-- null email/display_name for them. This migration closes the
-- "can't create a group at all" gap completely; the roster-visibility gap
-- is NOT closed by it and remains open — it needs a genuinely different
-- fix (e.g. extending profiles' SELECT policy with a group-membership
-- clause, not a tenant one), flagged for the next pass rather than
-- guessed at here.
--
-- THE FIX: every user gets their own personal tenant automatically at
-- signup, provisioned inside the same SECURITY DEFINER trigger transaction
-- handle_new_auth_user() already runs in. tenants.name is NOT NULL with no
-- sensible default, so it's derived from the email local-part ("sarah" from
-- "sarah@dygo.test") — readable in Studio/admin views without an extra
-- join, and good enough for a personal workspace name that Phase 4 billing
-- can let the user rename later. purchased_seats/price_per_seat_cents both
-- default to 0 (see 001_initial_schema.sql's own column defaults) and are
-- deliberately left at that default here, not set explicitly — a personal
-- tenant is unpaid until Phase 4's Stripe flow upgrades it; 0 seats
-- purchased is exactly correct for "hasn't paid for anything yet," not a
-- placeholder to fill in later.
--
-- WHY THIS DOESN'T COLLIDE WITH A TEACHER'S INVITE: an invited student
-- already gets their own personal tenant from their OWN signup (this
-- trigger), distinct from the inviting teacher's tenant. tenants are the
-- billing boundary (see the table's own comment in 001), so a student
-- redeeming an invite must NOT be silently folded into the teacher's paid
-- seat count — redeem_group_invite() only ever writes group_members, never
-- touches tenant_id, and this migration doesn't change that. This also
-- matches the BRD's "frictionless student onboarding... zero payment
-- screens" intent: the student's personal tenant is real (so they could
-- create their own groups too) but carries no cost until they buy seats.
--
-- WHY NOT LEAVE tenant_id NULL AND PATCH GroupsService INSTEAD: a nullable
-- tenant_id would still need *some* provisioning path the first time a
-- solo user tries to create a group (lazy-provision on first POST /groups),
-- which either duplicates this trigger's logic in application code or adds
-- a second place a group-creation transaction can fail. Provisioning once,
-- eagerly, at signup — the same moment handle_new_auth_user() already runs
-- — is simpler and means profiles.tenant_id is NEVER null for any real
-- user, which every RLS policy and query in this codebase that reads
-- current_user_tenant_id() already assumes.
-- =============================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_local_part text;
begin
  -- Derive a readable personal-tenant name from the email local-part.
  -- new.email is not guaranteed lowercase yet at trigger time (profiles'
  -- own check constraint normalizes it below), so lower() it here too —
  -- "Sarah's Workspace" style capitalization is a nice-to-have, not worth
  -- the extra complexity of title-casing an arbitrary local-part.
  v_local_part := split_part(lower(new.email), '@', 1);

  insert into public.tenants (name)
  values (coalesce(nullif(trim(v_local_part), ''), 'Personal') || '''s Workspace')
  returning id into v_tenant_id;

  insert into public.profiles (id, email, tenant_id)
  values (new.id, lower(new.email), v_tenant_id)
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Provisions a personal (free, 0-seat) tenant for every new Supabase auth '
  'user, then the profile row pointing at it. Closes the standing '
  '"solo-user tenant provisioning" gap — see this migration''s header '
  'comment for the full reasoning. 004_seed_data.sql''s fixtures immediately '
  'UPDATE profiles.tenant_id to their real shared-tenant ids after this '
  'trigger runs, so the personal tenants this creates for the 5 seeded '
  'auth.users rows are harmless orphans in a dev database, never referenced '
  'again — acceptable for fixtures that are never used in production.';
