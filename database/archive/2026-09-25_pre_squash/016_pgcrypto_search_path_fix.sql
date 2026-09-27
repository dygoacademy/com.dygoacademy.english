-- =============================================================================
-- Dygo Academy — 016_pgcrypto_search_path_fix.sql
-- Fixes invite-link creation/redemption: "function digest(text, unknown)
-- does not exist".
--
-- ROOT CAUSE (live-verified 2026-09-17, first real attempt to create an
-- invite link): the official `supabase/postgres` Docker image pre-installs
-- pgcrypto into its own `extensions` schema during bootstrap. Migration
-- 001's `create extension if not exists pgcrypto;` therefore silently
-- no-ops (already exists, just not in `public`), and `hash_invite_token`'s
-- unqualified `digest(...)` call only resolves if `extensions` is on the
-- caller's search_path.
--
-- Confirmed via:
--   select extname, extnamespace::regnamespace from pg_extension
--    where extname = 'pgcrypto';
--   -> extensions
--
-- Never caught before now because gen_random_uuid() (used everywhere for
-- PKs) has been a Postgres core built-in since v13 — it owes nothing to
-- pgcrypto. hash_invite_token (005_group_invites_redeem.sql) is the first
-- and only thing in this codebase that calls a real pgcrypto function
-- (digest) at request time. The seed data's own crypt()/gen_salt()/
-- digest() calls (004_seed_data.sql, 011_qa_test_tenant_seed.sql) never hit
-- this because they run as the `postgres` superuser via apply-migrations.sh
-- (psql -U postgres), whose default search_path already includes
-- `extensions` — application roles (authenticated/authenticator) never had
-- that.
--
-- FIX: pin search_path on both functions to include `extensions`, not just
-- `public`. Fixing only hash_invite_token is not enough on its own —
-- redeem_group_invite already pins `set search_path = public` (for
-- security, same as has_group_role and friends), which OVERRIDES the
-- caller's session search_path for the duration of that function's
-- execution, including its own internal call to hash_invite_token. Both
-- need the same fix or redemption keeps failing even after invite
-- creation is fixed. CREATE OR REPLACE — safe to re-run.
-- =============================================================================

create or replace function public.hash_invite_token(p_token text)
returns bytea
language sql
immutable
set search_path = public, extensions
as $$
  select digest(p_token, 'sha256')
$$;

create or replace function public.redeem_group_invite(p_token text)
returns table (group_id uuid, group_name text, granted_role group_role, already_member boolean)
language plpgsql
security definer
set search_path = public, extensions
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

  if v_inserted then
    update public.group_invites
       set use_count = use_count + 1
     where id = v_invite.id;
  end if;

  return query select v_group.id, v_group.name, v_invite.grant_role, not v_inserted;
end;
$$;
