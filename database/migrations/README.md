# migrations/

Schema changes made **after** the 2026-09-25 baseline in `../schema/`. Empty for now.

- Name files `YYYYMMDD_short_name.sql`, e.g. `20261003_add_streak_freeze.sql`.
- Apply with `./database/apply-migrations.sh --migrations`. Each file runs once, inside a transaction, and is recorded in `dygo_meta.applied_migrations` only if it succeeds.
- A fresh build (`apply-migrations.sh` / `reset-db.sh`) applies the baseline, then every file here, then the seeds.
- If a change breaks a seed file, fix the seed in the same commit.
