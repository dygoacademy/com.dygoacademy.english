# database/

Everything that builds the Dygo Postgres database. Run all commands from the repo root, with `docker compose up -d` running.

| Command | What it does |
| :--- | :--- |
| `./database/reset-db.sh` | **Start over.** Backs up, asks you to type `RESET`, deletes the database volume, rebuilds schema + all seeds, clears Redis, restarts the backend. `--no-seed` for an empty app, `--yes` to skip the prompt. |
| `./database/restore-db.sh database/backups/<file>.dump` | Put a backup made by `reset-db.sh` back. Checks row counts afterwards. |
| `./database/apply-migrations.sh` | Build an **empty** database: schema → `migrations/` → every seed. Refuses to run on a database that already has tables. |
| `./database/apply-migrations.sh --migrations` | Apply new files in `migrations/` to an existing database (each runs once, tracked in `dygo_meta.applied_migrations`). |
| `./database/apply-migrations.sh --seed 03_qa_tenant` | Load one or more seed packs into an existing database. |
| `./database/apply-migrations.sh --test` | Run the RLS isolation suite (`tests/rls_test.sql`, 64 checks) in a throwaway database. Never touches your data. |
| `./database/apply-migrations.sh --verify` | Show tables, policies, row counts and applied migrations. |

## Layout

```
schema/        the baseline, applied in this order
  01_extensions_types.sql      pgcrypto, pg_trgm, enums (incl. fsrs_state)
  02_tables.sql                every table, constraint and comment
  03_functions_triggers.sql    updated_at, signup provisioning, RLS helpers, invites, heatmaps
  04_rls_policies.sql          RLS on, then per-table policies
  05_indexes.sql               performance + partial indexes
  06_grants.sql                authenticated / anon / service_role grants
migrations/    changes made after the baseline (empty today)
seeds/         test and demo data, loaded in name order
  01_core_fixtures.sql         Sarah, Marco, Alex, Priya, Dana; Oxford + Rival tenants
  02_tier_ladder.sql           Phase 9 tier-ladder topics (needs 01)
  03_qa_tenant.sql             third QA tenant + accounts
  04_qa_words.sql              100 QA words (needs 03)
  05_hello_world_word.sql      a multi-word test entry (needs 03)
  06_onboarded_fixtures.sql    marks every seeded account as onboarded (OB1–OB5), so they open the garden
                               Seed words ship with audio_url_us = null. After an import, run
                               `cd com.dygoacademy.backend && npm run audio-backfill:prod`
                               to queue their audio (reset-db.sh reminds you).
tests/         RLS suite + a local stub of Supabase's auth schema
init/          mounted into the Postgres container on first boot (role passwords, JWT settings)
backups/       written by reset-db.sh (git-ignored)
archive/       the original 001–021 migrations, for history only — never run
```

## Making a schema change

1. Add `migrations/YYYYMMDD_short_name.sql` (the name sorts by date, so order is automatic).
2. Run `./database/apply-migrations.sh --migrations`. The file runs inside a transaction and is recorded only if it succeeds.
3. When `migrations/` gets long, fold the files into `schema/` and archive them, the same way the 2026-09-25 squash did.

## The 2026-09-25 squash

`schema/` is the final state of the old migrations 001–021 folded together: SM-2 is gone and FSRS is in. It was checked against the old chain, applied to a fresh database, by comparing every column, constraint (99), index (73), RLS policy (33), function body (83), trigger (10), grant (51) and enum. Everything matched, apart from two deliberate changes:

- `review_logs.ease_factor_after` / `interval_days_after` removed (SM-2 history columns; a rebuilt database has no history).
- `groups_select` now also lets a group's **owner** see it. Without that, `INSERT … RETURNING` (what `GroupsService.create` does) was rejected for anyone who wasn't already an admin in their tenant, including every new signup creating their first group.

The old default script also never applied the service_role grants (014/015); the baseline includes them.
