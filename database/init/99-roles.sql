-- Give the Supabase service roles a password matching POSTGRES_PASSWORD.
--
-- The supabase/postgres image CREATES these roles but leaves them without a
-- usable password; upstream supplies this as an init script. Without it,
-- GoTrue / Storage / PostgREST all fail SASL auth with SQLSTATE 28P01
-- ("password authentication failed for user ...").
--
-- Driven off pg_roles via \gexec so a role that doesn't exist in a given
-- image version is skipped rather than aborting init under ON_ERROR_STOP.
-- (Note: psql does NOT interpolate :'vars' inside dollar-quoted blocks,
-- which is why this is \gexec and not a DO $$ ... $$ block.)

\set pgpass `echo "$POSTGRES_PASSWORD"`

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', rolname, :'pgpass')
FROM pg_roles
WHERE rolname IN (
  'authenticator',
  'pgbouncer',
  'supabase_auth_admin',
  'supabase_functions_admin',
  'supabase_storage_admin'
)
ORDER BY rolname
\gexec
