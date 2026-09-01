-- =============================================================================
-- Dygo Academy — 007_group_word_heatmap.sql
-- Module 8 (Phase 4), FR-8.2 — teacher/academy mistake heatmap.
--
-- WHY THIS NEEDS A NEW FUNCTION AND CAN'T JUST BE A queryAs() CALL:
-- review_logs_select_own (002_rls_policies.sql) restricts every review_logs
-- row to `user_id = auth.uid()` — no ADMIN exception. That policy's own
-- comment already anticipates exactly this feature:
--
--   "review_logs — owner-only. Module 8 cohort heatmaps read aggregates as
--   service_role; they must never be served by widening this policy to
--   teachers, which would expose per-student review histories rather than
--   aggregate error rates."
--
-- rls_test.sql section B proves the same thing from the other direction:
-- "Even the group ADMIN cannot read a student's review history" — a plain
-- AnalyticsService.queryAs() call joining review_logs would see zero rows
-- for every student but the caller, the same as that assertion.
--
-- WHY A SECURITY DEFINER FUNCTION, NOT DATABASE_ADMIN_URL:
-- Same reasoning as 005_group_invites_redeem.sql's own header comment for
-- redeem_group_invite(): the admin superuser connection can DROP TABLE.
-- Reusing it here to serve a routine per-request read would mean any bug
-- in AnalyticsService has that connection's full blast radius. A narrow,
-- auditable function scoped to exactly "aggregate counts for one group's
-- topics" is the established pattern in this codebase for "a caller needs
-- to see past a policy that's correctly hiding rows from them."
--
-- WHY THIS DOESN'T RE-OPEN THE ISOLATION HOLE review_logs_select_own EXISTS
-- TO PREVENT: the function's only externally visible surface is aggregated
-- attempt/failure counts PER WORD — no user_id, no individual review row,
-- no timestamp. A teacher reading this output learns "12 students got
-- 'ephemeral' wrong 9 times total," never "Alex got it wrong on Tuesday."
-- That is the exact aggregate/individual line the policy comment draws.
--
-- The ADMIN check lives INSIDE this function, not only in
-- AnalyticsService — the bypass of review_logs_select_own must never be
-- reachable without it, even if the application-layer has_group_role()
-- check above it were ever removed or skipped by a bug.
--
-- No ORDER BY / LIMIT here on purpose: ranking (failure_rate computation,
-- worst-first sort, top-N cap) is business logic, kept in
-- heatmap-aggregator.ts as a pure, unit-tested function — same "DB does
-- I/O, a plain TS module does the math" split as srs-algorithm.ts and
-- quiz-generator.ts. This function's only job is the RLS-bypassing
-- aggregate fetch itself.
-- =============================================================================

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
