-- =============================================================================
-- Dygo Academy — schema/05_indexes.sql
-- Partial and performance indexes.
-- Naming: idx_[table]_[columns]_[condition] (tech spec §3.1).
--
-- Part of the squashed baseline schema (2026-09-25). It folds the final
-- state of migrations 001–021 into one ordered set; the originals live in
-- database/archive/2026-09-25_pre_squash/ for history. Run through
-- database/apply-migrations.sh, never by hand out of order:
--   01_extensions_types → 02_tables → 03_functions_triggers →
--   04_rls_policies → 05_indexes → 06_grants
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SRS due-card retrieval — the p95 < 15ms SLO (BRD §6, FR-3.4)
--
-- CORRECTION TO SPEC. Both the schedule doc (§2 Phase 0) and the architecture
-- doc (§5) specify:
--
--     CREATE INDEX idx_srs_due_fast ON public.user_word_srs (user_id, next_due_at)
--     WHERE next_due_at <= NOW();
--
-- That statement does not execute. PostgreSQL rejects it with:
--     ERROR:  functions in index predicate must be marked IMMUTABLE
-- because NOW() is STABLE, not IMMUTABLE — a predicate that changes meaning
-- every second cannot describe a fixed set of rows on disk.
--
-- The plain composite index below serves the same query
--     WHERE user_id = $1 AND next_due_at <= now()
-- as an index range scan: equality on the leading column, range on the second.
-- That is exactly the access pattern the partial index was reaching for, and
-- it has the advantage of also serving "what is due tomorrow" look-aheads.
-- -----------------------------------------------------------------------------
create index idx_user_word_srs_user_next_due
  on public.user_word_srs (user_id, next_due_at);

-- Leech remedial queue (FR-3.3). Genuinely partial — is_leech is a stored
-- boolean, so the predicate is immutable and the index stays tiny.
create index idx_user_word_srs_user_leech
  on public.user_word_srs (user_id)
  where is_leech;

create index idx_user_word_srs_topic_word_id
  on public.user_word_srs (topic_word_id);

-- -----------------------------------------------------------------------------
-- master_lexicon — the >85% cache-hit lookup (FR-2.2)
-- The unique constraint on (normalized_word, language_code) already provides
-- the index for exact lookups, so no duplicate is created here.
-- Trigram index supports "did you mean" search over the global dictionary.
-- -----------------------------------------------------------------------------
create index idx_master_lexicon_normalized_word_trgm
  on public.master_lexicon using gin (normalized_word gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Enrichment worker scan: find words still awaiting AI processing.
-- -----------------------------------------------------------------------------
create index idx_topic_words_status_enriching
  on public.topic_words (created_at)
  where status = 'ENRICHING';

create index idx_topic_words_topic_id        on public.topic_words (topic_id);
create index idx_topic_words_lexicon_id      on public.topic_words (lexicon_id);

-- -----------------------------------------------------------------------------
-- RBAC lookups. These back the helper functions in 002, which run on virtually
-- every authenticated query — they matter more than their size suggests.
-- -----------------------------------------------------------------------------
create index idx_group_members_user_id       on public.group_members (user_id);
create index idx_group_members_group_role    on public.group_members (group_id, role);

create index idx_groups_tenant_id            on public.groups (tenant_id);
create index idx_groups_is_public            on public.groups (id) where is_public;

create index idx_topics_group_id             on public.topics (group_id);
create index idx_topics_is_public            on public.topics (id) where is_public;

-- -----------------------------------------------------------------------------
-- Invite redemption: looked up by token hash, filtered to live invites.
-- revoked_at IS NULL is immutable; expiry is checked in the query, not here.
-- -----------------------------------------------------------------------------
create index idx_group_invites_token_active
  on public.group_invites (token_hash)
  where revoked_at is null;

create index idx_group_invites_group_id      on public.group_invites (group_id);

-- -----------------------------------------------------------------------------
-- Analytics (Module 8). Indexes are created on the parent partitioned table so
-- every existing and future partition inherits them automatically.
-- -----------------------------------------------------------------------------
create index idx_review_logs_user_reviewed_at
  on public.review_logs (user_id, reviewed_at desc);

create index idx_review_logs_topic_word_id
  on public.review_logs (topic_word_id, reviewed_at desc);

-- -----------------------------------------------------------------------------
-- Notification cron (FR-6.1): every 15 minutes, find enabled schedules.
-- -----------------------------------------------------------------------------
create index idx_study_schedules_enabled_time
  on public.study_schedules (reminder_time)
  where is_enabled;

create index idx_push_subscriptions_user_id  on public.push_subscriptions (user_id);

-- -----------------------------------------------------------------------------
-- Tenancy
-- -----------------------------------------------------------------------------
create index idx_profiles_tenant_id          on public.profiles (tenant_id);
create index idx_tenant_seats_tenant_status  on public.tenant_seats (tenant_id, status);
create index idx_tenant_seats_user_id        on public.tenant_seats (user_id);

-- -----------------------------------------------------------------------------
-- Phase 10 (FSRS)
-- -----------------------------------------------------------------------------
-- Leech detection counts graded AGAIN rows per word in a rolling 7 days.
create index review_logs_leech_window_idx
  on public.review_logs (topic_word_id, reviewed_at)
  where rating = 'AGAIN' and graded;

-- Mastery reads (tier ladder, collection rings, stats) filter on mastered_at.
create index user_word_srs_mastered_idx
  on public.user_word_srs (user_id)
  where mastered_at is not null;
