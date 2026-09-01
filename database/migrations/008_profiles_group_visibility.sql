-- =============================================================================
-- Dygo Academy — 008_profiles_group_visibility.sql
-- Closes the standing "roster shows no name for an invite-redeemed member"
-- gap, precisely diagnosed (not fixed) in 006_solo_tenant_provisioning.sql's
-- own header comment and carried forward as an open item through the 6th
-- through 9th pass session reports.
--
-- ROOT CAUSE, restated precisely (006 already worked this out):
-- profiles_select_self_or_tenant (002_rls_policies.sql) is
--   id = auth.uid() or (tenant_id is not null and tenant_id = current_user_tenant_id())
-- Every profile has its OWN tenant now (006 auto-provisions one per signup),
-- including a student who joined a class via an invite link — but that
-- student's tenant is deliberately their own personal tenant, not the
-- inviting teacher's. Tenants are the billing boundary (a student joining
-- a class must not silently become part of the teacher's paid seat count),
-- so tenant equality was never going to be the right visibility test for
-- "can a teacher see this student's name." Group *membership* is the right
-- test — a teacher should see the name of anyone actually on their roster,
-- regardless of which tenant that person's own account happens to belong to.
--
-- GroupsService.listMembers (groups.service.ts) already does the correct
-- query shape — `left join public.profiles p on p.id = gm.user_id` — and
-- runs it as the authenticated caller (RLS applies to API traffic, per this
-- codebase's own standing rule; see database/README or GroupsService's own
-- comments). The left join was always going to return every group_members
-- row; the bug was that profiles_select_self_or_tenant made the profiles
-- side of that join come back null for anyone outside the caller's tenant,
-- indistinguishable from a genuinely deleted profile.
--
-- WHY A NEW HELPER FUNCTION AND NOT AN INLINE SUBQUERY IN THE POLICY:
-- Matches has_group_role/can_read_group/can_read_topic — every existing
-- profiles/groups policy in 002_rls_policies.sql already delegates to a
-- small SECURITY DEFINER function rather than repeating a subquery inline,
-- specifically so group_members' own RLS (group_members_select, which is
-- itself membership-gated) never has to be evaluated recursively while
-- profiles_select_self_or_tenant is being evaluated. SECURITY DEFINER here
-- means the function runs as its owner (the migration role, which owns the
-- table) and therefore bypasses group_members_select entirely for this one
-- narrow membership check — the same bypass has_group_role already relies
-- on, not a new kind of privilege escalation.
--
-- WHAT THIS DOES NOT CHANGE: review_logs_select_own is untouched. Seeing a
-- classmate's *name* and seeing their *review history* are different
-- permissions — this migration only widens the former. A READ member still
-- cannot enumerate the roster at all (group_members_select still requires
-- WRITE+), so a student gaining "can see teacher's/co-student's name IF we
-- share a group" adds no new enumeration surface beyond what the roster
-- endpoint already exposes to WRITE/ADMIN callers.
-- =============================================================================

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

drop policy if exists profiles_select_self_or_tenant on public.profiles;

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
