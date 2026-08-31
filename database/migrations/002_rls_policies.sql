-- =============================================================================
-- Dygo Academy — 002_rls_policies.sql
-- Multi-tenant Row-Level Security.
--
-- Threat model (BRD §6 "Data Isolation", risk table "Multi-Tenant Data Leakage"):
-- access control is enforced by the database engine, so a bug in the NestJS
-- layer cannot leak another tenant's private classes.
--
-- IMPORTANT — why the helpers are SECURITY DEFINER:
-- A policy on group_members that itself queries group_members recurses
-- infinitely ("infinite recursion detected in policy for relation ..."). The
-- helpers below are SECURITY DEFINER and owned by the table owner, so their
-- internal reads bypass RLS and the recursion is broken. Do NOT enable
-- FORCE ROW LEVEL SECURITY on these tables without revisiting this.
-- =============================================================================

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

-- Readable = public group, or any membership.
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
      and (g.is_public or public.has_group_role(g.id, 'READ'))
  )
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

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere. Any table left without it is a silent hole.
-- -----------------------------------------------------------------------------
alter table public.tenants            enable row level security;
alter table public.profiles           enable row level security;
alter table public.tenant_seats       enable row level security;
alter table public.master_lexicon     enable row level security;
alter table public.groups             enable row level security;
alter table public.group_members      enable row level security;
alter table public.group_invites      enable row level security;
alter table public.topics             enable row level security;
alter table public.topic_words        enable row level security;
alter table public.user_word_srs      enable row level security;
alter table public.review_logs        enable row level security;
alter table public.study_schedules    enable row level security;
alter table public.push_subscriptions enable row level security;

-- -----------------------------------------------------------------------------
-- tenants
-- Billing columns (purchased_seats, active_seats_used) are written only by the
-- Stripe webhook handler running as service_role, which bypasses RLS entirely.
-- No UPDATE policy is granted to end users by design.
-- -----------------------------------------------------------------------------
create policy tenants_select_own on public.tenants
  for select to authenticated
  using (id = public.current_user_tenant_id());

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy profiles_select_self_or_tenant on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (tenant_id is not null and tenant_id = public.current_user_tenant_id())
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- tenant_seats — a learner sees their own seat; tenant admins see all seats.
-- -----------------------------------------------------------------------------
create policy tenant_seats_select on public.tenant_seats
  for select to authenticated
  using (user_id = auth.uid() or public.is_tenant_admin(tenant_id));

-- -----------------------------------------------------------------------------
-- master_lexicon — global shared cache: readable by all signed-in users,
-- written only by the enrichment worker (service_role).
-- -----------------------------------------------------------------------------
create policy master_lexicon_select_all on public.master_lexicon
  for select to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- groups
-- -----------------------------------------------------------------------------
create policy groups_select on public.groups
  for select to authenticated
  using (is_public or public.has_group_role(id, 'READ') or public.is_tenant_admin(tenant_id));

create policy groups_insert on public.groups
  for insert to authenticated
  with check (owner_id = auth.uid() and tenant_id = public.current_user_tenant_id());

create policy groups_update_admin on public.groups
  for update to authenticated
  using (public.has_group_role(id, 'ADMIN'))
  with check (public.has_group_role(id, 'ADMIN'));

create policy groups_delete_admin on public.groups
  for delete to authenticated
  using (public.has_group_role(id, 'ADMIN'));

-- -----------------------------------------------------------------------------
-- group_members
-- A student always sees their own membership. WRITE and above see the roster
-- (teachers need it); READ members do not get to enumerate classmates.
-- -----------------------------------------------------------------------------
create policy group_members_select on public.group_members
  for select to authenticated
  using (user_id = auth.uid() or public.has_group_role(group_id, 'WRITE'));

create policy group_members_insert_admin on public.group_members
  for insert to authenticated
  with check (public.has_group_role(group_id, 'ADMIN'));

create policy group_members_update_admin on public.group_members
  for update to authenticated
  using (public.has_group_role(group_id, 'ADMIN'))
  with check (public.has_group_role(group_id, 'ADMIN'));

create policy group_members_delete_admin on public.group_members
  for delete to authenticated
  using (public.has_group_role(group_id, 'ADMIN'));

-- -----------------------------------------------------------------------------
-- group_invites — ADMIN only. Redeeming an invite happens server-side as
-- service_role, because the joiner is by definition not yet a member.
-- -----------------------------------------------------------------------------
create policy group_invites_select_admin on public.group_invites
  for select to authenticated
  using (public.has_group_role(group_id, 'ADMIN'));

create policy group_invites_insert_admin on public.group_invites
  for insert to authenticated
  with check (public.has_group_role(group_id, 'ADMIN') and created_by = auth.uid());

create policy group_invites_update_admin on public.group_invites
  for update to authenticated
  using (public.has_group_role(group_id, 'ADMIN'))
  with check (public.has_group_role(group_id, 'ADMIN'));

create policy group_invites_delete_admin on public.group_invites
  for delete to authenticated
  using (public.has_group_role(group_id, 'ADMIN'));

-- -----------------------------------------------------------------------------
-- topics
-- -----------------------------------------------------------------------------
create policy topics_select on public.topics
  for select to authenticated
  using (is_public or public.can_read_group(group_id));

create policy topics_insert_write on public.topics
  for insert to authenticated
  with check (public.has_group_role(group_id, 'WRITE'));

create policy topics_update_write on public.topics
  for update to authenticated
  using (public.has_group_role(group_id, 'WRITE'))
  with check (public.has_group_role(group_id, 'WRITE'));

-- Deleting a topic is ADMIN-only (tech spec §4.1: WRITE "cannot delete topic").
create policy topics_delete_admin on public.topics
  for delete to authenticated
  using (public.has_group_role(group_id, 'ADMIN'));

-- -----------------------------------------------------------------------------
-- topic_words
-- -----------------------------------------------------------------------------
create policy topic_words_select on public.topic_words
  for select to authenticated
  using (public.can_read_topic(topic_id));

create policy topic_words_insert_write on public.topic_words
  for insert to authenticated
  with check (public.has_topic_role(topic_id, 'WRITE'));

create policy topic_words_update_write on public.topic_words
  for update to authenticated
  using (public.has_topic_role(topic_id, 'WRITE'))
  with check (public.has_topic_role(topic_id, 'WRITE'));

create policy topic_words_delete_write on public.topic_words
  for delete to authenticated
  using (public.has_topic_role(topic_id, 'WRITE'));

-- -----------------------------------------------------------------------------
-- user_word_srs — the strict isolation requirement (FR-1.2).
-- Owner-only, with no teacher exception: a tutor must not be able to read or
-- alter a student's scheduling state.
-- -----------------------------------------------------------------------------
create policy user_word_srs_all_own on public.user_word_srs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- review_logs — owner-only.
-- Module 8 cohort heatmaps read aggregates as service_role; they must never be
-- served by widening this policy to teachers, which would expose per-student
-- review histories rather than aggregate error rates.
-- -----------------------------------------------------------------------------
create policy review_logs_select_own on public.review_logs
  for select to authenticated
  using (user_id = auth.uid());

create policy review_logs_insert_own on public.review_logs
  for insert to authenticated
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- study_schedules / push_subscriptions — owner-only.
-- -----------------------------------------------------------------------------
create policy study_schedules_all_own on public.study_schedules
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy push_subscriptions_all_own on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Grants. RLS filters rows; grants decide whether the role may touch the table
-- at all. Both are required.
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select on
  public.tenants, public.profiles, public.tenant_seats, public.master_lexicon,
  public.groups, public.group_members, public.group_invites, public.topics,
  public.topic_words, public.user_word_srs, public.review_logs,
  public.study_schedules, public.push_subscriptions
to authenticated;

grant insert, update, delete on
  public.groups, public.group_members, public.group_invites, public.topics,
  public.topic_words, public.user_word_srs, public.study_schedules,
  public.push_subscriptions
to authenticated;

grant insert on public.review_logs to authenticated;
grant update on public.profiles to authenticated;

-- Anonymous visitors get public topic libraries only, for the SSR/SEO
-- requirement in Phase 5. RLS still filters to is_public rows.
grant select on public.topics, public.topic_words, public.master_lexicon to anon;

create policy topics_select_anon on public.topics
  for select to anon
  using (is_public);

create policy topic_words_select_anon on public.topic_words
  for select to anon
  using (exists (select 1 from public.topics t
                 where t.id = topic_words.topic_id and t.is_public));

create policy master_lexicon_select_anon on public.master_lexicon
  for select to anon
  using (true);
