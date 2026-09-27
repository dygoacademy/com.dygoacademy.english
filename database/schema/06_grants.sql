-- =============================================================================
-- Dygo Academy — schema/06_grants.sql
-- Table grants. RLS filters rows; grants decide whether a role may touch a
-- table at all — both are required.
--
-- Part of the squashed baseline schema (2026-09-25). It folds the final
-- state of migrations 001–021 into one ordered set; the originals live in
-- database/archive/2026-09-25_pre_squash/ for history. Run through
-- database/apply-migrations.sh, never by hand out of order:
--   01_extensions_types → 02_tables → 03_functions_triggers →
--   04_rls_policies → 05_indexes → 06_grants
-- =============================================================================

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

-- -----------------------------------------------------------------------------
-- service_role — background jobs with no signed-in user (014, 015).
-- DatabaseService.queryAsService switches into service_role for the
-- enrichment worker and the push dispatcher. Self-hosted Supabase's
-- bootstrap usually grants these already; these make it explicit.
-- -----------------------------------------------------------------------------

grant select, insert, update on public.master_lexicon to service_role;
grant select, insert, update on public.topic_words    to service_role;
grant select, update, delete on public.push_subscriptions to service_role;
