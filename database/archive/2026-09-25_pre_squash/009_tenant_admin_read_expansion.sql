-- =============================================================================
-- Dygo Academy — 009_tenant_admin_read_expansion.sql
-- Closes an RLS inconsistency found while wireframing turn 12 (the
-- academy-tier director rollup, BRD Journey 3 step 5 / FR-8.2).
--
-- What was found (17th pass): turn 12's own wireframe note assumed "there is
-- no tenant-level director role anywhere in the schema" and treated its 12a
-- screen's access model (an ADMIN who happens to hold ADMIN on every group in
-- a tenant) as a stand-in for a role that doesn't exist. That's only half
-- true. `is_tenant_admin(tenant_id)` (002_rls_policies.sql) already exists
-- and already IS a tenant-wide role at the RLS layer — it's what
-- `groups_select` and `tenant_seats_select` use today to let a user who is
-- ADMIN of even ONE group in a tenant see every group's row and every seat
-- in that tenant, not just the groups they belong to.
--
-- The actual gap: that same grant was never carried into `can_read_group()`
-- (and therefore `can_read_topic()`, `topics_select`, `topic_words_select`,
-- all of which call it) or into `group_members_select`. A tenant admin could
-- already see THAT a sibling class existed (groups_select) but not read its
-- topics, its words, or its roster — exactly the data a cross-class rollup
-- screen needs. This migration makes the existing is_tenant_admin() grant
-- consistent across those tables. It does not add a new role, column, or
-- concept — see the two functions below, which are the only things this
-- migration changes.
--
-- Deliberately NOT touched: `user_word_srs_all_own`. FR-1.2 is explicit that
-- there is no teacher/admin exception for a student's own SRS scheduling
-- state ("A tutor must not be able to read or alter a student's scheduling
-- state" — 002_rls_policies.sql's own comment on that policy) and that must
-- remain true for a tenant admin too. A tenant-wide rollup can aggregate
-- through `group_word_heatmap()` (007), which already returns cohort-level
-- counts with no user_id column, never through this table directly.
--
-- Still open after this migration (unchanged from turn 12's note): there is
-- still no dedicated "director" job title distinct from group ADMIN in the
-- UI/UX or the schema, and `AnalyticsService.getHeatmap` still only accepts
-- one groupId — a tenant-wide aggregate endpoint is still new backend scope,
-- not shipped by this migration. This migration only unblocks the RLS layer
-- so that future endpoint has something to read.
-- =============================================================================

-- can_read_group: add the same is_tenant_admin() grant groups_select already
-- has. Cascades automatically to can_read_topic(), topics_select, and
-- topic_words_select, all of which call this function.
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

drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_group_role(group_id, 'WRITE')
    or public.is_tenant_admin(public.group_tenant_id(group_id))
  );
