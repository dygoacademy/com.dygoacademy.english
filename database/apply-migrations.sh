#!/usr/bin/env bash
# =============================================================================
# Apply Dygo Academy database migrations to the local Docker Postgres.
#
#   ./database/apply-migrations.sh              # schema + RLS + indexes (001-003)
#   ./database/apply-migrations.sh --seed       # ...plus development fixtures (004)
#   ./database/apply-migrations.sh --test       # ...plus fixtures, then RLS suite
#
#   ./database/apply-migrations.sh --seed-only  # ONLY 004, on an already-migrated db
#   ./database/apply-migrations.sh --test-only  # ONLY the RLS suite
#   ./database/apply-migrations.sh --verify     # report what is actually installed
#
# 001-003 are NOT idempotent (plain CREATE, not CREATE IF NOT EXISTS), so
# re-running them on a migrated database fails on "already exists". Use the
# --*-only flags to add fixtures or run tests without touching the schema, or
# reset entirely with:  docker compose down -v && docker compose up -d
#
# 005-007 (invite redemption, solo-tenant provisioning, the FR-8.2 heatmap
# function) all use CREATE OR REPLACE FUNCTION, so unlike 001-003 they ARE
# safe to re-run on an already-migrated database if you only need to pick up
# a change to one of them.
# =============================================================================
set -euo pipefail

CONTAINER="${DYGO_DB_CONTAINER:-dygo_supabase_db}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

psql_run() {
  docker exec -i "$CONTAINER" psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 "$@"
}

run_file() {
  echo "→ $(basename "$1")"
  psql_run < "$1"
}

verify() {
  echo "→ verifying installed objects"
  psql_run -t <<'SQL'
select '  tables            : ' || count(*)
  from pg_class where relnamespace='public'::regnamespace and relkind in ('r','p');
select '  RLS policies      : ' || count(*) from pg_policies where schemaname='public';
select '  indexes           : ' || count(*) from pg_indexes where schemaname='public';
select '  tables without RLS: ' || coalesce(string_agg(relname, ', '), 'none  <-- good')
  from pg_class
 where relnamespace='public'::regnamespace and relkind in ('r','p')
   and not relrowsecurity and relname not like 'review_logs_%';
select '  seeded tenants    : ' || count(*) from public.tenants;
select '  seeded profiles   : ' || count(*) from public.profiles;
SQL
}

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "error: container '$CONTAINER' is not running. Start it with: docker compose up -d" >&2
  exit 1
fi

case "${1:-}" in
  --verify)
    verify; exit 0 ;;
  --seed-only)
    run_file "$DIR/migrations/004_seed_data.sql"; verify; echo "done."; exit 0 ;;
  --test-only)
    # The suite asserts exact row counts, so it is meaningless without fixtures.
    if [ "$(psql_run -t -c 'select count(*) from public.tenants' | tr -d '[:space:]')" = "0" ]; then
      echo "error: no seed data present — run --seed-only first, or the assertions" >&2
      echo "       will fail on empty tables rather than on a real policy bug." >&2
      exit 1
    fi
    echo "→ rls_test.sql"
    psql_run < "$DIR/tests/rls_test.sql"
    echo "done."; exit 0 ;;
esac

run_file "$DIR/migrations/001_initial_schema.sql"
run_file "$DIR/migrations/002_rls_policies.sql"
run_file "$DIR/migrations/003_indexes.sql"
run_file "$DIR/migrations/005_group_invites_redeem.sql"
run_file "$DIR/migrations/006_solo_tenant_provisioning.sql"
run_file "$DIR/migrations/007_group_word_heatmap.sql"
run_file "$DIR/migrations/008_profiles_group_visibility.sql"

case "${1:-}" in
  --seed)
    run_file "$DIR/migrations/004_seed_data.sql" ;;
  --test)
    run_file "$DIR/migrations/004_seed_data.sql"
    echo "→ rls_test.sql"
    psql_run < "$DIR/tests/rls_test.sql" ;;
esac

verify
echo "done."
