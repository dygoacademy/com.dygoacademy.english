#!/usr/bin/env bash
# =============================================================================
# Dygo Academy — back up, wipe and rebuild the database from scratch.
#
#   ./database/reset-db.sh               # backup → confirm (type RESET) → wipe → schema + all seeds
#   ./database/reset-db.sh --no-seed     # ...schema only, no test data
#   ./database/reset-db.sh --yes         # skip the confirmation prompt (backup is still taken)
#   ./database/reset-db.sh --keep-redis  # don't clear Redis (queued jobs / caches)
#
# What it does, in order:
#   1. Full backup of the current database to database/backups/ (pg_dump -Fc),
#      checked readable before anything is deleted. Restore with
#      ./database/restore-db.sh <file>.
#   2. Stops the backend (pm2 "dygo-backend") if pm2 is running it.
#   3. Deletes the Postgres Docker volume, i.e. EVERYTHING in the database:
#      accounts, groups, words, reviews. Supabase re-bootstraps a clean
#      database on the next start (auth schema, roles, database/init/*.sql).
#   4. Waits for GoTrue to create auth.users, then runs apply-migrations.sh.
#   5. Clears Redis (BullMQ jobs would otherwise point at deleted rows).
#   6. Restarts the backend.
#
# Object storage (MinIO / R2 audio files) is NOT touched.
# =============================================================================
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"
DB="${DYGO_DB_CONTAINER:-dygo_supabase_db}"
REDIS="${DYGO_REDIS_CONTAINER:-dygo_redis}"
BACKEND_PM2="dygo-backend"

SEED_FLAG=""; ASSUME_YES=0; KEEP_REDIS=0
for arg in "$@"; do
  case "$arg" in
    --no-seed)    SEED_FLAG="--no-seed" ;;
    --yes)        ASSUME_YES=1 ;;
    --keep-redis) KEEP_REDIS=1 ;;
    *) sed -n '2,23p' "$0"; exit 1 ;;
  esac
done

cd "$ROOT"
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
q()   { docker exec -i "$DB" psql -U postgres -d postgres -tA -c "$1" | tr -d '[:space:]'; }

docker ps --format '{{.Names}}' | grep -qx "$DB" \
  || { echo "error: container '$DB' is not running — start it with: docker compose up -d" >&2; exit 1; }

# --- 1. Backup ---------------------------------------------------------------
say "1/6  Backing up the current database"
mkdir -p "$DIR/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$DIR/backups/dygo-$STAMP.dump"
docker exec "$DB" pg_dump -U postgres -d postgres -Fc > "$BACKUP"
docker exec -i "$DB" pg_restore -l < "$BACKUP" > /dev/null \
  || { echo "error: backup $BACKUP is not readable — aborting, nothing was deleted." >&2; exit 1; }
# Row counts, so restore-db.sh can check it got everything back.
COUNTS="$(docker exec -i "$DB" psql -U postgres -d postgres -tA -F' ' <<'SQL' 2>/dev/null || true
select 'auth.users', count(*) from auth.users
union all select 'profiles', count(*) from public.profiles
union all select 'groups', count(*) from public.groups
union all select 'topic_words', count(*) from public.topic_words
union all select 'user_word_srs', count(*) from public.user_word_srs
union all select 'review_logs', count(*) from public.review_logs;
SQL
)"
printf '%s\n' "$COUNTS" > "$BACKUP.counts"
echo "  saved $(du -h "$BACKUP" | cut -f1) → ${BACKUP#$ROOT/}"
printf '%s\n' "$COUNTS" | sed 's/^/    /'

# --- Confirm -----------------------------------------------------------------
if [ $ASSUME_YES -eq 0 ]; then
  echo
  echo "This permanently deletes EVERY account, group, word and review in the database."
  echo "The backup above is your only way back:  ./database/restore-db.sh ${BACKUP#$ROOT/}"
  read -r -p "Type RESET to continue: " answer
  [ "$answer" = "RESET" ] || { echo "aborted — nothing was deleted (the backup is kept)."; exit 1; }
fi

# --- 2. Stop the backend -----------------------------------------------------
# Only a backend that is ONLINE now gets stopped and restarted at the end. If
# you stopped it yourself (e.g. to build new code first), it stays stopped.
STOPPED_BACKEND=0
if command -v pm2 >/dev/null 2>&1 && pm2 describe "$BACKEND_PM2" 2>/dev/null | grep -qE "status[^a-z]+online"; then
  say "2/6  Stopping $BACKEND_PM2 (pm2) — it will be restarted at the end"
  pm2 stop "$BACKEND_PM2" >/dev/null && STOPPED_BACKEND=1
else
  say "2/6  $BACKEND_PM2 is not running under pm2 — leaving it stopped"
fi

# --- 3. Wipe -----------------------------------------------------------------
say "3/6  Deleting the database volume"
VOLUME="$(docker inspect "$DB" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')"
[ -n "$VOLUME" ] || { echo "error: could not find $DB's data volume." >&2; exit 1; }
docker compose stop
docker compose rm -f supabase-db
docker volume rm "$VOLUME"
echo "  removed volume $VOLUME"

# --- 4. Rebuild --------------------------------------------------------------
say "4/6  Starting a fresh database and rebuilding"
docker compose up -d
printf '  waiting for Postgres'
for _ in $(seq 1 90); do
  docker exec "$DB" pg_isready -U postgres -h localhost >/dev/null 2>&1 && break
  printf '.'; sleep 2
done; echo
# GoTrue creates auth.users with its own migrations after Postgres is up. The
# seeds write GoTrue columns, so wait until the latest ones exist.
printf '  waiting for GoTrue (auth.users)'
for _ in $(seq 1 90); do
  [ "$(q "select count(*) from information_schema.columns where table_schema='auth' and table_name='users' and column_name in ('reauthentication_token','is_anonymous')" 2>/dev/null || echo 0)" = "2" ] && break
  printf '.'; sleep 2
done; echo
[ "$(q "select to_regclass('auth.users') is not null")" = "t" ] \
  || { echo "error: auth.users never appeared — check: docker logs dygo_supabase_auth" >&2; exit 1; }
"$DIR/apply-migrations.sh" $SEED_FLAG

# --- 5. Redis ----------------------------------------------------------------
if [ $KEEP_REDIS -eq 0 ] && docker ps --format '{{.Names}}' | grep -qx "$REDIS"; then
  say "5/6  Clearing Redis (queued jobs and caches for deleted rows)"
  docker exec "$REDIS" redis-cli FLUSHALL >/dev/null && echo "  flushed"
else
  say "5/6  Redis left as is"
fi

# --- 6. Backend --------------------------------------------------------------
if [ $STOPPED_BACKEND -eq 1 ]; then
  say "6/6  Restarting $BACKEND_PM2"
  pm2 restart "$BACKEND_PM2" >/dev/null && echo "  restarted"
else
  say "6/6  Backend left stopped — build and start it when ready"
fi

say "Done. Fresh database is up."
echo "  Backup of the old one: ${BACKUP#$ROOT/}"
[ -z "$SEED_FLAG" ] && echo "  Sign in with a fixture account, e.g. sarah@dygo.test / dygo-dev-2026"
[ -z "$SEED_FLAG" ] && echo "  Seed words have no audio yet. Once the backend is running:  cd com.dygoacademy.backend && npm run audio-backfill:prod"
