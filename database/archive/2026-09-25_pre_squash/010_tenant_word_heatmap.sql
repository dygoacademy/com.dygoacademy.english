-- =============================================================================
-- Dygo Academy — 010_tenant_word_heatmap.sql
-- Module 8 (Phase 4), FR-8.2 "across cohorts" — the tenant-wide widening of
-- 007_group_word_heatmap.sql that turn 12's wireframe (16th pass) and turn
-- 12's own "Try next" line called out as still-open backend scope, and that
-- the 18th pass's standing note named as one of the two real, non-wireframe
-- options left before UAT (2026-09-02 morning).
--
-- WHY THIS WAS BLOCKED UNTIL NOW: 007's function checks
-- has_group_role(p_group_id, 'ADMIN') — a single-group gate by construction,
-- correct for "my class" but with no tenant-wide equivalent to call. 009
-- (17th pass) closed the READ-side RLS gap (a tenant admin can now read a
-- sibling group's topics/words/roster) but deliberately did not touch
-- review_logs or add a new aggregate function — that was explicitly left as
-- "still new backend scope" in 009's own header comment. This migration is
-- that scope, built the same way 007 was: a SECURITY DEFINER function that
-- re-checks the gate itself rather than trusting the caller.
--
-- WHY is_tenant_admin() AND NOT A NEW ROLE: 009's finding stands —
-- is_tenant_admin(tenant_id) already IS the tenant-wide/"director" role at
-- the RLS layer (caller holds ADMIN in any group of that tenant). Reusing it
-- here rather than inventing a `director` concept keeps this additive: no
-- new column, no new role enum value, same reasoning as 009.
--
-- WHY THIS DOESN'T RE-OPEN review_logs_select_own'S ISOLATION: same shape as
-- 007 — the only externally visible surface is aggregated attempt/failure
-- counts per word per group, never a user_id, never an individual review
-- row. Scoped to `g.tenant_id = p_tenant_id`, so a caller who is
-- is_tenant_admin() of their own tenant can never pull another tenant's rows
-- through this function — proven in rls_test.sql section K.
--
-- WHY group_id/group_name ARE ADDED COLUMNS NOT IN 007's SHAPE: a
-- single-group heatmap has no need to say which group a row belongs to (the
-- caller already knows — it's the one they asked for). A tenant-wide rollup
-- spans multiple classes by definition (that's the whole point of "across
-- cohorts"), so the director rollup screens (wireframe turns 12-14) need to
-- attribute each mistake row to a class. topic_title alone is not enough:
-- two different teachers' groups can legally reuse the same topic title.
-- =============================================================================

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
