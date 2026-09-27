#!/usr/bin/env bash
# =============================================================================
# Dygo Academy — restore a backup made by reset-db.sh.
#
#   ./database/restore-db.sh database/backups/dygo-YYYYMMDD-HHMMSS.dump
#
# Wipes the current database volume (asks first), starts ONLY Postgres, restores
# the dump (auth accounts included), then starts everything else. GoTrue is kept
# off during the restore so it doesn't race to recreate auth tables. Compares row
# counts with the .counts file written at backup time.
#
# pg_restore usually prints a few harmless errors for objects the Supabase image
# already created itself (extensions, schemas). The row-count check at the end
# is what tells you whether the restore worked.
# =============================================================================
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"
DB="${DYGO_DB_CONTAINER:-dygo_supabase_db}"
DUMP="${1:-}"
[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "usage: $0 <backup .dump file>"; ls -1t "$DIR"/backups/*.dump 2>/dev/null | head -5 | sed 's/^/  /'; exit 1; }
DUMP="$(cd "$(dirname "$DUMP")" && pwd)/$(basename "$DUMP")"
cd "$ROOT"

echo "This replaces the CURRENT database with $(basename "$DUMP")."
read -r -p "Type RESTORE to continue: " answer
[ "$answer" = "RESTORE" ] || { echo "aborted."; exit 1; }

if command -v pm2 >/dev/null 2>&1 && pm2 describe dygo-backend >/dev/null 2>&1; then pm2 stop dygo-backend >/dev/null; fi

VOLUME="$(docker inspect "$DB" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')"
docker compose stop
docker compose rm -f supabase-db
docker volume rm "$VOLUME"
docker compose up -d supabase-db
printf 'waiting for Postgres'
for _ in $(seq 1 90); do docker exec "$DB" pg_isready -U postgres -h localhost >/dev/null 2>&1 && break; printf '.'; sleep 2; done; echo

echo "restoring..."
docker exec -i "$DB" pg_restore -U postgres -d postgres --clean --if-exists < "$DUMP" 2> "$DUMP.restore.log" || true
echo "  pg_restore messages: $(grep -c . "$DUMP.restore.log" || true) lines (see ${DUMP#$ROOT/}.restore.log)"

docker compose up -d
if command -v pm2 >/dev/null 2>&1 && pm2 describe dygo-backend >/dev/null 2>&1; then pm2 restart dygo-backend >/dev/null; fi

if [ -f "$DUMP.counts" ]; then
  echo "row counts (backup → now):"
  ok=1
  while read -r table expected; do
    [ -n "$table" ] || continue
    got="$(docker exec -i "$DB" psql -U postgres -d postgres -tA -c "select count(*) from $table" | tr -d '[:space:]')"
    mark="ok"; [ "$got" = "$expected" ] || { mark="MISMATCH"; ok=0; }
    printf '  %-14s %6s → %-6s %s\n' "$table" "$expected" "$got" "$mark"
  done < "$DUMP.counts"
  [ $ok -eq 1 ] && echo "restore verified." || echo "WARNING: some counts differ — check the log above."
fi
