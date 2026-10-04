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
- UI design: `dygo_academy_ui_ux_design_system.md`; how screens are matched to the canvas: `docs/design/garden/README.md`
- Setup and running: `README.md`
- UAT deploy: `dygo_uat_deployment_guide.md`
- Shipped changes: `Change Log.md`

## Common commands

```bash
docker compose up -d                       # local Supabase, Redis, RustFS
./database/apply-migrations.sh             # empty DB: schema + seeds
./database/apply-migrations.sh --test      # RLS test suite

cd com.dygoacademy.backend  && npm run start:dev && npm test && npm run lint
cd com.dygoacademy.frontend && npm run dev && npm test && npm run lint
npm run garden:diff -- --base <url> --locale en-US,vi-VN   # frontend: pixel diff vs design (pass ≤ 0.5%)
cd docs/design/garden/tools && node render.js ../reference <filter>   # export canvas sources to reference PNG + HTML
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
12. **Permissions live in `/Users/dylan/dygo/.claude/settings.local.json`.** Allowed without asking: git read commands, npm/npx (tsc, vitest, next, tailwindcss, eslint, prettier), flutter/dart, python3, read-only shell tools, Read/Edit/Write, web search. Always asks: `next dev` / `npm run dev` (see rule 10). Denied: `rm -rf`, `git push --force`, `git reset --hard`. The settings file is the source of truth; keep this copy in sync when it changes.

```json
{
  "permissions": {
    "allow": [
      "Bash(git status:*)",
      "Bash(git log:*)",
      "Bash(git diff:*)",
      "Bash(git show:*)",
      "Bash(git branch:*)",
      "Bash(GIT_OPTIONAL_LOCKS=0 git:*)",
      "Bash(npm run:*)",
      "Bash(npm install:*)",
      "Bash(npm ls:*)",
      "Bash(npx tsc:*)",
      "Bash(timeout * npx tsc:*)",
      "Bash(npx vitest:*)",
      "Bash(npx next:*)",
      "Bash(npx tailwindcss:*)",
      "Bash(npx eslint:*)",
      "Bash(npx prettier:*)",
      "Bash(flutter:*)",
      "Bash(dart:*)",
      "Bash(python3:*)",
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(grep:*)",
      "Bash(find:*)",
      "Bash(wc:*)",
      "Bash(awk:*)",
      "Bash(sed -n:*)",
      "Bash(echo:*)",
      "Bash(pwd)",
      "Bash(which:*)",
      "Bash(lsof:*)",
      "Bash(ipconfig getifaddr:*)",
      "Edit",
      "Write",
      "Read",
      "WebSearch",
      "WebFetch",
      "Bash(./database/apply-migrations.sh --test)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(git push --force:*)",
      "Bash(git reset --hard:*)"
    ],
    "ask": [
      "Bash(npx next dev:*)",
      "Bash(npm run dev:*)"
    ]
  }
}
```

13. **Every garden screen matches its canvas design 100%**, following `docs/design/garden/README.md`. Before building or changing a screen: put its `.dc.html` in `docs/design/garden/source/`, add the `tools/render.js` job and export `reference/<name>.png` + `.html` (English and `-vi`), committed on their own. Build from the exact values in `reference/<name>.html`, never by eye. Add a fixture page (`REFERENCE_NAMES`, `ReferenceScreen.tsx`, `garden-diff.mjs`). Done = `garden:diff` ≤ 0.5% per screen in en-US and vi-VN with only font anti-aliasing differing; run it against UAT (`--base https://www.dygoacademy.com`), not `next dev`. A design handed over somewhere else (e.g. `phase/…`) is copied in first, so every change has a git history.
