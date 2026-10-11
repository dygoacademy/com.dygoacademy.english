#!/usr/bin/env bash
# =============================================================================
# Dygo Academy — build the database from database/schema, migrations and seeds.
#
#   ./database/apply-migrations.sh                  # EMPTY db: schema + migrations/ + every seed
#   ./database/apply-migrations.sh --no-seed        # EMPTY db: schema + migrations/ only
#   ./database/apply-migrations.sh --migrations     # EXISTING db: apply pending migrations/ files only
#   ./database/apply-migrations.sh --seed NAME...   # EXISTING db: load seeds by name, e.g. 03_qa_tenant
#   ./database/apply-migrations.sh --test           # RLS suite in a throwaway database (never touches yours)
#   ./database/apply-migrations.sh --verify         # report what is installed
#
# To wipe and rebuild an existing database, use ./database/reset-db.sh
# (it backs up first and then calls this script).
#
# Layout
#   schema/      squashed baseline (2026-09-25): final state of old 001–021
#   migrations/  changes made AFTER the baseline, applied once each, in name
#                order, and recorded in dygo_meta.applied_migrations
#   seeds/       test/demo data, loaded in name order
#   archive/     the pre-squash migrations, for history only; never run
#
# psql runs inside the Supabase Postgres container as `postgres`. Override for
# a non-Docker Postgres with DYGO_PSQL, e.g. DYGO_PSQL="psql -h localhost -U postgres".
# =============================================================================
set -euo pipefail

CONTAINER="${DYGO_DB_CONTAINER:-dygo_supabase_db}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASELINE_TAG="00_baseline_2026-09-25"
# Seed order matters: 02 needs 01; 04 and 05 need 03.
SEEDS=(01_core_fixtures 02_tier_ladder 03_qa_tenant 04_qa_words 05_hello_world_word 06_onboarded_fixtures)

# psql against database $1 (default: postgres), reading SQL from stdin.
psql_db() {
  local db="${1:-postgres}"; shift || true
  if [ -n "${DYGO_PSQL:-}" ]; then
    $DYGO_PSQL -d "$db" -q -v ON_ERROR_STOP=1 "$@"
  else
    docker exec -i "$CONTAINER" psql -U postgres -d "$db" -q -v ON_ERROR_STOP=1 "$@"
  fi
}
psql_run() { psql_db postgres "$@"; }
scalar()   { psql_run -tA -c "$1" | tr -d '[:space:]'; }

run_file() {   # run_file <file> [db]
  echo "  → ${1#$DIR/}"
  psql_db "${2:-postgres}" < "$1"
}

require_db() {
  if [ -z "${DYGO_PSQL:-}" ] && ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    echo "error: container '$CONTAINER' is not running. Start it with: docker compose up -d" >&2
    exit 1
  fi
}

is_empty() { [ "$(scalar "select to_regclass('public.tenants') is null")" = "t" ]; }

ensure_meta() {
  psql_run <<'SQL'
set client_min_messages to warning;
create schema if not exists dygo_meta;
create table if not exists dygo_meta.applied_migrations (
  name       text primary key,
  applied_at timestamptz not null default now()
);
comment on schema dygo_meta is
  'Bookkeeping for database/apply-migrations.sh: which baseline and migrations/ files are applied.';
SQL
}

apply_schema() {
  echo "Schema (baseline):"
  for f in "$DIR"/schema/*.sql; do run_file "$f"; done
  ensure_meta
  psql_run -c "insert into dygo_meta.applied_migrations (name) values ('$BASELINE_TAG') on conflict do nothing"
}

apply_pending_migrations() {
  ensure_meta
  local any=0
  shopt -s nullglob
  for f in "$DIR"/migrations/*.sql; do
    local name; name="$(basename "$f" .sql)"
    if [ "$(scalar "select count(*) from dygo_meta.applied_migrations where name = '$name'")" = "0" ]; then
      [ $any -eq 0 ] && echo "Migrations:"; any=1
      # Apply and record in one transaction, so a failed file is never marked applied.
      { echo "begin;"; cat "$f"; echo ";"; echo "insert into dygo_meta.applied_migrations (name) values ('$name');"; echo "commit;"; } | psql_run
      echo "  → migrations/$name.sql"
    fi
  done
  shopt -u nullglob
  [ $any -eq 0 ] && echo "Migrations: none pending."
  return 0
}

apply_seeds() {
  echo "Seeds:"
  for s in "$@"; do
    local f="$DIR/seeds/$s.sql"
    [ -f "$f" ] || { echo "error: no seed named '$s' (have: ${SEEDS[*]})" >&2; exit 1; }
    run_file "$f"
  done
}

verify() {
  echo "Installed:"
  psql_run -tA <<'SQL'
select '  tables             : ' || count(*)
  from pg_class where relnamespace='public'::regnamespace and relkind in ('r','p');
select '  RLS policies       : ' || count(*) from pg_policies where schemaname='public';
select '  indexes            : ' || count(*) from pg_indexes where schemaname='public';
select '  tables without RLS : ' || coalesce(string_agg(relname, ', '), 'none  <-- good')
  from pg_class
 where relnamespace='public'::regnamespace and relkind in ('r','p')
   and not relrowsecurity and relname not like 'review_logs_%';
select '  accounts / tenants : ' || (select count(*) from public.profiles) || ' / ' || (select count(*) from public.tenants);
select '  topics / words     : ' || (select count(*) from public.topics) || ' / ' || (select count(*) from public.topic_words);
select '  applied            : ' || coalesce(string_agg(name, ', ' order by name), '(none)')
  from dygo_meta.applied_migrations;
SQL
}

# The RLS suite asserts exact row counts against ONLY the core fixtures, so it
# runs in a scratch database built from scratch, then dropped — your real
# database is never touched.
run_rls_suite() {
  local scratch="dygo_rls_scratch"
  echo "RLS suite in throwaway database '$scratch':"
  psql_run -c "drop database if exists $scratch" -c "create database $scratch"
  trap 'psql_run -c "drop database if exists '"$scratch"'" >/dev/null 2>&1 || true' EXIT
  run_file "$DIR/tests/00_supabase_stub.sql" "$scratch"
  for f in "$DIR"/schema/*.sql; do run_file "$f" "$scratch"; done
  run_file "$DIR/seeds/01_core_fixtures.sql" "$scratch"
  run_file "$DIR/tests/rls_test.sql" "$scratch"
  # UI-6 retention (U6-1): the migration is self-contained, so apply it on top
  # of the core fixtures and run its own RLS assertions.
  run_file "$DIR/migrations/20261001_retention.sql" "$scratch"
  run_file "$DIR/tests/rls_retention_test.sql" "$scratch"
  # Phase 13 speaking tables: self-contained too (needs only the schema
  # and core fixtures); the second file makes items per word.
  run_file "$DIR/migrations/20261004_speaking.sql" "$scratch"
  run_file "$DIR/migrations/20261004_speaking_per_word.sql" "$scratch"
  run_file "$DIR/migrations/20261005_speaking_mark_unclear.sql" "$scratch"
  run_file "$DIR/tests/rls_speaking_test.sql" "$scratch"
  # Option 2 audio load times (insert-own only, nobody signed in reads).
  run_file "$DIR/migrations/20261004_media_load_events.sql" "$scratch"
  run_file "$DIR/tests/rls_media_load_events_test.sql" "$scratch"
  # Phase 13 speaking entry points (SPEAK missions, harvests, Echo totals).
  run_file "$DIR/migrations/20261006_speaking_entry_points.sql" "$scratch"
  run_file "$DIR/tests/rls_speaking_entry_test.sql" "$scratch"
  # Pronunciation: pollinated at 80+ (D-3, 2026-10-11).
  run_file "$DIR/migrations/20261011_pronunciation_pollinate.sql" "$scratch"
  run_file "$DIR/tests/rls_pronunciation_test.sql" "$scratch"
  # Onboarding OB1–OB5: profile columns + backfill of the fixtures as onboarded.
  run_file "$DIR/migrations/20261008_onboarding.sql" "$scratch"
  run_file "$DIR/tests/rls_onboarding_test.sql" "$scratch"
}

# -----------------------------------------------------------------------------
require_db
case "${1:-}" in
  "")
    is_empty || { echo "error: the database already has a schema. Use ./database/reset-db.sh to wipe and rebuild, or --migrations to apply new changes." >&2; exit 1; }
    apply_schema; apply_pending_migrations; apply_seeds "${SEEDS[@]}"; verify ;;
  --no-seed)
    is_empty || { echo "error: the database already has a schema. Use ./database/reset-db.sh --no-seed." >&2; exit 1; }
    apply_schema; apply_pending_migrations; verify ;;
  --migrations)
    is_empty && { echo "error: empty database — run without flags to build it first." >&2; exit 1; }
    apply_pending_migrations; verify ;;
  --seed)
    shift; [ $# -gt 0 ] || { echo "usage: --seed NAME... (have: ${SEEDS[*]})" >&2; exit 1; }
    apply_seeds "$@"; verify ;;
  --test)
    run_rls_suite ;;
  --verify)
    verify ;;
  *)
    sed -n '2,24p' "$0"; exit 1 ;;
esac
echo "done."
