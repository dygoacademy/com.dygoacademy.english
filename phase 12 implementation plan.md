# 🌱 Phase 12 Implementation Plan: Adult UI Rebuild ("Word Garden")

**Document Version**: 1.0
**Date**: 2026-09-26
**Owner**: Dylan
**Status**: In progress. UI-0 and UI-1 are built and committed; UI-2's components are all built (passes of 2026-09-25 and 2026-09-26) and wait for Dylan's G1 check. Everything is behind a flag, so classic users see no change.
**Companion documents**:
* `dygo_academy_master_project_schedule.md`: the Phase 12 section (summary, status, sequencing)
* `dygo_academy_ui_ux_design_system.md` v0.2: **the spec**. Tokens §4–§7, breakpoints §2, screens §10, components §11, localization §14.
* The "Dygo Word Garden" design canvas, Adult page (A1–A8): **the visual reference**
* `dygo_academy_session_report_2026-09-25.md`: what the first build pass did and assumed
* `ui rebuild implementation plan.md`: the first draft of this plan. It's **superseded by this file** and kept only because the 2026-09-25 pass and its report point at it.

---

## 1. Summary

Phase 12 replaces every adult screen with the Word Garden design: words shown as plants, three daily missions, and retention screens (Mission complete, Weekly harvest, Welcome back). It works on iPhone and iPad, in English, Chinese and Vietnamese. The new UI is built beside the classic UI behind a flag, becomes the default, and the classic adult UI is then deleted.

It's split into eleven steps, UI-0 to UI-8 plus **UI-L (Languages)** and **UI-G (Groups)**, with three gates, and a design gate for Groups:

| Step | Name | Size | Status | Gate at the end |
| --- | --- | --- | --- | --- |
| UI-0 | Flag and route group | S | ✅ `1173901` | — |
| UI-1 | Foundations: tokens, fonts, i18n | S | ✅ `3b530d5` | — |
| UI-2 | Components and gallery | M | ✅ built (`4ebf713` … `1063de0`), then matched to the canvas: UI-fidelity (1) fonts `6917965`, (2) components `061a08d`. **G1 ready for Dylan**: pixel diff 10 of 11 screens at the noise floor, A7 0.74% (Vietnamese fallback font only) | **G1**: components match the mockup |
| UI-3 | App shell, navigation and test tooling | S | 🟡 tab bar + the seven garden routes (`c42b5b3`), Vitest screen tests, the pixel diff (`4341851`). Open: `/garden` in `PROTECTED_PATH_PREFIXES` (routes.ts has others' edits), iPad rail | — |
| UI-4 | Core loop: Home, Review, Mission complete | L | 🟡 A1/A2/A3/A5 screens built to the canvas (`afe8fd0`) and live on existing data (`c42b5b3`: stats, activity, study session, rate). Open: backend interval previews + stage counts, missions | **G2**: core loop live for beta users |
| UI-5 | Topics and topic bed | M | 🟡 A6/A7 screens built (`afe8fd0`), live with words / mastered / due cards. Open: per-topic stage + due counts, per-word stage and next date | — |
| UI-6 | Retention: missions, streak freezes, reminders, Me | L (backend) | 🟡 A4/A8 screens built (`afe8fd0`); live A8 reminder switch on the existing schedules; the rest shows "coming soon" until the backend lands | — |
| UI-L | Languages: English, 简体中文, Tiếng Việt, built and checked in English + Vietnamese | M | ✅ built 2026-09-26 (`33466be` → `4d6f4eb`): 11/11 Vietnamese A-references ≤ 0.088%, English unchanged (A7 0.738%, font decision); zh-CN screenshots at 8 viewports pass; `zh-CN.json` waits for a native review; migration `20260926_profile_locales.sql` to apply. GR references are diffed in UI-G | — |
| UI-G | Groups ("shared gardens"): design in the canvas, then build | M design + L build | ✅ built 2026-09-26 (`d9ab4d8` → `92e86bb`): GR1–GR7 English 0.000–0.013%, Vietnamese 0.000–0.001%; zh-CN screenshots at 8 viewports pass; 5th tab for group members; aggregate-only backend + 30 RLS assertions; live routes on the existing endpoints. Open: apply `20260926_group_garden.sql`, rain-day storage (banners hidden until then), signed-in checks on a real device. NAV-1 (2026-09-27, `b30b6a0` design + `f00dc6e` code): Groups tab on A1/A4/A5/A6/A8, no Group chip on A6, A4 group card → `/garden/groups/[id]` on live data; open: `garden:diff` for those five (en + vi), see §5 "NAV-1" | — |
| UI-7 | iPad, languages, auth screens, accessibility | M | Not started | **G3**: every screen passes QA |
| UI-8 | Switch over and delete the classic adult UI | S | Not started | — |

Sizes are rough estimates for one developer working with Claude: S = 2–3 days, M = about a week, L = 1–2 weeks.

### Design fidelity: 100% match with the canvas

**The garden UI must match the "Dygo Word Garden" canvas 100%**: layout, spacing, sizes, colours, fonts, radii, shadows, icons, illustrations and copy. Where the code, this plan or `dygo_academy_ui_ux_design_system.md` disagree with the canvas, **the canvas wins**.

The canvas is exported into the repo at `docs/design/garden/` (2026-09-26): PNG references at 390 × 844 @2x, static HTML with every exact value, the artboard sources, and a script to re-export. `docs/design/garden/README.md` explains how each screen is checked: a flag-only fixture page per screen with the canvas's sample data, and a Playwright pixel diff that must stay at or below 0.5%, with anti-aliasing the only difference allowed.

**Fidelity pass (2026-09-26, `6917965` → `c058552`):** fonts (DM Sans + Be Vietnam Pro per-glyph fallback, Fraunces opsz, `next/font/local`; this supersedes the Google-fonts note in §4.3), every component re-measured and redrawn from the canvas, the eight screens in `src/components/garden/screens/`, the 11 reference pages `/garden/_reference/<name>` (dev only) and `npm run garden:diff`. Diff (Linux Chromium): A1 0.153, A2-q 0.074, A2-a 0.258, A2-f 0.022, A3 0.134, A4 0.293, A5 0.184, A6 0.221, **A7 0.741**, A7-sprouts 0.324, A8 0.271 (%). All but A7 sit at the noise floor; A7 is over only because Vietnamese letters use Be Vietnam Pro where the canvas used the system font (decided). Details: `docs/design/garden/README.md` and the 2026-09-26 session report.

## 2. Why

1. **Retention.** Today's home screen is a list of day rows and a due count. Nothing gives a learner a reason to come back tomorrow, and nothing makes coming back after a break feel easy. The garden design builds both into every screen: a next mission, a "ripens tomorrow" time, streak freezes, and a no-guilt Welcome back.
2. **Phase 10 changed what the UI has to show.** FSRS has four real ratings, sticky mastery (`mastered_at`) and quiz answers that grade the schedule. The classic UI still offers two buttons plus a hold gesture, and shows mastery as a percentage ring.
3. **New markets.** Learners come from the US, Singapore, China and Vietnam. The classic UI is hard-coded English with no i18n, and has one layout width (`CONTENT_WIDTH` = `max-w-2xl` everywhere) that doesn't use an iPad.
4. **One design system.** The classic UI drifted: 13 files had their own widths before §17 of the frontend architecture doc fixed it. Phase 12 starts from tokens, so the kids' Garden can reuse the same components later with a different theme.

## 3. How it fits with Phases 10 and 11

**Phase 10 (FSRS): built and live.** Phase 12 builds on it and doesn't change the scheduler:

| FSRS fact | How the garden shows it |
| --- | --- |
| `fsrs_state` = `New` | Seed |
| `Learning` or `Relearning` | Sprout |
| `Review` and `mastered_at is null` | Flower |
| `mastered_at is not null` (sticky, lost only through a graded mistake) | Fruiting tree ("ripe") |
| `is_leech` | Wilting, whatever the stage |
| `next_due_at <= now` | Thirsty (blue drop) |
| Four ratings, "Knew it" at face value, EASY on a first review = GOOD | The A2 rating bar has 4 buttons. **The hold-to-rate gesture is dropped.** |
| Quiz answers grade the schedule | The collocation mission (mission 3) is real SRS practice, not a side game |

**Phase 11 (locale, household, i18n): not started.** Phase 12 overlaps it in three places. This plan takes the frontend parts so they aren't built twice:

| Phase 11 workstream | Overlap | Decision |
| --- | --- | --- |
| WS1 Locale and timezone preferences | Needs a Settings UI for timezone and language | **Build it as the A8 Me settings in UI-6.** No classic Settings screen gets built. The preference columns are shared (see UI-6). |
| WS3 i18n | Needs a library, key convention and extraction | **Already chosen in UI-1: next-intl `~4.4.0`**, garden strings only. Phase 11 WS3 adopts it; the classic UI is never translated, since it's deleted in UI-8. |
| WS2 Household and child profiles | A8's "Family" row and the kids' Garden need `learner_profiles` | **Not in Phase 12.** The Family row ships hidden until Phase 11 WS2 lands. |

Recommended order: finish Phase 12 up to G2 (the core loop), then do Phase 11 WS1's backend together with UI-6, since both add profile columns.

## 4. Architecture (as built in UI-0 and UI-1)

### 4.1 Routing and the flag

* New screens live in `src/app/(garden)/` and are served under `/garden/...`. Paths live in `constants/garden.ts` until UI-8 moves them into `routes.ts`.
* `NEXT_PUBLIC_GARDEN_UI` (in `config/env.ts`) turns the garden on for everyone; only `"true"` counts. It's unset everywhere, so it's off by default.
* Per-browser overrides live in `lib/garden-ui.ts`. `?ui=garden` sets a one-year `dygo_ui=garden` cookie. `?ui=classic` sets `dygo_ui=classic`, which beats the env flag and is the UI-8 escape hatch.
* `middleware.ts` runs `updateSession` first and then:
    * returns 404 for any `/garden/...` URL when the request isn't flagged. This has to be in middleware because the App Router renders a page in parallel with its layout, so a layout `notFound()` still streams the page.
    * sends a signed-in, flagged user from `/` to `/garden`.
* `(garden)/layout.tsx` checks the flag and the session again, for defense in depth.
* ⚠️ **Open item from the first pass:** `/garden` isn't in `PROTECTED_PATH_PREFIXES` yet, because `routes.ts` had someone else's uncommitted changes. **Add it at the start of UI-3, before any garden page renders user data on the server.**

### 4.2 Styling

* Tokens are CSS variables under `[data-ui="garden"]` in `globals.css`, so classic colours can't change. A before/after Tailwind compile over all of `src/` showed only added lines.
* Tailwind names are **namespaced until UI-8**:
    * colours: `bg-garden-surface`, `text-garden-muted`, `bg-stage-tree`, `bg-rating-good`
    * radii: `rounded-tile` / `control` / `card` / `hero`
    * screens: `medium` (600px), `expanded` (1024px) and `short` (height < 500px)

  The namespace is needed because classic still owns `primary` / `muted` / `border`, and classic `md:` means 768px. UI-8 removes the `garden-` prefix and renames the screens to `md` / `lg`; both are find-and-replace jobs.
* Use `gcn()`, not `cn()`, in garden components. The default tailwind-merge drops the custom type classes, for example `text-body-l` next to `text-white`.
* Widths come from `GARDEN_CONTENT_WIDTH` in `constants/layout.ts`, which replaces `CONTENT_WIDTH` in UI-8.

### 4.3 Fonts and i18n

* `(garden)/fonts.ts`: Fraunces 500/600 (display) and **Be Vietnam Pro** 400–700 (body), through `next/font/google`, self-hosted at build time. Chinese uses the system CJK stack and is never downloaded. DM Sans was dropped because Next's own font table shows no Vietnamese subset for it.
* **Builds need Google Fonts reachable** (Mac, Docker, CI). If a build machine can't reach it, switch to `next/font/local` with committed woff2 files.
* next-intl is pinned to `~4.4.0`: 4.5+ brings native binaries that the Linux sandbox can't install safely into the Mac's `node_modules`. Revisit after UI-8.
* The next-intl provider is only in the `(garden)` layout. Keys are typed (`src/types/next-intl.d.ts`) and messages live in `messages/<locale>.json` (`en-SG` is the source). **Every garden string goes through `t()`.**

### 4.4 Data: screens mapped to the API

Most screens run on endpoints that exist today. New endpoints are marked **new** and belong to the step shown.

| Screen | Existing endpoints / hooks | New |
| --- | --- | --- |
| A1 Today's Garden | `GET /srs/stats` (streak, counts), `GET /srs/due` (thirsty), `GET /srs/leeches` (wilting), `GET /srs/activity` + `/activity/upcoming` ("ripens tomorrow"), `useTopics` | Plant-stage counts per learner (UI-4): count by `fsrs_state`, plus mastered. Add them to `GET /srs/stats` rather than a new route. |
| A2 Review | `POST /srs/sessions`, `GET /srs/due`, `POST /srs/rate`, `POST /srs/sync` (offline), `useStudySessionStore` | **Interval preview per rating** (UI-4): the four "next due" times the rating bar shows. Compute them with `ts-fsrs` `repeat()` server-side and return them on each `DueCard`, so the frontend never re-implements FSRS. |
| A3 Mission complete | Session result from the store, `GET /srs/activity` | — (missions arrive in UI-6) |
| A4 Weekly harvest | `GET /srs/activity` (7 days) | **Missions per day + Golden Bloom counts** (UI-6) |
| A5 Welcome back | `GET /srs/activity` (days missed), `GET /srs/leeches`, `GET /srs/due` | **Streak freeze state** (UI-6); a "most at-risk N" ordering on `GET /srs/due` (lowest retrievability first) |
| A6 Topics | `GET /topics` (`word_count`, `mastered_count`, `focus_word_count`) | **Per-topic stage counts + due count** on `TopicSummary` (UI-5) |
| A7 Topic bed | `GET /topics/:id`, `GET /topics/:id/cards/due`, `POST /words`, `POST /topics/:id/clone`, `POST /quiz/generate` | **Per-word `fsrs_state`, `mastered_at`, `is_leech`, `next_due_at`** on the topic's word list (UI-5) |
| GR1 Shared gardens (groups list) | `GET /groups` (name, role, description) | **Member count + my due count per group** (UI-G) |
| GR2 Group garden | the group row from `GET /groups`, `GET /groups/:id/members`, the group's topics (`GET /topics`, by `group_id`) | **Group garden summary** (UI-G): aggregate only — words the group is growing, gardeners who watered today, this week's sprint |
| GR3 Tricky patches + manage | `GET /analytics/:id/heatmap`, `POST /notifications/groups/:groupId/sprint`, `PATCH /groups/:id/members/:userId`, `GET/POST /groups/:id/invites`, `PATCH /groups/:id`, `POST /groups` | — |
| GR6 Join | `POST /invites/:token/redeem` | **Invite preview** (group name, inviter, role) before joining (UI-G) |
| A8 Me | `GET /srs/activity` (calendar), `GET /srs/stats`, `GET/POST /notifications/schedules` + `POST /notifications/subscribe` (reminders) | **Keepsakes**; **profile preferences** `ui_locale`, `meaning_locale`, `english_variety` next to the existing `profiles.timezone` (UI-6, shared with Phase 11 WS1) |

The reminder switch reuses the existing Web Push schedules (Phase 3). "Ripens tomorrow at 7:30" is a schedule at the learner's reminder time plus the upcoming-activity count, not a new notification system.

## 5. Step by step

### ✅ UI-0 Flag and route group (done: `1173901`)

Built: the flag, cookie overrides, middleware 404 gate and `/` → `/garden` redirect, the `(garden)` group and an empty A1 placeholder.

**Carried over** (the sandbox couldn't do these):
- [ ] Manual check on the Mac: while signed in, `/?ui=garden` lands on `/garden`, and `/?ui=classic` makes `/garden` 404 again
- [ ] Baseline screenshots of the classic UI while signed in (for the before/after record)
- [x] Export the 8 adult mockups from the design canvas into `docs/design/garden/` (done 2026-09-26: 11 reference PNGs + static HTML, see its README)

### ✅ UI-1 Foundations (done: `3b530d5`)

Built: scoped tokens, the responsive type scale, fonts, `GARDEN_CONTENT_WIDTH`, next-intl (en), viewport + safe-area helpers, and `/garden/_tokens`. The folder is `%5Ftokens`, because a plain `_tokens` folder is private in the App Router.

**Carried over:**
- [ ] Run `npm install` on the Mac once. The overnight pass copied the 11 new packages into `node_modules` by hand to avoid Linux binaries, so npm's own records need to catch up.
- [ ] Check `/garden/_tokens` on a real iPhone: Fraunces and Be Vietnam Pro load, Vietnamese diacritics don't clip, and Chinese falls back to PingFang SC
- [ ] `next build` on the Mac (needs internet for the fonts)

### 🟡 UI-2 Components and gallery (M, built: `4ebf713` → `1063de0`; waiting on G1)

Done in part 1 (`4ebf713`): `Button` (primary / secondary / forest, pressed, disabled, loading), `IconButton`, `Chip`, `Card`, `StatTile`, `Switch`, `ProgressVine`, `gcn()`, and `/garden/_gallery`.

Done in parts 2–5 (2026-09-26, see `dygo_academy_session_report_2026-09-26.md`):
- [x] `PlantGlyph`: seed, sprout, flower, tree, wilting, thirsty drop; sizes 24, 32, 40, 56, 72; drip/bloom animation that respects reduced motion. `stageFromSrs(fsrs_state, mastered_at, is_leech)` with unit tests (`f06702b`)
- [x] `RatingBar`: 4 buttons with intervals; disabled while saving; keys 1–4 with hints after keyboard use (`f06702b`)
- [x] `ReviewCard`: chips → word + IPA + audio → answer (meaning, meaning-language line with its own `lang`, example, collocations); hidden and shown states (`6ed48f0`)
- [x] `AudioButton` (garden): classic playback logic plus the "audio unavailable, tap to retry" state (§14.6); classic file unchanged (`6ed48f0`)
- [x] `MissionRow`, `HeroGardenCard` (normal and comeback), `StageTile` (`aria-pressed`), `WordRow` (normal, due now, wilting) (`7a8be4e`)
- [x] `BottomTabBar`, `BottomSheet` (on the existing Radix dialog), `Toast` (`1063de0`)
- [x] **Frontend test runner**: Vitest 5 + Testing Library + jsdom, `"test": "vitest run"`. 131 tests: `stageFromSrs` (every state combination), `RatingBar` keys and disabled state, `Switch` / `StageTile` / tab bar ARIA, sheet, toast, review card (`f06702b` onwards)
- [ ] **Dylan, on the Mac:** `npm install` (the lockfile was updated from a Linux copy; the Mac's `node_modules` wasn't touched), then `npm test`, `npx tsc --noEmit` and `next build`. Until `npm install`, `tsc` fails on the test files because `vitest` isn't installed yet.
- [ ] **Dylan:** export the 8 adult mockups to `docs/design/garden/` and compare `/garden/_gallery` side by side at 390px (G1)
- [ ] **Dylan:** VoiceOver pass on the review card, rating bar, sheet and tab bar on a real iPhone (G1)

**Done when (G1):** every component matches its part of the canvas references in `docs/design/garden/reference/` (checked against the exact values in the reference HTML, not by eye), the known differences in `docs/design/garden/README.md` are fixed (DM Sans body font once approved, Fraunces with the opsz axis, canvas SVG paths), it works by keyboard, VoiceOver reads it correctly, and `npm test` passes.

### UI-3 App shell, navigation and test tooling (S)

- [ ] **First:** add `/garden` to `PROTECTED_PATH_PREFIXES` in `routes.ts`
- [ ] `(garden)` shell: bottom tab bar (Garden, Missions, Topics, Me) with safe-area padding; placeholder pages for each tab
- [ ] Sub-screens pushed with a back button; full-screen review with no tab bar
- [ ] Garden `loading.tsx`, `error.tsx` and empty states
- [ ] Rail (600px+) and sidebar (1024px+) built, but switched off until UI-7
- [ ] Playwright in `com.dygoacademy.automationtesting/ui/`: the 8 viewports from design system §16.1, a signed-in fixture user, and screenshot tests for `/garden/_gallery`

**Done when:** all 4 tabs and back work on an iPhone without layout jumps, and the Playwright suite runs on the Mac.

### UI-3 finish (U3-0 … U3-5), added 2026-09-27

Small passes, **one commit each**, 75 minutes apart, so none runs out of budget. Each pass reads only this section, §10 and the files for its step. Start by checking the previous step's commit (`GIT_OPTIONAL_LOCKS=0 git log --oneline -20 | grep "U3-"`); if it's missing, do that step instead and stop. Commit message `UI-3 U3-n: …`.

| Step | What | Files (expected) |
| --- | --- | --- |
| **U3-0** | Catch-up checks only: redo RD-5 (it left no commit) and run `garden:diff --locale en,vi` for A1, A4, A5, A6, A8 after NAV-1. Fix only a failing check. Report + tick RD-5. | report, plan (don't commit) |
| **U3-1** | `(garden)` `loading.tsx` (garden skeleton, no layout jump), `error.tsx` (friendly retry, i18n), `not-found.tsx`; shared `EmptyState` used by Topics, Topic bed, Groups when there's no data. All strings in en/vi/zh-CN. Vitest. | `src/app/(garden)/**`, `src/components/garden/EmptyState.tsx`, messages |
| **U3-2** | iPad navigation: `GardenRail` (≥ 600px, icons + labels, same 4/5 tabs) and `GardenSidebar` (≥ 1024px), behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (default off, turned on in UI-7). Gallery entries. Tab bar unchanged at < 600px. Vitest for the switch. | `src/components/garden/`, `constants/garden.ts`, gallery |
| **U3-3** | Playwright in `com.dygoacademy.automationtesting/ui/`: its own `package.json` + `playwright.config.ts` with the 8 viewports of design system §16.1, screenshot tests of `/garden/_gallery` and every `/garden/_reference/*` page (en + vi). Runs against `BASE_URL` with the `dygo_ui=garden` cookie. No sign-in yet. `README.md` with the Mac commands. | `com.dygoacademy.automationtesting/ui/**` |
| **U3-4** | Signed-in fixture user: `global-setup.ts` signs in with `E2E_EMAIL` / `E2E_PASSWORD` (from `.env.e2e`, gitignored; tests skip with a clear message if unset) and saves `storageState`. Tests: every tab + back from Topic bed and Group garden, no layout jump (bounding-box check of the tab bar before/after navigation). | `…/ui/**` |
| **U3-5** | Verify + wrap up: tsc/lint/vitest/`next build`, run the Playwright suite if a browser is available; tick the UI-3 checklist for what's done (tab bar, routes, back buttons, full-screen review, tests); §1 UI-3 row; report; changelog line. The `routes.ts` item stays open (others' uncommitted edits; the garden layout already redirects signed-out users) — say so. | report, plan, master schedule (don't commit the last two) |

### UI-4 Core loop: Home, Review, Mission complete (L)

Backend:
- [ ] Plant-stage counts in `GET /srs/stats` (`new`, `learning` = Learning + Relearning, `review`, `mastered`), in the learner's timezone like the existing stats
- [ ] Interval preview per rating on each `DueCard` (`interval_preview: { AGAIN, HARD, GOOD, EASY }` as due timestamps), from `ts-fsrs` `repeat()` in `fsrs-scheduler.ts`, with unit tests next to `fsrs-scheduler.spec.ts`
- [ ] Update `dygo_academy_api_surface.md` and `types/srs.ts` in the same change

Frontend:
- [ ] **A1 Today's Garden** on real data: greeting, streak, hero garden (thirsty / ripe / wilting counts), missions card, the primary "Continue" button, "ripens tomorrow"
- [ ] **A2 Review** on `useStudySessionStore`, `POST /srs/rate` and offline `sync`: the new card, the 4-button rating bar with previews, the progress vine
- [ ] **A3 Mission complete**: session stats, week strip, the next mission, the reminder switch (wired in UI-6, hidden until then)
- [ ] **Missions v0** in the frontend, from existing data only: mission 1 "water the due words" is real. Missions 2 and 3 appear only when their data exists; otherwise the card shows one mission.
- [ ] Beta: invite 3–5 users with `?ui=garden`

**Done when (G2):** beta users do real reviews in the garden for a week, and due counts, streaks and mastery match the classic screens for the same accounts.

### UI-5 Topics and topic bed (M)

Backend:
- [ ] `TopicSummary` gains `new_count`, `learning_count`, `review_count` and `due_count` next to `mastered_count` and `focus_word_count`. They're string bigints, the same as the existing counts.
- [ ] The topic's word list gains per-word `fsrs_state`, `mastered_at`, `is_leech` and `next_due_at` for the caller

Frontend:
- [ ] **A6 Topics** (beds): stage-mix bar, due badge, filter chips (All / IELTS Academic / Mine / Group). The locked seed pack is hidden until UI-6.
- [ ] **A7 Topic bed**: stage tiles that filter the list, words sorted by next due, "Water N due" (a review scoped to this topic via `GET /topics/:id/cards/due`), Quiz, and Add word as a `BottomSheet` built from `AddWordModal`'s form logic
- [ ] Quiz screens restyled with the garden components; the collocation quiz becomes mission 3

**Done when:** everything the classic topics grid and topic detail can do, the garden can do.

### UI-5 finish (U5-1 … U5-7), added 2026-09-27

State on 2026-09-27: per-topic `new_count` / `learning_count` / `review_count` / `due_count` are already in `GET /topics` (committed in `3a74b95`); A6 chips are final after NAV-1 (All / IELTS Academic / Mine). What's left is below. Same rules as the RD and U3 passes: **one commit per pass, 75 minutes apart**, read only this section + §10 + the files for the step; check the previous step's commit first (`GIT_OPTIONAL_LOCKS=0 git log --oneline -25 | grep "U5-"`), and if it's missing do that step instead and stop. Commit message `UI-5 U5-n: …`. The A6/A7 fixture pages must keep passing `garden:diff --locale en,vi` (A6-topics, A7-topic-bed, A7-topic-bed-filter-sprouts).

| Step | What | Files (expected) |
| --- | --- | --- |
| **U5-1** | Backend: `GET /topics/:id` words gain the caller's `fsrs_state`, `mastered_at`, `is_leech`, `next_due_at` (null when never studied), through the same RLS-scoped `user_word_srs` join style as the counts; never another learner's rows. Jest + API doc row. | `topics.service.ts` (+ spec), `dygo_academy_api_surface.md` | ✅ `6e86063`
| **U5-2** | A6 live: stage-mix bar, due badge and "all watered" from the counts; beds sorted by due words; loading/empty states from U3-1. | `live/TopicsLive.tsx`, `live/data.ts` (+ tests) | ✅ `03a6962`
| **U5-3** | A7 live: stage tiles with real counts that filter the list (`stageFromSrs`), words sorted by next due, "due now" / date labels via the i18n formatter, wilting rows for leeches. | `live/TopicBedLive.tsx`, `live/data.ts` (+ tests) | ✅ `57b441c`
| **U5-4** | A7 actions: "Water N due" = review scoped to this topic (existing `POST /srs/sessions` with the topic / `GET /topics/:id/cards/due`); **Add word** as a garden `BottomSheet` reusing `AddWordModal`'s form logic (don't edit the classic file: extract a hook in a garden-owned file); Options → classic page for now. | `live/TopicBedLive.tsx`, new `AddWordSheet.tsx`, messages |
| **U5-5** | Quiz, part 1: `/garden/quiz?topic=…` question screen with garden components for every question type `QuizQuestion` supports, feedback states (right/wrong, no red ✕ shaming), hint, audio; on `POST /quiz/generate` + `/:id/answer` + `/:id/hint`. **No canvas artboard exists for the adult quiz**: follow design system §11 and the A2 card style; save 390×844 screenshots (en + vi) to a gitignored folder for Dylan's review. | `src/app/(garden)/garden/quiz/**`, `screens/QuizScreen.tsx`, messages |
| **U5-6** | Quiz, part 2: result screen (score, words that need water, "Back to bed"), A7 "Quiz" opens it, leech drill (`GET /quiz/leech-drill`) reachable from A7's wilting rows. Vitest. | same folder + `live/TopicBedLive.tsx` |
| **U5-7** | Verify + wrap up: tsc/lint/vitest/`next build`, backend tsc/jest, `garden:diff --locale en,vi` A6/A7, Playwright (unsigned) if available; tick the UI-5 checklist; §1 UI-5 row; report; changelog line. Note: "collocation quiz becomes mission 3" moves to UI-6 (missions). | report, plan, master schedule (don't commit the last two) |

### UI-6 Retention: missions, streak freezes, reminders, Me (L, mostly backend)

Backend (one migration in `database/schema/` + seed, following the post-squash baseline process in `database/README.md`):
- [ ] `daily_missions`: learner, local date, mission type (`REVIEW_DUE` / `LEARN_NEW` / `QUIZ`), target, progress, `completed_at`. It's created on first read each local day, and progress is updated inside `rate()` and `QuizService.answer()` (the same transactions Phase 10 uses).
- [ ] `GET /missions/today`, `GET /missions/week` (Golden Bloom = all 3 done in a day; weekly harvest = the count per day)
- [ ] Streak freezes: `streak_freezes_available`, refilled weekly and used automatically on a missed day. The streak calculation in `computeSrsSummary` counts frozen days.
- [ ] Keepsakes: a milestone table plus `GET /me/keepsakes`
- [ ] Profile preferences `ui_locale`, `meaning_locale`, `english_variety` next to `profiles.timezone`, plus `PATCH /me/preferences`, **designed together with Phase 11 WS1** so its Settings needs are covered here
- [ ] RLS for every new table, with assertions added to the RLS suite (64 today)

Frontend:
- [ ] Missions card and A3 switch to `GET /missions/today`; the reminder switch is wired to the existing notification schedules
- [ ] **A4 Weekly harvest**, **A5 Welcome back** (replaces A1's content after 2+ missed days) and **A8 Me** (calendar, keepsakes, settings: daily goal, reminder time, meaning language, UK/US English). The Family row stays hidden until Phase 11 WS2.

**Done when:** missions, Golden Bloom, freezes and reminders work end to end for beta users, and the RLS suite passes.

### UI-L Languages: English, Simplified Chinese, Vietnamese (M)

**Why now.** Learners come from the US, Singapore, China and Vietnam (§2). Dylan asked (2026-09-26) for the app to ship in **English, 简体中文 and Tiếng Việt**, and for the rebuild to use **English and Vietnamese as the worked examples**: both have approved canvas pages, so both are pixel-checked. Chinese follows the same keys and layout. This takes the language work out of UI-7 and does it before the remaining screens and Groups, so every new screen is born translated.

**References.** `docs/design/garden/reference/<name>.png` (English) and `<name>-vi.png` (Vietnamese) for A1–A8 and GR1–GR7, from the canvas pages *Adult*, *Adult · Tiếng Việt*, *Adult · Groups* and *Adult · Groups · Tiếng Việt*. The Vietnamese copy in the `-vi` references is the approved translation.

**Locales and formats**

| App language | Code | Messages | Formatting locale | Clock | Week starts | Font stack (body) |
| --- | --- | --- | --- | --- | --- | --- |
| English (Singapore) | `en-SG` | `messages/en-SG.json` (the source; typed keys) | `en-SG` (the canvas: "Friday, 25 September", "7:30 AM") | 12-hour | Monday | DM Sans |
| English (United States) | `en-US` | `messages/en-US.json` (en-SG with US spelling) | `en-US` ("Friday, September 25") | 12-hour | **Sunday** | DM Sans |
| 简体中文 | `zh-CN` | `messages/zh-CN.json` | `zh-CN` ("9月25日 星期五") | 24-hour | Monday | DM Sans for Latin, then `PingFang SC`, `Noto Sans SC`, `Microsoft YaHei` (system, no web font) |
| Tiếng Việt | `vi-VN` | `messages/vi-VN.json` | `vi-VN` ("Thứ Sáu, 25 tháng 9", "1.200") | 24-hour | Monday | DM Sans + Be Vietnam Pro per glyph (already built) |

Headings use Fraunces; for `zh-CN` the heading stack falls back to the same system CJK fonts (Fraunces has no Chinese). **Locale codes are full BCP 47 tags (2026-09-26):** `en-SG`, `en-US`, `vi-VN`, `zh-CN` everywhere: file names, `profiles.ui_locale` / `meaning_locale` (migration `20260926_profile_locales_codes.sql` converts `en` → `en-SG` / `en-US` by time zone and `vi` → `vi-VN`), the `dygo_locale` cookie, `?locale=` and `PATCH /profiles/me`. The two English regions are both choices in the Language sheet; with no choice, English means `en-US` for an `America/*` time zone and `en-SG` otherwise. The old short codes are still read (cookie, profile) so nobody loses their setting.

**Which language is used.** 1) `profiles.ui_locale`, 2) the `dygo_locale` cookie (set by the language sheet before sign-in and on first visit), 3) the browser's `Accept-Language` (`zh*` → `zh-CN`, `vi*` → `vi-VN`, `en-US` → `en-US`, other `en-*` → `en-SG`, bare `en` → by time zone), 4) English for the time zone. Only the `(garden)` layout reads it; classic screens stay English and unchanged (rule 3). No locale segment in the URL.

**Glossary (use these words everywhere, including notifications).** English comes from the canvas; Vietnamese is the approved canvas copy; Chinese is Claude's draft and needs a native review (decision 8).

| English | Tiếng Việt | 简体中文 |
| --- | --- | --- |
| Garden · Missions · Topics · Groups · Me (tabs) | Vườn · Nhiệm vụ · Chủ đề · Nhóm · Tôi | 花园 · 任务 · 主题 · 小组 · 我的 |
| water / thirsty / due | tưới / cần tưới / cần ôn | 浇水 / 缺水 / 待复习 |
| seed · sprout · flower · fruit tree | hạt · mầm · hoa · kết trái | 种子 · 幼苗 · 开花 · 结果 |
| ripe · wilting · mastered | đã chín · đang héo · đã thuộc | 成熟 · 枯萎 · 已掌握 |
| Golden Bloom | Hoa Vàng | 金色花开 |
| rain barrel (streak freeze) · streak | thùng nước mưa · chuỗi ngày | 雨水桶 · 连续天数 |
| Again · Hard · Good · Easy | Học lại · Khó · Tốt · Dễ | 重来 · 困难 · 良好 · 简单 |
| shared garden · shared bed · gardener | vườn chung · luống chung · bạn cùng vườn (counts: "người") | 共享花园 · 共享花圃 · 园丁（计数用“人”） |
| rain day · tricky patches | ngày mưa · chỗ khó | 雨天 · 难点区 |
| Admin · Editor · Viewer | Quản trị · Biên tập · Thành viên | 管理员 · 编辑 · 成员 |
| Weekly harvest · Welcome back | Thu hoạch tuần này · Chào Minh! | 本周收获 · 欢迎回来 |

English words being learned (headwords, IPA, examples, collocations) are never translated. Part of speech and topic names are.

**Two language settings (design system §14.1).** *App language* (`ui_locale`) and *meaning language* (`meaning_locale`: `vi-VN`, `zh-CN` or none). The review card shows the meaning-language line first and the English definition second when a meaning language is set (A2-review-answer-vi), and only the English definition when it's none. On A8 the existing "Meanings in" row opens a **Language sheet** (a `BottomSheet`, no new canvas artboard) with both settings as radio groups; it's the only way to change language, so the A8 layout stays identical to the canvas.

**Steps**
- [x] **Locale plumbing:** `src/i18n/request.ts` resolves the locale as above; `src/i18n/config.ts` lists `['en-SG', 'en-US', 'vi-VN', 'zh-CN']` (the code is also the formatting locale); `<html lang>` inside the garden (`[data-ui="garden"]` wrapper gets `lang`), `NextIntlClientProvider` with `timeZone` from the profile. Server actions or a route handler set the `dygo_locale` cookie.
- [x] **Every string through `t()`**, including aria-labels, sheet titles, toasts and empty states. Dates, times, numbers, plurals and weekday initials through next-intl's `useFormatter` / ICU (`{count, plural, …}`), never concatenated. Weekday strips (A3, A4, A8 calendar) start on the locale's first day.
- [x] **`messages/vi-VN.json`** with exactly the `-vi` reference copy; **`messages/zh-CN.json`** from the glossary (mark the file header "draft, needs native review"). Key parity test: every key in `en.json` exists in the other two with the same ICU arguments.
- [x] **Per-language layout exceptions** that the Vietnamese canvas made: topic chips and the A4 day label are `white-space: nowrap`. Apply them for all languages (no effect in English).
- [x] **Fixture pages take `?locale=en-SG|en-US|vi-VN|zh-CN`** (old `en` / `vi` still accepted) (fixture data per locale in `fixtures.ts`: e.g. Vietnamese topic names, "Công việc", `T2…CN`, the Vietnamese-first review card). `garden:diff` gains `--locale` and diffs `<name>-vi` against `?locale=vi`; the report lists English and Vietnamese side by side.
- [x] **Chinese check without a canvas:** screenshots of every fixture page in `zh-CN` at the 8 viewports; nothing clipped, no new wrapping versus English, CJK glyphs from the system font (no tofu).
- [x] **Backend (allowed in this step):** `profiles.ui_locale text` and `profiles.meaning_locale text` (nullable, checked against the three codes / none), migration + RLS unchanged (own row only). There is no profile-update endpoint today: first check how `profiles.timezone` is written; if nothing writes it through the API, add `PATCH /api/v1/profiles/me` (own row, validated codes, tests). API surface doc updated in the same commit. This is the WS1 preference work shared with Phase 11.
- [x] **Language sheet** on A8 wired to the profile (optimistic, then refetch); changing the app language re-renders the garden without a full reload.
- [x] Lint: `react/jsx-no-literals` (or an equivalent check) on `src/components/garden/**` and `src/app/(garden)/**`, so a raw English string fails CI.

**Status (2026-09-26, UI-L pass):** every step above is built and committed (`33466be` → `4d6f4eb`). The 11 A-screens: Vietnamese 0.000–0.088% (A5's 0.088% is one letter, ICU's "Chủ Nhật" vs the canvas's "Chủ nhật"), English unchanged (A7 0.738%: the English references predate Be Vietnam Pro; decided). The 7 GR references are diffed when UI-G builds those screens. The font chain now follows the canvas renderer's order (see the README). Open: apply the migration, a native review of `zh-CN.json`, the language switch signed in on a real device. Report: `dygo_academy_session_report_2026-09-26.md`, "UI-L pass".

**Done when:** all 18 English and 18 Vietnamese references are at or below 0.5% (anti-aliasing only; the noise floor rule in the README applies), the three message files have identical keys, the `zh-CN` screenshots pass the check above, and a signed-in learner can switch language on A8 and keep it on another device.

### UI-G Groups: "shared gardens" (M design + L build)

**Why this step exists.** Groups are how tutors and academies use Dygo: groups, roles, invite links, group topics, review sprints and the mistake heatmap all exist in the classic UI and the backend. The Word Garden canvas never designed them, so the plan only said "restyle in UI-8". Because the garden must match the canvas 100%, Groups are **designed in the canvas first, then built** like every other screen.

**What the classic app has today** (all must be possible in the garden):

| Feature | Classic UI | API |
| --- | --- | --- |
| Group list + create | `groups/page.tsx`, `GroupCard`, `CreateGroupForm` | `GET /groups`, `POST /groups` |
| Group topics + create topic | `GroupTopicsPanel`, `CreateTopicModal` | `GET /topics`, `POST /topics`, `POST /topics/:id/clone` |
| Roster + roles (`ADMIN` / `WRITE` / `READ`) | `RosterPanel` | `GET /groups/:id/members`, `PATCH /groups/:id/members/:userId` |
| Invite links with a role | `InvitesPanel` | `GET/POST /groups/:id/invites` |
| Join by link | `join/[token]/page.tsx` | `POST /invites/:token/redeem` |
| Group settings | `GroupSettingsPanel` | `PATCH /groups/:id` |
| Review sprint push | `SprintTrigger` | `POST /notifications/groups/:groupId/sprint` |
| Mistake heatmap (teacher) | analytics page | `GET /analytics/:id/heatmap`; tenant rollup `GET /analytics/tenant/heatmap` |

**Garden concept.** A group is a **shared garden**; its topics are **shared beds**; members are **gardeners**; the heatmap becomes **tricky patches** (the words the group misses most); a sprint push is a **rain day** ("everyone water 10 words today"). Plants, stages, colours and components are the ones already built.

**Artboards to add to the canvas (Adult page)**, 390 × 844 like the others. They're numbered GR1–GR7 so they don't clash with gates G1–G3:

| # | Screen | Who | Replaces |
| --- | --- | --- | --- |
| GR1 | Shared gardens: your groups, your role, gardeners count, your due words in each | Everyone in a group | Group list |
| GR2 | Group garden: shared-plot hero (aggregate), this week's rain day, shared beds, gardeners | Members | Group detail (member view) |
| GR3 | Tricky patches + "Call a rain day" | `ADMIN` (and `WRITE`?) | Heatmap + `SprintTrigger` |
| GR4 | Gardeners and roles | `ADMIN` | `RosterPanel` |
| GR5 | Invite sheet: role, link, copy/share | `ADMIN` | `InvitesPanel` |
| GR6 | Join: "Minh invited you to IELTS Sprint's garden" | Invitee | `join/[token]` |
| GR7 | Create / edit garden sheet | `ADMIN` / creators | `CreateGroupForm`, `GroupSettingsPanel` |

The academy director rollup (tenant heatmap) stays **restyle only** for now, because it's an iPad/desktop report, not a daily learner screen.

**Privacy rule (must hold in every design).** FR-1.2 has no teacher exception on `user_word_srs`: a teacher can't read a learner's word-level progress. Group screens show **aggregates** (group totals, the heatmap's per-word mistake counts) and only the per-member facts the product explicitly allows (see decision 10). Any new endpoint gets RLS assertions.

**Steps:**
- [x] **Design:** add GR1–GR7 artboards to the Word Garden canvas using the existing components and tokens (Claude can draft them), plus the 5-tab or 4-tab navigation per decision 9
- [x] **G-design gate** (passed 2026-09-26): Dylan approves the artboards; then export them with `docs/design/garden/tools/render.js` into `docs/design/garden/reference/` (they become fidelity references like A1–A8)
- [x] **Components:** `GroupCard`, `GardenerRow`, `RoleBadge`, `InviteSheet`, `TrickyPatchRow`, `RainDayBanner`, all in `/garden/_gallery`
- [x] **Screens + fixture pages + pixel diff** for GR1–GR7 in English and Vietnamese (`GR*-vi`), same ≤ 0.5% rule; every string through `t()` in all three message files
- [x] **Live routes:** `/garden/groups`, `/garden/groups/[id]`, `/garden/groups/[id]/manage`, `/garden/join/[token]` on the existing endpoints above
- [x] **Backend:** group garden summary (aggregate), member count + my due count per group, invite preview; RLS assertions for each
- [x] Topics (A6) "Group" chip and the A4 group card link to the real group gardens — *superseded by NAV-1 (2026-09-27): the Group chip is gone; the A4 card links to the learner's own group garden*

**Status (2026-09-26, UI-G pass):** every step above is built and committed (`d9ab4d8` → `92e86bb`). Pixel diff: all 7 GR screens 0.000–0.013% in English and 0.000–0.001% in Vietnamese; A1–A8 unchanged. Backend: `database/migrations/20260926_group_garden.sql` (four SECURITY DEFINER aggregate functions) with `GET /groups/garden-counts`, `GET /groups/:id/garden`, `GET /groups/:id/tricky-patches`, `GET /invites/:token/preview`; `database/tests/rls_group_garden_test.sql` (30 assertions) passes, and so does the main suite with the migration applied. Invite links are the classic `/join/<token>`; the middleware sends flagged users to `/garden/join/<token>`. Open: apply the migration and add the new test file to `apply-migrations.sh --test` (that script has other uncommitted edits); rain days aren't stored (no table), so the GR1/GR2 rain-day banners and GR3's "Last rain day" stay hidden on live data; signed-in flows not verified on a real device. Report: `dygo_academy_session_report_2026-09-26.md`, "UI-G pass".

**Done when:** everything the classic group pages can do works in the garden, each GR screen matches its approved artboard (≤ 0.5%), and the RLS suite passes with the new assertions.

### UI-G follow-up: store rain days (RD-1 … RD-5)

**Why.** `POST /notifications/groups/:id/sprint` sends a push and keeps no row, so the rain-day blocks on GR1 (banner), GR2 (banner, "3/5 done · you: 4/10") and GR3 ("Last rain day") are hidden on live data (UI-G report, item 1). Decided by Dylan 2026-09-27:
- **Only words from the group's shared beds count** toward a rain day.
- **A rain day ends at 23:59 in the admin's time zone** (`profiles.timezone`; if unset, the backend `DEFAULT_TIMEZONE`). One shared deadline for everyone.
- One rain day per group per local day. Members see totals plus their own count, never anyone else's (FR-1.2).

Split into **five small passes, one commit each**, so no pass runs out of budget. Each pass does only its step.

| Step | What | Files (expected) | Status |
| --- | --- | --- | --- |
| **RD-1** | Migration + SQL functions + RLS tests. Nothing else. | `database/migrations/20260927_group_rain_days.sql`, `database/tests/rls_group_rain_days_test.sql` | ✅ `d89f6c8`
| **RD-2** | Backend: sprint endpoint stores the rain day; `GET /groups/:id/rain-day`; `DELETE /groups/:id/rain-day`; jest; API doc row(s) | `notifications.service.ts`, `trigger-sprint.dto.ts`, `groups.controller.ts`, a `rain-day.service.ts` (+ spec), `dygo_academy_api_surface.md` | ✅ `cb1fcc9`
| **RD-3** | Backend: `rainDay` on each group in `GET /groups/garden-counts` (GR1); jest | `group-garden.service.ts` (+ spec), API doc | ✅ `39d855b`
| **RD-4** | Frontend: types + hooks, GR1/GR2/GR3 rain-day blocks shown on live data, "Start rain day" sends `wordsPerGardener` and handles 409, "Water" opens the shared bed with the most due words; Vitest | `src/components/garden/live/*Group*`, `src/hooks/`, `src/types/`, messages only if a string is missing (all three files) | ✅ `97ad9c1`
| **RD-5** | Verify + report: tsc, lint, vitest, jest, `next build` in the mirror, GR pixel diffs unchanged (en + vi); session report section; §1 + this checklist; changelog line | report, plan (don't commit), master schedule (don't commit) | ⏳ not landed: started 04:45 UTC 2026-09-27, no commit, lock or rain-day change by 07:21 UTC. The next pass runs RD-5 as specified |

**RD-1 spec (database)**

```sql
create table public.group_rain_days (
  id                 uuid primary key default gen_random_uuid(),
  group_id           uuid not null references public.groups(id) on delete cascade,
  created_by         uuid references public.profiles(id) on delete set null,
  words_per_gardener smallint not null check (words_per_gardener in (5, 10, 20)),
  message            text check (char_length(message) <= 200),
  starts_at          timestamptz not null default now(),
  ends_at            timestamptz not null,
  local_date         date not null,
  timezone           text not null,
  cancelled_at       timestamptz,
  created_at         timestamptz not null default now(),
  check (ends_at > starts_at)
);
create unique index group_rain_days_one_per_day
  on public.group_rain_days (group_id, local_date) where cancelled_at is null;
alter table public.group_rain_days enable row level security;
create policy group_rain_days_select_member on public.group_rain_days
  for select using (public.has_group_role(group_id, 'READ'));
-- no insert/update/delete policies: writes only through the functions below
```

- `start_group_rain_day(p_group_id uuid, p_words smallint, p_message text) returns group_rain_days` — SECURITY DEFINER, `set search_path = public`, checks `has_group_role(p_group_id,'ADMIN')` (else 42501), computes `local_date` and `ends_at` (end of that day) in the caller's `profiles.timezone`, inserts; a second active one that day raises 23505.
- `cancel_group_rain_day(p_group_id uuid)` — ADMIN only; sets `cancelled_at` on today's active row.
- `group_rain_day_status(p_group_id uuid) returns table (id, words_per_gardener, starts_at, ends_at, is_current boolean, gardeners bigint, done bigint, mine bigint)` — SECURITY DEFINER, stable, READ members only (42501). Returns up to two rows: the current rain day (now between starts_at and ends_at, not cancelled) and the last finished one. `done` = members who watered ≥ `words_per_gardener` distinct words of the group's topics (`review_logs` joined through `topic_words` → `topics.group_id`) between `starts_at` and `ends_at`; `mine` = the caller's own count (`auth.uid()`); `gardeners` = current member count. **Never returns a user id.** Same style and comments as `20260926_group_garden.sql`; grant execute to `authenticated` only.
- RLS tests: non-member sees no rows and gets 42501 from status; READ member can select + status but can't start/cancel; ADMIN starts one, a second the same day fails with 23505, cancel then start again works; status output has no user-id column; `mine` matches the caller's own reviews only.

**API (RD-2, RD-3)** — backwards compatible; the classic `SprintTrigger` must keep working.

| Endpoint | Change |
| --- | --- |
| `POST /notifications/groups/:groupId/sprint` | Optional `wordsPerGardener` (5/10/20, default 10). Calls `start_group_rain_day` first; 23505 → 409 "A rain day is already running today" (no push sent). Then pushes as today; response adds `rainDay: { id, endsAt, wordsPerGardener }`. Push path → the garden group page when the learner is on the garden UI is out of scope; keep `/study`. |
| `GET /groups/:id/rain-day` | `{ current, last }` from `group_rain_day_status` (each `null` if none) |
| `DELETE /groups/:id/rain-day` | ADMIN cancels today's; 204 |
| `GET /groups/garden-counts` | each group gains `rainDay: { wordsPerGardener, gardeners, done, mine, endsAt } \| null` (current only) |

The in-memory `SprintRateLimitGuard` stays (it still stops push spam); the unique index is what enforces one per day.

**Rules for RD passes.** §10 applies. Start by checking the previous step's commit exists (`GIT_OPTIONAL_LOCKS=0 git log --oneline -15 | grep "RD-"`). If it doesn't, do **that** step instead and stop. Read only the files listed for your step plus this section; don't re-read whole reports. Commit message `UI-G RD-n: …`.

### NAV-1: Groups tab on the A-screens, no Group chip, A4 group card (2026-09-27)

**What changed in the design.** Canvas version `1790485425-11d4`, approved by Dylan 2026-09-27:
- The adult bottom tab bar is **5 tabs** (Garden · Missions · Topics · Groups · Me; vi Vườn · Nhiệm vụ · Chủ đề · Nhóm · Tôi) on A1, A4, A5, A6 and A8, the same as the GR screens. Learners in no group still get 4 tabs (decision 9, unchanged).
- **A6 Topics chips: All · IELTS Academic · Mine.** The "Group" chip is removed. Shared beds still show under All.
- **A4 Weekly harvest:** the group card links to that group's garden (`/garden/groups/[id]`), copy "4 of 5 watered today · 126 shared words" (vi "Hôm nay 4/5 người đã tưới · 126 từ chung", zh-CN "今天 4/5 人已浇水 · 126 个共享单词").

**Status: ✅ built and committed; pixel diff not yet run.**

| Commit | What |
| --- | --- |
| `b30b6a0` | `design: …` the re-exported references (A1/A4/A5/A6/A8 × en/vi, PNG + HTML) and the 10 changed `source/*.dc.html`. English references re-rendered with the current `tools/render.js` (DM Sans + Be Vietnam Pro fallback). |
| `f00dc6e` | `NAV-1: …` code, messages, Vitest, and the NAV-1 section of `dygo_academy_session_report_2026-09-26.md` |

How it's built (read these if you touch it):
- **5 tabs on the reference pages:** `ReferenceScreen.tsx` wraps every non-GR reference in `<GroupsTabProvider value>`, so the sample learner is "in a group". Live pages are unchanged: `GroupsTabLive` still decides from `GET /groups`.
- **No Group chip:** `topicFilters()` in `live/data.ts` no longer returns a `group` chip; `TopicsScreen` lost the `groupsHref` prop and its "Open shared gardens" link; `TopicsLive` no longer passes them. The generic chip filter in `TopicsScreen` is unchanged, so shared beds (`group: 'group'`) appear under All.
- **A4 card:** `WeeklyHarvestScreen`'s `group` prop now carries `href?` and `sharedWords` (was `plotWords`; the `groupHref` prop is gone); `group: null` renders **no card**. `HarvestLive` takes the learner's **first** group from `GET /groups` and its totals from `GET /groups/:id/garden` (`watered_today`, `member_count`, `word_count` = shared words); no group, or not loaded yet / error → no card.
- **Messages** (all four files: `en-US`, `en-SG`, `vi-VN`, `zh-CN` — the older `en.json` / `vi.json` names in §10 rule 10 now mean these): `screens.harvest.groupBody` rewritten; `screens.topics.group`, `screens.topics.openGroups`, `screens.harvest.groupName`, `screens.harvest.openGroups` removed.
- **Tests:** `data.test.ts` (no Group chip), `screens.test.tsx` (A4 card links to its garden; no card without a group). Vitest 21 files / 216 tests pass; `tsc` (app + test config) and `next lint` clean.

**Open (for the next developer):**
- [ ] **Pixel diff** on the Mac (couldn't run in the sandbox: no Chromium, too little disk for Next's compiler): `npm run dev`, then `npm run garden:diff -- --base http://localhost:3000 --cookie dygo_ui=garden --locale en-SG,vi-VN --only A1-todays-garden,A4-weekly-harvest,A5-welcome-back,A6-topics,A8-me`. Each must be ≤ 0.5% (anti-aliasing only); A7 and the GR screens should be unchanged. If A4 is over, check the card is a `<Link>` with the same box as before (class `GROUP_CARD`). Never edit the references. Record the numbers in the session report and in §1.
- [ ] **Signed-in check** (`?ui=garden`): a learner in a group sees 5 tabs on every garden tab, and the A4 card opens *their* group's garden with the right counts; a learner in no group sees 4 tabs and no A4 group card; the A6 chips are All / collections / Mine only.
- [ ] Native review of the new zh-CN `groupBody` (decision 8).

**Known limits (by design, not bugs):** the live A4 card has **no initials row** (the group endpoints return aggregates only, decision 10); a learner in several groups sees the **first** one from `GET /groups` (no picker); `/garden/missions` makes one extra request (`GET /groups/:id/garden`). Classic screens are untouched.

**Sandbox notes for the next automated pass:** the device VM has ~700 MB free. A scratch mirror outside the repo worked with `npm ci --ignore-scripts --omit=optional` plus the arm64 bindings `@rolldown/binding-linux-arm64-gnu`, `lightningcss-linux-arm64-gnu`, `@unrs/resolver-binding-linux-arm64-gnu` (`npm install --no-save`); delete the mirror afterwards. Commits leave `.git/HEAD.lock` / `index.lock` behind: move them into `.git/stale-locks/`.

### UI-7 iPad, languages, auth screens, accessibility (M)

- [ ] iPad layouts from design system §10: rail at 600px+, sidebar and master–detail at 1024px+, two-pane review in landscape, keyboard shortcuts (Space, 1–4, P, Esc)
- [ ] Languages moved to **UI-L** (2026-09-26). What's left here: a native-speaker review of `zh-CN.json` and `vi-VN.json` before release.
- [ ] Meaning-language line on cards (needs `word_translations` content per language; start with the launch market's language) and the UK/US choice for IPA and audio (`ipa_us` / `ipa_uk` already exist on `DueCard`)
- [ ] Login, register and the `/search` guest landing restyled, with their logic kept
- [ ] Full accessibility pass (design system §15) and the reduced-motion check

**Done when (G3):** every garden screen passes the checks in §6 at all 8 viewports and in `en-US`, `en-SG`, `zh-CN` and `vi-VN`.

### UI-8 Switch over and delete the classic adult UI (S)

- [ ] Set `NEXT_PUBLIC_GARDEN_UI=true` in production; `?ui=classic` stays for one week
- [ ] Classic group pages (`groups/**`, `components/groups/*`, `join/[token]`) deleted with the rest once UI-G is live; only the tenant director rollup is restyled
- [ ] After a stable week, **in one commit that's easy to revert**: delete every "Remove" row of the inventory in `ui rebuild implementation plan.md`, the classic tokens, `Navbar`/`PublicNavbar`, `CONTENT_WIDTH` and the flag
- [ ] Rename: drop the `garden-` Tailwind prefix, `medium`/`expanded` → `md`/`lg`, `GARDEN_CONTENT_WIDTH` → `CONTENT_WIDTH`, move the `/garden` paths to their final URLs (see §8, decision 1)
- [ ] Update the frontend architecture doc (§3, §4, §16, §17), `routes.ts`, the API surface doc, the UAT checklist and the README

**Done when:** a search of `src/` finds none of the removed component or token names, the build and tests are green, and the escape hatch is gone.

## 6. Verification

| Check | How | From |
| --- | --- | --- |
| Types and lint | `npx tsc --noEmit`, `npx next lint` | Every step |
| Unit tests | Vitest (frontend, added in UI-2); `npm test` (backend, 217 today) | UI-2 |
| Matches the mockup | Playwright screenshots at 390 × 844 next to `docs/design/garden/*.png`; differences listed and fixed or accepted | UI-2 |
| Screen sizes | The 8 viewports in design system §16.1 | UI-3 (iPhone), UI-7 (iPad) |
| Languages | `en-US`, `en-SG`, `zh-CN`, `vi-VN` on iPhone SE and iPad portrait | UI-7 |
| Same data in both UIs | For beta accounts: due count, streak, mastered count and topic counts, compared classic vs garden | UI-4 → UI-8 |
| RLS | The RLS suite with new assertions for every new table | UI-6 |
| Accessibility | Contrast, labels, keyboard, VoiceOver order, 200% text, reduced motion | UI-2, full pass in UI-7 |
| Real devices | Safari on one iPhone and one iPad, plus a Home Screen install | Every gate |
| Production build | `next build` on the Mac. In the sandbox it only works with mocked fonts. | Every gate |

## 7. Rollout

1. **Dev only** (now): the flag is off everywhere, and Dylan uses `?ui=garden`.
2. **Beta** (after G1 and UI-4): 3–5 invited users with `?ui=garden`.
3. **Everyone** (after G3): `NEXT_PUBLIC_GARDEN_UI=true`, with `?ui=classic` for one week.
4. **Delete** (UI-8): classic adult UI removed once there are no open garden bugs.

Rollback at any point: unset the env flag (everyone gets classic), or use `?ui=classic` for one browser.

## 8. Decisions needed

| # | Decision | Needed by | Default in use |
| --- | --- | --- | --- |
| 1 | Final URLs after UI-8: keep today's (`/`, `/topics`, `/study`) or use new ones (`/garden`, `/review`)? | UI-8 | `/garden/...` |
| 2 | Body font | G1 | ✅ Decided 2026-09-26: DM Sans, with Be Vietnam Pro for Vietnamese letters (built in `6917965`). Open: accept A7's 0.74% Vietnamese-only difference, or use DM Sans alone |
| 3 | Confirm namespaced Tailwind names until UI-8 | UI-2 | Namespaced |
| 4 | Beta users for G2 | UI-4 | — |
| 5 | Launch market, which sets the first translation and audio accent | UI-7 | — |
| 6 | Mainland China in v1? (Google sign-in, fonts at build time, audio CDN, backend reachability; design system §14.6) | UI-7 | Not in v1 |
| 7 | Streak freeze rules: how many, and how often they refill | UI-6 | 2, refilled weekly |
| 8 | Who translates `zh-CN` and `vi-VN` | UI-L | Vietnamese: the approved canvas copy (Dylan, 2026-09-26). Chinese: Claude's draft from the UI-L glossary; **needs a native reviewer** before release |
| 9 | Groups in navigation: a 5th tab "Groups" shown only to people in at least one group, or keep 4 tabs and reach groups from A4, A6's "Group" chip and Me | UI-G design | ✅ Decided 2026-09-26 (GR artboards approved): 5th tab "Groups" for group members. 2026-09-27 (NAV-1): the A-screen canvas shows it too, and A6's "Group" chip is gone |
| 10 | Which per-member facts a group may show (e.g. "watered today" dot, streak), given FR-1.2's no-teacher-exception | UI-G design | ✅ Decided 2026-09-26: aggregates only |
| 11 | Garden names for roles: `ADMIN` / `WRITE` / `READ` → "Head gardener" / "Gardener" / "Visitor", or keep "Admin / Editor / Viewer" | UI-G design | ✅ Decided 2026-09-26: plain names (Admin / Editor / Viewer; vi Quản trị / Biên tập / Thành viên) |

## 9. Risks

| Risk | Effect | Mitigation |
| --- | --- | --- |
| Group screens expose one learner's progress to others | Privacy breach (FR-1.2) | Aggregates only until decision 10; RLS assertions for every new group endpoint |
| ~110 uncommitted changes from Phase 10 / the database squash sit in the working tree | A build pass sweeps them into a Phase 12 commit | Stage exact paths only (see §10). Commit that work separately and soon. |
| Missions need backend work | Home shows missions that don't count | UI-4 shows only data-backed missions; the rest wait for UI-6 |
| Two UIs live at once | Double upkeep, confusing bug reports | Keep G2 → UI-8 short; classic gets bug fixes only |
| Interval previews drift from what `rate()` actually schedules | Learners see "5 days" and get 4 | Both come from the same `fsrs-scheduler.ts` call; add a test that `preview[r]` equals the `rate(r)` result |
| Long real data (topic names, 3-digit counts, Vietnamese) | Broken layouts | Test with the longest real data and `vi-VN` on iPhone SE every step |
| Fonts need Google at build time | Docker/CI builds fail offline | `next/font/local` fallback (§4.3) |
| Sandbox quirks (git lock files, no Supabase, no real session) | Signed-in paths can't be verified overnight | Every gate includes a manual check on the Mac |

## 10. Rules for automated build passes

Any scheduled or unattended pass working on Phase 12 follows these rules:

1. Read the latest session report and this file's §1 status table first. Do the **next unfinished step only**, and stop at the next gate (G1, G2 or G3) for Dylan to check. Order from 2026-09-26: **UI-L, then UI-G** (both built), then the open parts of UI-3 to UI-6.
2. **Never** use `git add -A`, `git add .`, `git stash`, `git reset` or `git checkout` on files you didn't create or edit. Stage exact paths. If a file you must edit already has someone else's uncommitted changes, edit on top of them and say so in the report.
3. Nothing a classic user sees may change before UI-8. New code goes in `(garden)`, `components/garden/`, `[data-ui="garden"]` CSS, or garden-only API additions that are backwards compatible.
4. Backend and `database/` changes only in the steps that list them (UI-4, UI-5, UI-6, UI-L, UI-G), each with tests and the API surface doc updated in the same commit.
5. One commit per step or part-step, message `UI-n: …`. For git lock files, retry in a loop and move stale locks aside with `mv` into `.git/stale-locks/`; don't use bare `/tmp`.
6. Verify with `tsc`, lint and tests. Say plainly what couldn't be verified (signed-in flows, real fonts, `next build` without mocked fonts).
7. Write the day's session report, update §1's status table here, and add one changelog line to the master schedule.
8. If the code doesn't match this plan closely enough to know what to do, stop and explain. Don't guess.
9. **Match the canvas 100%.** Build every screen from `docs/design/garden/reference/<screen>.html` values. Add a fixture page `/garden/_reference/<screen>` with the canvas sample data, pixel-diff it against `reference/<screen>.png` (at most 0.5%, anti-aliasing only), and report each screen's diff in the session report. Never change the references to make a diff pass; if the canvas itself changes, re-export it in its own commit.
10. **Languages.** Every new string goes into `en-SG.json`, `en-US.json`, `vi-VN.json` and `zh-CN.json` in the same commit (UI-L glossary). Every screen with a `-vi` reference is diffed in English and Vietnamese.
