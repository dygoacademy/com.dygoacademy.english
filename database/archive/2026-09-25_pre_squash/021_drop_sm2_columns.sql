-- =============================================================================
-- 021 — Drop SM-2 columns (Phase 10, Workstream 4 step D) — IRREVERSIBLE
--
-- DO NOT RUN until the FSRS scheduler (019 + 020 + the Phase 10 backend) has
-- been live on production and verified for at least a week. It is
-- deliberately NOT part of apply-migrations.sh's default flow; run it with
--   ./database/apply-migrations.sh --drop-sm2-only
--
-- review_logs.ease_factor_after / interval_days_after are intentionally kept
-- as historical record; nothing writes them any more.
-- =============================================================================

alter table public.user_word_srs
  drop column if exists ease_factor,
  drop column if exists interval_days,
  drop column if exists repetitions,
  drop column if exists fsrs_backfilled;
