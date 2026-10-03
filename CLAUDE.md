# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Dygo Academy is a web app for learning English vocabulary. A learner adds a word, AI fills in its meaning, IPA, examples, translations and audio, and spaced repetition (FSRS-6) brings it back before it is forgotten. Teachers share words with classes through groups. The signed-in UI is called the "Word Garden".

| Folder | What it is |
| --- | --- |
| `com.dygoacademy.backend/` | NestJS API (port 3001) and BullMQ workers |
| `com.dygoacademy.frontend/` | Next.js App Router (port 3000) |
| `com.dygoacademy.automationtesting/` | `backend/` live API tests, `ui/` Playwright tests |
| `database/` | Postgres schema, migrations, seeds, RLS tests |
| `docs/design/garden/` | Design canvases and reference PNGs |

## Where to read more

The detail lives in these files, not here:

- Requirements: `dygo_academy_final_master_brd.md`
- Project plan and status: `dygo_academy_master_project_schedule.md`, plus the active `phase 12 implementation plan.md` and `phase 13 implementation plan.md`
- Architecture: `dygo_academy_complete_system_architecture_master.md`, `dygo_academy_frontend_architecture.md`
- Conventions: `dygo_academy_tech_spec_and_conventions.md`
- API and database: `dygo_academy_api_surface.md`, `dygo_academy_database_dictionary.md`, `database/README.md`
- UI design: `dygo_academy_ui_ux_design_system.md`
- Setup and running: `README.md`
- UAT deploy: `dygo_uat_deployment_guide.md`
- Shipped changes: `Change Log.md`

## Common commands

```bash
docker compose up -d                       # local Supabase, Redis, MinIO
./database/apply-migrations.sh             # empty DB: schema + seeds
./database/apply-migrations.sh --test      # RLS test suite

cd com.dygoacademy.backend  && npm run start:dev && npm test && npm run lint
cd com.dygoacademy.frontend && npm run dev && npm test && npm run lint
npm run garden:diff -- --base <url> --locale en-US,vi-VN   # frontend: pixel diff vs design (pass ≤ 0.5%)
```

## Master rules

1. **The database does access control.** The API sets the user's JWT on each transaction (`DatabaseService.withUser`), and Postgres RLS filters the data. Don't add tenant or membership filters in service code.
2. **Every route requires login** unless it's marked `@Public()`.
3. **API fields stay snake_case.** Frontend types mirror the backend exactly. All API calls go through `src/lib/api-client.ts`.
4. **Path strings live in `src/constants/routes.ts`**, never inline.
5. **Every user-facing text change updates all three locales** (`messages/en-US.json`, `vi-VN.json`, `zh-CN.json`).
6. **Never edit the design reference PNGs** to make a diff pass.
7. **Schema changes go in a new file** named `database/migrations/YYYYMMDD_name.sql`.
8. **Every commit gets an entry in `Change Log.md`**, committed together with the change.
9. **UAT runs on this Mac under pm2.** Deploy only when asked, by writing to `deploy/request.md`.
10. **Never run `next dev` inside `com.dygoacademy.frontend` while UAT is up.** It shares `.next/` with production and breaks it. Use a separate copy of the folder instead.
11. **Keep this file short.** Put requirements, plans and notes in the files listed above, not here.
