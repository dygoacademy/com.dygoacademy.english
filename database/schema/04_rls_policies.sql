-- =============================================================================
-- Dygo Academy — schema/04_rls_policies.sql
-- Row-Level Security: enabled on every table, then per-table policies.
-- Threat model (BRD §6 "Data Isolation"): access control is enforced by the
-- database engine, so a bug in the NestJS layer cannot leak another tenant's
-- private classes. Helper functions are in 03_functions_triggers.sql.
--
-- Part of the squashed baseline schema (2026-09-25). It folds the final
-- state of migrations 001–021 into one ordered set; the originals live in
-- database/archive/2026-09-25_pre_squash/ for history. Run through
-- database/apply-migrations.sh, never by hand out of order:
--   01_extensions_types → 02_tables → 03_functions_triggers →
--   04_rls_policies → 05_indexes → 06_grants
-- =============================================================================

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
    or public.shares_group_with(id)
  );

comment on policy profiles_select_self_or_tenant on public.profiles is
  'Self, same-tenant, or a group-membership overlap (008) — the last clause '
  'is what makes an invite-redeemed member''s name show up on the inviting '
  'teacher''s roster, since a redeemed member keeps their own personal '
  'tenant (006) rather than joining the teacher''s tenant.';

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
-- owner_id = auth.uid() (added 2026-09-25): Postgres applies this SELECT
-- policy to the row an INSERT ... RETURNING hands back, and it does so BEFORE
-- trg_group_owner_membership has seated the owner as ADMIN. Without the owner
-- clause, GroupsService.create's `insert ... returning` failed with "new row
-- violates row-level security policy" for anyone who wasn't already an admin
-- in their tenant — including every brand-new signup creating their first group.
create policy groups_select on public.groups
  for select to authenticated
  using (is_public or owner_id = auth.uid() or public.has_group_role(id, 'READ') or public.is_tenant_admin(tenant_id));

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
-- (teachers need it); READ members do not get to enumerate classmates. A
-- tenant admin sees every roster in their tenant (009).
-- -----------------------------------------------------------------------------
create policy group_members_select on public.group_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_group_role(group_id, 'WRITE')
    or public.is_tenant_admin(public.group_tenant_id(group_id))
  );

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
-- Anonymous visitors: public topic libraries only (Phase 5 SSR/SEO).
-- -----------------------------------------------------------------------------

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
