-- =============================================================================
-- Dygo Academy — 017_redeem_invite_ambiguous_column_fix.sql
-- Fixes invite redemption: "column reference \"group_id\" is ambiguous".
--
-- ROOT CAUSE (live-verified 2026-09-17, right after 016 fixed the digest()
-- error and joining was tried for the first time): redeem_group_invite's
-- `returns table (group_id uuid, ...)` creates an implicit PL/pgSQL
-- variable named group_id, in scope for the whole function body. That
-- collides with public.group_members' own group_id column specifically in
-- `on conflict (group_id, user_id) do nothing` — unlike an INSERT's plain
-- column list (which only ever means "this table's column", no ambiguity
-- possible), Postgres's ON CONFLICT target list is grammatically an
-- expression position, so a same-named PL/pgSQL variable is a legal
-- alternative reading there and Postgres can't choose between "the
-- function's own group_id output variable" and "group_members.group_id".
--
-- FIX: rename the output column so nothing inside the function body can
-- collide with a real table column, and update the one caller
-- (GroupsService.redeemInvite) to match.
--
-- DROP is required first, despite CREATE OR REPLACE FUNCTION normally
-- being enough for a body-only change (as 006/007/009/010's own headers
-- note): live-verified 2026-09-17 running this migration against an
-- already-005-migrated database, Postgres refused with "cannot change
-- return type of existing function / DETAIL: Row type defined by OUT
-- parameters is different." RETURNS TABLE is sugar over OUT parameters,
-- and renaming one is a row-type change CREATE OR REPLACE won't apply in
-- place — only body edits and appending new OUT columns are, which is
-- narrower than this migration's original comment here claimed.
-- =============================================================================

drop function if exists public.redeem_group_invite(text);

create or replace function public.redeem_group_invite(p_token text)
returns table (joined_group_id uuid, group_name text, granted_role group_role, already_member boolean)
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
