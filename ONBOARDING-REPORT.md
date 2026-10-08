# Onboarding OB1–OB5: build report (2026-10-08)

Scheduled run "implement-onboarding-ob1-ob5", from Dylan's request on 2026-10-07 ("make a schedule to implement onboarding screen").

- **Branch**: `feature/onboarding-ob1-ob5` (from `63e1282`, master at the time)
- **Worktree**: `/Users/dylan/dygo/dygo-onboarding`. `node_modules` in `com.dygoacademy.frontend` and `com.dygoacademy.backend` are symlinks to the main tree's (not committed).
- **Not pushed, not merged, not deployed.** The migration was not applied to the real database. The main working tree was not touched.

## Commits

1. `90ce633` Onboarding OB1–OB5: profile columns, RLS tests and /profiles/me/onboarding
2. `b6812f8` Onboarding OB1–OB5: /welcome screens, flow and redirects
3. (this commit) Onboarding docs: API surface, database dictionary, questions, report

Each has its `Change Log.md` entry (section 2026-10-08).

## Important: NOT matched to the design boards

The `OnboardLevel`, `OnboardGoal`, `OnboardBed`, `OnboardReminder` and `OnboardReady` (+ `…Vi`) `.dc.html` boards are **not in the repo** (searched `docs/design/garden/source/` and the whole of `/Users/dylan/dygo`). OB1–OB5 are still *For approval* in the design changelog. So:

- The screens follow the CHANGELOG descriptions, the AU2 Create account layout and the garden tokens (cream page, Fraunces headings, DM Sans / Be Vietnam Pro UI, clay primary button with its press shadow, plant glyphs, 390-wide phone column, no tab bar, phone only).
- No reference PNG / HTML was exported, no fixture page was added (`REFERENCE_NAMES`, `ReferenceScreen.tsx`, `garden-diff.mjs`), and **`garden:diff` was not run**.
- Every screen is a props-only `Onboard*Screen` plus an `Onboard*Live` wrapper, like the other garden screens, so it can be rebuilt from `reference/OB*.html` and pixel-matched later (CLAUDE.md rule 13).
- Not looked at in a browser: no `next dev` (rule 10), no UAT deploy. Checked only by unit tests and a production build.

## What each screen does

All five live under `/welcome/…` in a new `(onboarding)` route group. They are signed-in only (`/welcome` is in `PROTECTED_PATH_PREFIXES`) and have no tab bar. Each has a 4-step plant progress header: one plant per step, seed → sprout → flower → fruit tree; steps still to come are faded seeds, and OB5 shows all four grown.

| Screen | Route | What it does |
|---|---|---|
| OB1 Your level | `/welcome/level` | Four "I can…" sentences, one per level A2 / B1 / B2 / C1, with the letters only as a small badge. Continue saves `cefr_level`. **Skip** and **"Not sure? Start at B1"** both save B1 and go on. No level check (D-7 is open). No Back button (the account was just created). |
| OB2 Target band | `/welcome/goal` | IELTS / PTE / Just for life. IELTS and PTE show a − / + target stepper (IELTS 4.0–9.0 by half bands, starts at 7.0; PTE 30–90 by 5, starts at 65). Each test keeps its own target while switching. Continue saves `study_goal` + `target_band` (none for "just for life"). |
| OB3 First topic | `/welcome/bed` | The learner's real topics from `GET /topics`, shown as seed packets, two per row. Only beds with words appear, library collections first, then the biggest, 8 at most. "Plant this bed" saves `first_topic_id`. If there are no topics, it says so and Continue goes on. |
| OB4 Reminder time | `/welcome/reminder` | Drag the sun along a morning → night arc (06:00–23:00, quarter-hour snaps). The sun is a keyboard slider too (arrows, Page Up / Down, Home / End). Presets: Morning 7:30, Lunch 12:30, Evening 7:00 pm, Night 9:30 pm. The browser is **only asked for notifications after a time is picked and "Remind me at …" is pressed**. If granted, it saves the reminder on, through the existing `POST /notifications/schedules` and the same Web Push subscribe as A3 / A8. If refused or unsupported, it still saves the time with the reminder off, shows a note ("you can turn them on later in Me"), and the button becomes Continue. Skip changes nothing. |
| OB5 Garden ready | `/welcome/ready` | Seeds pop into a forest bed (bloom animation, a fade under reduced motion). A summary of the four choices: level, goal + band, first bed, reminder time or Off. "You can change any of these later in Me." **"Water your first words"** sends `complete: true` and opens `/garden` (A1). |

Flow rules:

- **AU2 Create account → OB1.** After sign-up without `?next=`, `RegisterLive` goes to `/welcome/level` instead of `/`.
- **AU3 invite sign-ups go straight to their group, as before** (`next=/join/…`). They see OB1 the first time they open the Garden tab (Q-16).
- **The garden home (`/garden`) sends a learner whose `profiles.onboarded_at` is null to OB1.** Only the home page checks, so deep links (review, topics, a group) still work for everyone.
- **`/welcome/*` sends anyone already onboarded to `/garden`**, so onboarding is never repeated.
- **Existing learners are never forced through onboarding.** The migration backfills them as done. If the column is missing (migration not applied yet), or the profile can't be read, they count as done too, so deploy order can't trap anyone.

## API and database

**Migration** `database/migrations/20261008_onboarding.sql` adds five columns to `profiles`:

- `onboarded_at timestamptz`: null = not finished.
- `cefr_level cefr_level` (the existing enum).
- `study_goal text`, checked to IELTS / PTE / LIFE.
- `target_band numeric(3,1)`, with a check tied to the goal: IELTS 4–9 in half bands, PTE 30–90 whole points, none for LIFE.
- `first_topic_id uuid`, referencing `topics`, `on delete set null`.

It then runs `update profiles set onboarded_at = created_at where onboarded_at is null`, which marks every existing learner as onboarded. RLS is unchanged: `profiles_update_self` already covers these columns.

**New seed** `database/seeds/06_onboarded_fixtures.sql` (added to `SEEDS`) marks seeded accounts as onboarded. A fresh build runs migrations before seeds, so the test accounts would otherwise land in onboarding.

**RLS tests**: `database/tests/rls_onboarding_test.sql`, wired into `apply-migrations.sh --test`, 18 assertions:

- backfill done and choices empty
- a new sign-up starts with `onboarded_at` null
- anon can't write
- the owner can save and finish
- every check constraint and the foreign key
- Priya (same tenant) and Dana (other tenant) can't change Alex's row
- deleting the topic clears `first_topic_id`

**Endpoints** (NestJS, `ProfilesController` / `ProfilesService`, class-validator DTO `UpdateOnboardingDto`, snake_case):

- `GET /api/v1/profiles/me/onboarding` returns `{ onboarded_at, cefr_level, study_goal, target_band, first_topic_id }`.
- `PATCH /api/v1/profiles/me/onboarding`: every field is optional, so each step saves its own.
  - `target_band` must come with `study_goal`, and must fit it; `LIFE` clears it.
  - `first_topic_id` must be a topic the caller can see. It is checked with an RLS-scoped read inside the same `withUser` transaction (404 otherwise), because a foreign key alone would accept a topic the caller can't read.
  - `complete: true` sets `onboarded_at` once.
  - An empty body is 400.
- `GET /profiles/me` is **unchanged**, so the Me screen doesn't depend on the new migration.

Docs updated: `dygo_academy_api_surface.md`, `dygo_academy_database_dictionary.md`, `database/README.md`, `README.md`, and `docs/design/QUESTIONS.md` (Q-12 to Q-16).

## Test results

| Check | Result |
|---|---|
| `./database/apply-migrations.sh --test` (throwaway DB) | passes, all suites; 18 new onboarding assertions |
| Backend `npm test` | 31 suites, **393 tests pass** (19 new in `onboarding.service.spec.ts`) |
| Backend lint | ESLint clean on every changed backend file. **Note:** `npm run lint` runs `eslint --fix`, and on master it finds **21 prettier issues already there** in `srs.service.ts`, `srs.service.spec.ts`, `topics.service.spec.ts` and `profiles.service.spec.ts`. It "passes" by reformatting them. Those reformats were reverted, not committed. |
| Frontend `npx tsc --noEmit` | clean |
| Frontend `npx vitest run` | **66 files, 642 tests pass** (51 new: screens 16, helpers 10, live flows 12, gate 5, `needsOnboarding` 4, register redirect 2, routes 2) |
| Frontend `npx next lint` | no warnings or errors |
| Frontend `npx next build` | succeeds; `/welcome/{level,goal,bed,reminder,ready}` built |

Frontend commands ran with dummy `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, because the worktree has no `.env.local`. No server was started or contacted.

## Assumptions

- **Built while still *For approval*.** CHANGELOG rule 1 says to build only Approved screens; this run was Dylan's explicit request.
- **The boards are missing** (see above).
- **D-7 → B1.** No level check. Skip and "Not sure?" both mean B1.
- **Invite sign-ups** keep going straight to their group. Onboarding only stops them at the Garden tab.
- **OB3 "becomes the first bed"**: the pick is stored as `profiles.first_topic_id`. A6 is not reordered, and the topic is not copied into a group of the learner's own. A new learner has no group, and library topics are already visible to them (Q-14).
- **OB2 "decides which words ripen first"**: the goal and band are stored only; review order doesn't use them yet (Q-15).
- **PTE stepper** moves by 5 on screen, although any whole score 30–90 is valid in the API and database.
- **OB4**: a refused notification prompt still saves the time, switched off, so the A8 switch can turn it on later. Times are 06:00–23:00 on the arc.
- **Copy**: the English is my draft. Vietnamese uses the §1 glossary (vườn, luống, tưới). Chinese is a draft (花园, 花圃, 浇灌) and needs a native review, like the other zh strings.
- **Design CHANGELOG not edited.** Its OB1–OB5 rows exist only in Dylan's uncommitted copy in the main working tree (they aren't in `HEAD`), so this branch leaves that file alone to avoid a conflict. Once that section is committed, set the Build status column to "built on branch feature/onboarding-ob1-ob5, not yet verified against boards". Statuses stay *For approval*.
- **Possible merge conflict.** The main tree also has uncommitted edits to `messages/*.json`. This branch adds a new `screens.onboarding` block at the end of `screens`, which may conflict there; it's easy to resolve (keep both).

## What Dylan needs to do next

1. **Boards**: add the `Onboard{Level,Goal,Bed,Reminder,Ready}(Vi).dc.html` files to `docs/design/garden/source/` and approve them. Then they get rebuilt to match (render.js export, fixture pages, `garden:diff` ≤ 0.5% in en-US and vi-VN).
2. **Decide D-7** (level check or B1), and answer Q-14 to Q-16 in `docs/design/QUESTIONS.md`.
3. **Review and merge** `feature/onboarding-ob1-ob5` into master. Commit your own CHANGELOG / messages work first to keep the merge simple.
4. **Apply the migration before deploying the backend.** The new endpoints need the new columns; the garden still works without them.

   ```bash
   ./database/apply-migrations.sh --migrations
   ```

5. **Deploy** via `deploy/request.md` (UAT deployment guide).
6. **Check on UAT** with a brand-new account: register → OB1 … OB5 → garden; an existing account goes straight to the garden; an invite sign-up lands in its group. Then, once the boards exist, run:

   ```bash
   npm run garden:diff -- --base https://www.dygoacademy.com --locale en-US,vi-VN
   ```

7. Remove the worktree when done:

   ```bash
   git worktree remove ../dygo-onboarding
   ```

   The `node_modules` entries are symlinks; removing them doesn't touch the main tree's folders.
