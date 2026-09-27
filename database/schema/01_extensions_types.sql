-- =============================================================================
-- Dygo Academy — schema/01_extensions_types.sql
-- Extensions and enumerated types.
--
-- Part of the squashed baseline schema (2026-09-25). It folds the final
-- state of migrations 001–021 into one ordered set; the originals live in
-- database/archive/2026-09-25_pre_squash/ for history. Run through
-- database/apply-migrations.sh, never by hand out of order:
--   01_extensions_types → 02_tables → 03_functions_triggers →
--   04_rls_policies → 05_indexes → 06_grants
-- =============================================================================

-- pgcrypto: digest() for invite-token hashing, crypt()/gen_salt() in seeds.
-- On the supabase/postgres image it already lives in the `extensions`
-- schema, so this is a no-op there; functions that call it pin
-- `search_path = public, extensions` (see hash_invite_token).
create extension if not exists pgcrypto;

-- pg_trgm: "did you mean" trigram search over master_lexicon.
create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- Enumerated types
-- -----------------------------------------------------------------------------

-- Role hierarchy is ADMIN > WRITE > READ (tech spec §4.1).
create type group_role as enum ('ADMIN', 'WRITE', 'READ');

create type seat_status as enum ('ACTIVE', 'REVOKED');

-- FAILED is not in the ERD, which lists only ENRICHING | READY. Added because
-- the BullMQ enrichment worker needs a terminal state for exhausted retries —
-- without it a permanently failing word is indistinguishable from one still in
-- the queue, and the frontend's status polling would spin forever.
create type word_status as enum ('ENRICHING', 'READY', 'FAILED');

create type cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

create type srs_rating as enum ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- FSRS-6 card state (Phase 10 — replaced SM-2). See fsrs-scheduler.ts.
create type public.fsrs_state as enum ('New', 'Learning', 'Review', 'Relearning');
