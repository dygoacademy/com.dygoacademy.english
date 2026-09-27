-- =============================================================================
-- Dygo Academy — 005_group_invites_redeem.sql
-- Module 1 (Phase 1) — magic invite-link redemption (FR-1.3).
--
-- WHY A SECURITY DEFINER FUNCTION, NOT DATABASE_ADMIN_URL / service_role:
-- dygo_academy_api_surface.md describes redemption as running "as
-- service_role, because the joiner is not yet a member, so RLS cannot see
-- the group for them" — true, but this codebase already has a narrower tool
-- for exactly this shape of problem: trg_group_owner_membership
-- (001_initial_schema.sql) is a SECURITY DEFINER trigger that lets a caller
-- write a group_members row they could not otherwise see under RLS, scoped
-- to one specific, auditable statement. configuration.ts's adminUrl (real
-- Postgres superuser) is documented as "never used to serve a request" —
-- reusing it here would mean the connection that can DROP TABLE also
-- redeems invite links reachable from any authenticated user, which is a
-- much bigger blast radius for a bug than one function scoped to
-- group_invites + group_members. A SECURITY DEFINER function called over
-- the normal pooled `authenticated` connection gets the same effect
-- (bypasses RLS for exactly these two tables, nothing else) with the
-- pooled connection's normal lifecycle and the function body as the entire
-- audit surface.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Hashing helper — shared by invite creation (GroupsService.createInvite)
-- and redemption below, so "how a token becomes a token_hash" exists in
-- exactly one place. Both call sites pass the raw token as text.
-- -----------------------------------------------------------------------------
create or replace function public.hash_invite_token(p_token text)
returns bytea
language sql
immutable
as $$
  -- Matches 004_seed_data.sql's fixture verbatim: digest(text, 'sha256'),
  -- not the bytea overload — the two are equivalent under UTF8 server
  -- encoding, but pinning to one call site avoids depending on that being
  -- true forever.
  select digest(p_token, 'sha256')
$$;

-- -----------------------------------------------------------------------------
-- Redeem a magic invite link for the currently authenticated caller.
--
-- Deliberately does NOT accept a user id argument — auth.uid() is read
-- inside the function, the same way has_group_role() and friends do, so a
-- caller cannot redeem an invite on someone else's behalf by passing a
-- different id.
--
-- Idempotency choice: if the caller is already a member of the group, this
-- is a no-op success (ON CONFLICT DO NOTHING) rather than an error or a
-- role upgrade. An invite is a way in, not a way to re-grant a role to
-- someone already inside — that is PATCH /groups/:id/members/:userId's job
-- (GroupsController.updateMemberRole), which is ADMIN-gated on purpose.
-- Silently upgrading a READ member to WRITE via a link would route around
-- that gate.
-- -----------------------------------------------------------------------------
create or replace function public.redeem_group_invite(p_token text)
returns table (group_id uuid, group_name text, granted_role group_role, already_member boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_invite public.group_invites;
  v_group  public.groups;
  v_row_count integer;
  v_inserted boolean;
begin
  if v_caller is null then
    raise exception 'redeem_group_invite requires an authenticated caller' using errcode = '28000';
  end if;

  select * into v_invite
    from public.group_invites
   where token_hash = public.hash_invite_token(p_token)
   for update;

  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if v_invite.revoked_at is not null then
    raise exception 'invite has been revoked' using errcode = '22023';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at <= now() then
    raise exception 'invite has expired' using errcode = '22023';
  end if;
  if v_invite.max_uses is not null and v_invite.use_count >= v_invite.max_uses then
    raise exception 'invite has reached its use limit' using errcode = '22023';
  end if;

  select * into v_group from public.groups where id = v_invite.group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_invite.group_id, v_caller, v_invite.grant_role)
  on conflict (group_id, user_id) do nothing;
  get diagnostics v_row_count = row_count;
  v_inserted := v_row_count > 0;

  -- Only consume a use when it actually seated a new member — replaying a
  -- redeem call on a link you already used should not burn max_uses twice.
  if v_inserted then
    update public.group_invites
       set use_count = use_count + 1
     where id = v_invite.id;
  end if;

  return query select v_group.id, v_group.name, v_invite.grant_role, not v_inserted;
end;
$$;
