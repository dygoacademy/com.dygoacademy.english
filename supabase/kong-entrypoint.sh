#!/bin/sh
set -eu
# Kong does NOT expand environment variables inside a declarative config file,
# so supabase/kong.yml is a template rendered here first.
#
# Upstream used `eval "echo \"$(cat ...)\""` and has since moved away from it,
# because eval strips double quotes and mangles any `Header: value` pattern that
# YAML would otherwise read as a mapping. Plain sed on the two known
# placeholders avoids that whole class of quoting bugs.
#
# Rendered to /tmp because Kong runs as the non-root `kong` user.
OUT=/tmp/kong.yml

: "${SUPABASE_ANON_KEY:?kong-entrypoint: SUPABASE_ANON_KEY is empty or unset}"
: "${SUPABASE_SERVICE_KEY:?kong-entrypoint: SUPABASE_SERVICE_KEY is empty or unset}"

sed -e "s|\${SUPABASE_ANON_KEY}|${SUPABASE_ANON_KEY}|g" \
    -e "s|\${SUPABASE_SERVICE_KEY}|${SUPABASE_SERVICE_KEY}|g" \
    /home/kong/temp.yml > "$OUT"

# Fail loudly rather than starting Kong with a placeholder as the API key.
if grep -q '\${SUPABASE_' "$OUT"; then
  echo "kong-entrypoint: unsubstituted placeholder left in $OUT" >&2
  grep -n '\${SUPABASE_' "$OUT" >&2
  exit 1
fi

export KONG_DECLARATIVE_CONFIG="$OUT"

# NOTE: kong/kong:3.9.1 ships /entrypoint.sh. The Docker Official `kong` image
# (used before the 3.x switch) had /docker-entrypoint.sh — calling that path
# here is what produced the `Restarting (127)` loop.
exec /entrypoint.sh kong docker-start
