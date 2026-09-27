-- =============================================================================
-- Dygo Academy — schema/03_functions_triggers.sql
-- Functions and triggers: updated_at maintenance, signup provisioning,
-- group-owner seating, RLS helper functions (SECURITY DEFINER so policies on
-- group_members can consult group_members without infinite recursion — do
-- NOT enable FORCE ROW LEVEL SECURITY without revisiting this), invite
-- redemption, and the analytics heatmaps.
--
-- Part of the squashed baseline schema (2026-09-25). It folds the final
-- state of migrations 001–021 into one ordered set; the originals live in
-- database/archive/2026-09-25_pre_squash/ for history. Run through
-- database/apply-migrations.sh, never by hand out of order:
--   01_extensions_types → 02_tables → 03_functions_triggers →
--   04_rls_policies → 05_indexes → 06_grants
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'tenants', 'profiles', 'master_lexicon', 'groups', 'topics',
    'topic_words', 'user_word_srs', 'study_schedules'
  ] loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Provision a personal tenant + profile whenever a Supabase auth user is
-- created (final form from 006_solo_tenant_provisioning: every user gets a
-- free, 0-seat personal tenant so profiles.tenant_id is never null).
-- -----------------------------------------------------------------------------

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

-- Attached to auth.users. In Supabase this requires elevated privileges; if the
-- migration runs as a role that cannot touch the auth schema, create this
-- trigger from the SQL editor instead.
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- Seat the owner as ADMIN the moment a group is created.
--
-- Without this, self-service group creation deadlocks under RLS: groups_insert
-- (002_rls_policies.sql) only requires owner_id = auth.uid(), but
-- group_members_insert_admin requires has_group_role(group_id, 'ADMIN') —
-- which is false for every group until a group_members row exists. A brand
-- new authenticated user could create a group and then be permanently unable
-- to add themselves to its roster, add topics that need a WRITE/ADMIN group
-- member, or ever manage it. 004_seed_data.sql never exercises this path
-- because fixtures are inserted as service_role, which bypasses RLS entirely.
-- security definer lets this trigger write group_members on the owner's
-- behalf without needing its own INSERT policy.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'ADMIN')
  on conflict (group_id, user_id) do nothing;
  return new;
end;
$$;

create trigger trg_group_owner_membership
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------

create or replace function public.current_user_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

-- ADMIN > WRITE > READ, expressed numerically so policies can compare.
create or replace function public.group_role_rank(p_role group_role)
returns integer
language sql
immutable
as $$
  select case p_role
    when 'ADMIN' then 3
    when 'WRITE' then 2
    when 'READ'  then 1
  end
$$;

-- True when the current user holds at least p_min_role in the group.
create or replace function public.has_group_role(p_group_id uuid, p_min_role group_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id  = auth.uid()
      and public.group_role_rank(gm.role) >= public.group_role_rank(p_min_role)
  )
$$;

-- Tenant admin = holds ADMIN in any group belonging to that tenant. There is no
-- separate tenant-role table in the ERD, so administrative reach over a tenant
-- is derived from group ADMIN membership.
create or replace function public.is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where g.tenant_id = p_tenant_id
      and gm.user_id  = auth.uid()
      and gm.role     = 'ADMIN'
  )
$$;

-- Readable = public group, any membership, or tenant admin of the group's
-- tenant (tenant-admin reach added by 009_tenant_admin_read_expansion).
create or replace function public.can_read_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groups g
    where g.id = p_group_id
      and (g.is_public
           or public.has_group_role(g.id, 'READ')
           or public.is_tenant_admin(g.tenant_id))
  )
$$;

-- Small helper so group_members_select doesn't need its own subquery against
-- groups (which would otherwise re-run under the querying user's own RLS and
-- silently return null for a group they can't already see some other way).
create or replace function public.group_tenant_id(p_group_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.groups where id = p_group_id
$$;

-- A topic is readable if the topic itself is public, or its group is readable.
create or replace function public.can_read_topic(p_topic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.topics t
    where t.id = p_topic_id
      and (t.is_public or public.can_read_group(t.group_id))
  )
$$;

create or replace function public.has_topic_role(p_topic_id uuid, p_min_role group_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.topics t
    where t.id = p_topic_id
      and public.has_group_role(t.group_id, p_min_role)
  )
$$;

-- -----------------------------------------------------------------------------
-- Group-overlap check backing profiles_select_self_or_tenant (008).
-- -----------------------------------------------------------------------------

create or replace function public.shares_group_with(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.group_members gm_self
      join public.group_members gm_other
        on gm_other.group_id = gm_self.group_id
     where gm_self.user_id = auth.uid()
       and gm_other.user_id = p_other_user_id
  )
$$;

comment on function public.shares_group_with(uuid) is
  'True if the calling user (auth.uid()) and p_other_user_id are both '
  'members of at least one common group, any role, either side. SECURITY '
  'DEFINER so it can read group_members without recursing through '
  'group_members_select. Backs profiles_select_self_or_tenant''s new '
  'roster-visibility clause added in 008_profiles_group_visibility.sql — '
  'lets a teacher (or classmate) see a groupmate''s name/email regardless '
  'of which tenant that groupmate''s own account belongs to. Deliberately '
  'does not touch review_logs or any SRS table.';

-- -----------------------------------------------------------------------------
-- Hashing helper — shared by invite creation (GroupsService.createInvite)
-- and redemption below, so "how a token becomes a token_hash" exists in
-- exactly one place. Both call sites pass the raw token as text.
-- -----------------------------------------------------------------------------
create or replace function public.hash_invite_token(p_token text)
returns bytea
language sql
immutable
set search_path = public, extensions
as $$
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
-- search_path includes `extensions` because pgcrypto lives there on the
-- supabase/postgres image (016). The output column is joined_group_id, not
-- group_id, to avoid an ambiguity with group_members.group_id in ON CONFLICT (017).
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

-- -----------------------------------------------------------------------------
-- FR-8.2 mistake heatmaps — aggregate only, never a raw row or user_id.
-- -----------------------------------------------------------------------------

create or replace function public.group_word_heatmap(p_group_id uuid)
returns table (
  topic_word_id uuid,
  source_word   text,
  topic_id      uuid,
  topic_title   text,
  attempts      bigint,
  failures      bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_group_role(p_group_id, 'ADMIN') then
    raise exception 'Only a group ADMIN can view the mistake heatmap.' using errcode = '42501';
  end if;

  return query
    select tw.id, tw.source_word, tw.topic_id, t.title,
           count(*) as attempts,
           count(*) filter (where rl.was_correct = false) as failures
      from public.review_logs rl
      join public.topic_words tw on tw.id = rl.topic_word_id
      join public.topics t on t.id = tw.topic_id
     where t.group_id = p_group_id
     group by tw.id, tw.source_word, tw.topic_id, t.title;
end;
$$;

comment on function public.group_word_heatmap(uuid) is
  'FR-8.2 cohort mistake heatmap. SECURITY DEFINER: deliberately bypasses '
  'review_logs_select_own (owner-only) to compute a per-word aggregate '
  'across every member of the group — never a raw row, never a user_id. '
  'Re-checks has_group_role(..., ADMIN) itself so the bypass is never '
  'reachable without it. See this migration''s header comment for the full '
  'reasoning, and AnalyticsService.groupHeatmap for the application-level '
  'has_group_role() check that runs first (same shape as '
  'NotificationsService.triggerSprint).';

create or replace function public.tenant_word_heatmap(p_tenant_id uuid)
returns table (
  group_id      uuid,
  group_name    text,
  topic_word_id uuid,
  source_word   text,
  topic_id      uuid,
  topic_title   text,
  attempts      bigint,
  failures      bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_tenant_admin(p_tenant_id) then
    raise exception 'Only a tenant admin can view the academy-wide mistake heatmap.' using errcode = '42501';
  end if;

  return query
    select g.id, g.name, tw.id, tw.source_word, tw.topic_id, t.title,
           count(*) as attempts,
           count(*) filter (where rl.was_correct = false) as failures
      from public.review_logs rl
      join public.topic_words tw on tw.id = rl.topic_word_id
      join public.topics t on t.id = tw.topic_id
      join public.groups g on g.id = t.group_id
     where g.tenant_id = p_tenant_id
     group by g.id, g.name, tw.id, tw.source_word, tw.topic_id, t.title;
end;
$$;

comment on function public.tenant_word_heatmap(uuid) is
  'FR-8.2 "across cohorts" — tenant-wide widening of group_word_heatmap() '
  '(007). SECURITY DEFINER: bypasses review_logs_select_own the same narrow '
  'way 007 does, scoped by g.tenant_id rather than a single group_id. '
  'Re-checks is_tenant_admin(p_tenant_id) itself so the bypass is never '
  'reachable without it, even if AnalyticsService''s own check were ever '
  'skipped by a bug. See this migration''s header comment and '
  'AnalyticsService.tenantHeatmap.';
