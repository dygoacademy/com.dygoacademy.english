# 🌱 Phase 12 Implementation Plan: Adult UI Rebuild ("Word Garden")

**Document Version**: 1.0
**Date**: 2026-09-26
**Owner**: Dylan
**Status** (2026-10-03): Home page v2: **G-home passed** (Dylan approved the boards, the Vietnamese copy and the word meanings), references committed in `f254fbd`; HP-6 … HP-11 scheduled overnight 10-04 (02:00 → 08:15 SGT). HP-3/HP-4 (v1) are folded into HP-11. **Status** (2026-10-02): **Phase 12 done in code** apart from Dylan's checks. UI-8 finished (U8-1 … U8-6, `bc999be` → `bac901a`): the classic UI is deleted, the garden is the only signed-in UI at the final short URLs, old links 308-redirect; tsc/lint/Vitest green. Dylan to do: deploy, `next build` on the Mac, `npx playwright test` (ui), `garden:diff --locale en-US,vi-VN` on all references, real iPhone + iPad on the new URLs incl. old `/garden/...` and `/study` redirects. Earlier: UI-0 … UI-6, UI-L, UI-G, UI-A done; UI-4 beta week 2026-10-02 → 10-09 and UI-7 continue separately.
**Companion documents**:
* `docs/product/dygo_academy_master_project_schedule.md`: the Phase 12 section (summary, status, sequencing)
* `docs/architecture/dygo_academy_ui_ux_design_system.md` v0.2: **the spec**. Tokens §4–§7, breakpoints §2, screens §10, components §11, localization §14.
* The "Dygo Word Garden" design canvas, Adult page (A1–A8): **the visual reference**
* `docs/reports/dygo_academy_session_report_2026-09-25.md`: what the first build pass did and assumed
* `docs/plans/archive/ui rebuild implementation plan.md`: the first draft of this plan. It's **superseded by this file** and kept only because the 2026-09-25 pass and its report point at it.

---

## 1. Summary

Phase 12 replaces every adult screen with the Word Garden design: words shown as plants, three daily missions, and retention screens (Mission complete, Weekly harvest, Welcome back). It works on iPhone and iPad, in English, Chinese and Vietnamese. The new UI is built beside the classic UI behind a flag, becomes the default, and the classic adult UI is then deleted.

It's split into eleven steps, UI-0 to UI-8 plus **UI-L (Languages)** and **UI-G (Groups)**, with three gates, and a design gate for Groups:

| Step | Name | Size | Status | Gate at the end |
| --- | --- | --- | --- | --- |
| UI-0 | Flag and route group | S | ✅ `1173901` | — |
| UI-1 | Foundations: tokens, fonts, i18n | S | ✅ `3b530d5` | — |
| UI-2 | Components and gallery | M | ✅ built (`4ebf713` … `1063de0`), matched to the canvas: fonts `6917965`, components `061a08d`. **G1 passed (Dylan, 2026-09-30)**: components match the mockup, VoiceOver OK on a real iPhone | **G1** ✅ |
| UI-3 | App shell, navigation and test tooling | S | ✅ **done 2026-09-30.** Tab bar + garden routes (`c42b5b3`), pixel diff (`4341851`); U3-0 catch-up checks `08b4f33`, U3-1 loading/error/not-found + `EmptyState` `04cd6e9`, U3-2 iPad rail + sidebar behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` `51df121`, U3-3 Playwright suite `1561fb0`, U3-4 signed-in fixture + tab/back tests `daa29f7`, U3-5a `/garden` in `PROTECTED_PATH_PREFIXES` `3e602f8` (+ e2e sign-in label fix `03a1ede`); U3-5 wrap-up 2026-09-30: on the Mac tsc/lint/vitest 299 ✅, `build:prod:domain` ✅, Playwright 448/448 ✅ (signed out + signed in, 8 viewports). Real-iPhone check ✅ (Dylan, 2026-09-30: all tabs + Back, full-screen Review, signed-out `/garden/topics` → sign in → back) | — |
| UI-4 | Core loop: Home, Review, Mission complete | L | 🟡 code complete: A1/A2/A3/A5 built (`afe8fd0`), live (`c42b5b3`), synonym chips `ac29ec1`, interval previews (`df9125e`, `238c10d`, `4092a59`); UI-4 finish U4-1 → U4-5 (`365a13c` previews = `rate()`, `e53f988` stage counts, `4b701fd` live plants + ripens tomorrow, `6e7eb53` missions v0, `7300da9` classic↔garden parity spec); iPad Home: hero garden fills the card width + full-width Continue `48912ed`. **G2 setup done 2026-10-02**: all migrations through `20261001_retention` applied (the live site uses the same database), Playwright on the Mac 577 passed / 7 skipped incl. the parity spec, 3–5 beta users invited with `?ui=garden`. **Beta week 2026-10-02 → 2026-10-09**; open: compare due/streak/mastered classic vs garden mid-week and at the end | **G2**: core loop live for beta users |
| UI-5 | Topics and topic bed | M | ✅ done 2026-09-27 (U5-1 `6e86063` → U5-6 `5f016d7`, fix `b467190`, wrap-up U5-7): A6 beds by due words, A7 live stages/filter/next-due sort, Water N due, Add word sheet, garden quiz + results + leech drill. Checks: frontend tsc/lint/vitest 244/`next build` ✅, backend tsc/jest 263 ✅. Open: `garden:diff` A6/A7 after U5-5/6 (no browser on the VM), collocation quiz → UI-6. **Quiz design** (2026-10-01): QZ-1 `d924173`, QZ-2 `956dd43`, QZ-4 `a95b5e2` (live Drill link wired; tsc/lint/Vitest 313 ✅); open: QZ-3 Q1–Q8 pixel diff (en + vi) on the Mac | — |
| UI-6 | Retention: missions, streak freezes, reminders, Me | L (backend) | ✅ **Done 2026-10-02** (RLS suite, garden:diff en+vi and real-iPhone check passed). A4/A8 screens built (`afe8fd0`); live A8 reminder switch on the existing schedules; the rest shows "coming soon" until the backend lands. SO-1 (2026-09-29): A8 gear → Account sheet → Sign out → `/login` (tsc/lint/vitest 285 ✓; `garden:diff` A8-me/A8-me-account pending on the Mac). UI-6 finish: U6-1 `247d92d`, U6-2 `bc9c73d`, U6-3 `828a74b`, U6-4 `a66e3bb`, U6-5 `68e08e8`, U6-6 `d1e24ce` (2026-10-01), U6-7 `1a4a770`, U6-7b `c96515a` (2026-10-02); U6-8 `8f1ca2f` (2026-10-02). ✅ Code complete; RLS suite ✓ on the Mac (2026-10-02); Playwright ✓ except `gallery vi-VN` (test locale clash); `garden:diff` A1/A3/A4/A5/A8 en+vi all pass on UAT after SO-1 fixes `84f7853`, `e8fea77`; real-iPhone check ✓ (2026-10-02); `gallery vi-VN` locale clash fixed by Dylan | — |
| UI-L | Languages: English, 简体中文, Tiếng Việt, built and checked in English + Vietnamese | M | ✅ built 2026-09-26 (`33466be` → `4d6f4eb`): 11/11 Vietnamese A-references ≤ 0.088%, English unchanged (A7 0.738%, font decision); zh-CN screenshots at 8 viewports pass; `zh-CN.json` waits for a native review; migration `20260926_profile_locales.sql` to apply. GR references are diffed in UI-G | — |
| UI-G | Groups ("shared gardens"): design in the canvas, then build | M design + L build | ✅ built 2026-09-26 (`d9ab4d8` → `92e86bb`): GR1–GR7 English 0.000–0.013%, Vietnamese 0.000–0.001%; zh-CN screenshots at 8 viewports pass; 5th tab for group members; aggregate-only backend + 30 RLS assertions; live routes on the existing endpoints. Open: apply `20260926_group_garden.sql`, rain-day storage (banners hidden until then), signed-in checks on a real device. NAV-1 (2026-09-27, `b30b6a0` design + `f00dc6e` code): Groups tab on A1/A4/A5/A6/A8, no Group chip on A6, A4 group card → `/garden/groups/[id]` on live data; NAV-1 pixel diff done in U3-0 (`08b4f33`): A1/A4/A5/A6/A8 ≤ 0.088% en + vi. **RD-1…RD-5 done** (`d89f6c8` → `97ad9c1`, checks in `08b4f33`): rain days stored, banners live; apply `20260927_group_rain_days.sql` | — |
| UI-A | Sign in and create account (AU1–AU4), English + Vietnamese | S–M | ✅ **Code complete 2026-09-29** (A-1 `8be6590` → A-5 `f98a832`); **pixel diff fixed 2026-09-30** (`7068a9e`: title line height dropped by `gcn()`): all 12 AU references pass on UAT, en 0.115–0.253%, vi 0.129–0.261%. **G-auth passed (Dylan, 2026-10-01): real sign-in, sign-up and password reset tested on the live site.** Still open (non-blocking): reset link (self-hosted GoTrue: `GOTRUE_URI_ALLOW_LIST` = `${FRONTEND_URL}/*` already allows `https://www.dygoacademy.com/reset-password`; a reset started on the bare `dygoacademy.com` would fall back to the site URL, so test from www), AU3 invite banner (needs an anon-safe invite preview, or keep without), Terms/Privacy URLs (decision 12) | **G-auth** ✅ passed 2026-10-01 |
| UI-7 | iPad, languages, auth screens, accessibility | M | Not started; planned as U7-1 … U7-7 (2026-10-05 → 10-13, G3 target 10-15) | **G3**: every screen passes QA |
| UI-8 | Switch over and delete the classic adult UI | S | ✅ Done 2026-10-02 (U8-1 … U8-6; `bc999be` → `bac901a`; classic UI deleted, short URLs live in code). Waiting on Dylan: deploy, `next build`, Playwright, `garden:diff` en+vi, real iPhone/iPad | — |

Sizes are rough estimates for one developer working with Claude: S = 2–3 days, M = about a week, L = 1–2 weeks.

### Design fidelity: 100% match with the canvas

**The garden UI must match the "Dygo Word Garden" canvas 100%**: layout, spacing, sizes, colours, fonts, radii, shadows, icons, illustrations and copy. Where the code, this plan or `docs/architecture/dygo_academy_ui_ux_design_system.md` disagree with the canvas, **the canvas wins**.

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
* ✅ **Open item from the first pass, closed in U3-5a (`3e602f8`, 2026-09-30):** `/garden` is in `PROTECTED_PATH_PREFIXES`, so the middleware sends signed-out visitors to `/login?next=<path>`; `/garden/_reference`, `/garden/_gallery` and `/garden/_tokens` are kept public by an exception in `isProtectedPath` (`routes.test.ts`, 14 tests).

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
* The next-intl provider is only in the `(garden)` layout. Keys are typed (`src/types/next-intl.d.ts`) and messages live in `messages/<locale>.json` (`en-US` is the source). **Every garden string goes through `t()`.**

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

### ✅ UI-2 Components and gallery (M, built: `4ebf713` → `1063de0`; G1 passed 2026-09-30)

Done in part 1 (`4ebf713`): `Button` (primary / secondary / forest, pressed, disabled, loading), `IconButton`, `Chip`, `Card`, `StatTile`, `Switch`, `ProgressVine`, `gcn()`, and `/garden/_gallery`.

Done in parts 2–5 (2026-09-26, see `docs/reports/dygo_academy_session_report_2026-09-26.md`):
- [x] `PlantGlyph`: seed, sprout, flower, tree, wilting, thirsty drop; sizes 24, 32, 40, 56, 72; drip/bloom animation that respects reduced motion. `stageFromSrs(fsrs_state, mastered_at, is_leech)` with unit tests (`f06702b`)
- [x] `RatingBar`: 4 buttons with intervals; disabled while saving; keys 1–4 with hints after keyboard use (`f06702b`)
- [x] `ReviewCard`: chips → word + IPA + audio → answer (meaning, meaning-language line with its own `lang`, example, collocations); hidden and shown states (`6ed48f0`)
- [x] `AudioButton` (garden): classic playback logic plus the "audio unavailable, tap to retry" state (§14.6); classic file unchanged (`6ed48f0`)
- [x] `MissionRow`, `HeroGardenCard` (normal and comeback), `StageTile` (`aria-pressed`), `WordRow` (normal, due now, wilting) (`7a8be4e`)
- [x] `BottomTabBar`, `BottomSheet` (on the existing Radix dialog), `Toast` (`1063de0`)
- [x] **Frontend test runner**: Vitest 5 + Testing Library + jsdom, `"test": "vitest run"`. 131 tests: `stageFromSrs` (every state combination), `RatingBar` keys and disabled state, `Switch` / `StageTile` / tab bar ARIA, sheet, toast, review card (`f06702b` onwards)
- [x] **Dylan, on the Mac:** `npm install` (the lockfile was updated from a Linux copy; the Mac's `node_modules` wasn't touched), then `npm test`, `npx tsc --noEmit` and `next build`. Until `npm install`, `tsc` fails on the test files because `vitest` isn't installed yet. Done on the Mac by the UI-3 wrap-up (2026-09-30): tsc, lint, Vitest 299/299 and `build:prod:domain` pass.
- [x] **Dylan:** export the 8 adult mockups to `docs/design/garden/` and compare `/garden/_gallery` side by side at 390px (G1)
- [x] **Dylan:** VoiceOver pass on the review card, rating bar, sheet and tab bar on a real iPhone (G1)

**Done when (G1):** every component matches its part of the canvas references in `docs/design/garden/reference/` (checked against the exact values in the reference HTML, not by eye), the known differences in `docs/design/garden/README.md` are fixed (DM Sans body font once approved, Fraunces with the opsz axis, canvas SVG paths), it works by keyboard, VoiceOver reads it correctly, and `npm test` passes.

### UI-3 App shell, navigation and test tooling (S)

- [x] **First:** add `/garden` to `PROTECTED_PATH_PREFIXES` in `routes.ts` (U3-5a `3e602f8`)
- [x] `(garden)` shell: bottom tab bar (Garden, Missions, Topics, Me) with safe-area padding; placeholder pages for each tab (`c42b5b3`; fifth Groups tab from UI-G/NAV-1)
- [x] Sub-screens pushed with a back button; full-screen review with no tab bar (`c42b5b3`; Back covered by U3-4 `daa29f7`)
- [x] Garden `loading.tsx`, `error.tsx` and empty states (U3-1 `04cd6e9`)
- [x] Rail (600px+) and sidebar (1024px+) built, but switched off until UI-7 (U3-2 `51df121`, `NEXT_PUBLIC_GARDEN_IPAD_NAV`)
- [x] Playwright in `com.dygoacademy.automationtesting/ui/`: the 8 viewports from design system §16.1, a signed-in fixture user, and screenshot tests for `/garden/_gallery` (U3-3 `1561fb0`, U3-4 `daa29f7`)

**Done when:** all 4 tabs and back work on an iPhone without layout jumps, and the Playwright suite runs on the Mac.
**Status (2026-09-30, U3-5): ✅ done.** Playwright 448 passed / 0 failed / 0 skipped on the Mac (signed in, 8 viewports); real-iPhone Safari check passed (Dylan): all tabs + Back without layout jumps, full-screen Review, signed-out `/garden/topics` → sign in → back to `/garden/topics`.

### UI-3 finish (U3-0 … U3-5), added 2026-09-27

Small passes, **one commit each**, 75 minutes apart, so none runs out of budget. Each pass reads only this section, §10 and the files for its step. Start by checking the previous step's commit (`GIT_OPTIONAL_LOCKS=0 git log --oneline -20 | grep "U3-"`); if it's missing, do that step instead and stop. Commit message `UI-3 U3-n: …`.

| Step | What | Files (expected) |
| --- | --- | --- |
| **U3-0** | Catch-up checks only: redo RD-5 (it left no commit) and run `garden:diff --locale en,vi` for A1, A4, A5, A6, A8 after NAV-1. Fix only a failing check. Report + tick RD-5. | report, plan (don't commit) | ✅ `08b4f33`
| **U3-1** | `(garden)` `loading.tsx` (garden skeleton, no layout jump), `error.tsx` (friendly retry, i18n), `not-found.tsx`; shared `EmptyState` used by Topics, Topic bed, Groups when there's no data. All strings in en/vi/zh-CN. Vitest. | `src/app/(garden)/**`, `src/components/garden/EmptyState.tsx`, messages | ✅ `04cd6e9`
| **U3-2** | iPad navigation: `GardenRail` (≥ 600px, icons + labels, same 4/5 tabs) and `GardenSidebar` (≥ 1024px), behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (default off, turned on in UI-7). Gallery entries. Tab bar unchanged at < 600px. Vitest for the switch. | `src/components/garden/`, `constants/garden.ts`, gallery | ✅ `51df121`
| **U3-3** | Playwright in `com.dygoacademy.automationtesting/ui/`: its own `package.json` + `playwright.config.ts` with the 8 viewports of design system §16.1, screenshot tests of `/garden/_gallery` and every `/garden/_reference/*` page (en + vi). Runs against `BASE_URL` with the `dygo_ui=garden` cookie. No sign-in yet. `README.md` with the Mac commands. | `com.dygoacademy.automationtesting/ui/**` | ✅ `1561fb0`
| **U3-4** | Signed-in fixture user: `global-setup.ts` signs in with `E2E_EMAIL` / `E2E_PASSWORD` (from `.env.e2e`, gitignored; tests skip with a clear message if unset) and saves `storageState`. Tests: every tab + back from Topic bed and Group garden, no layout jump (bounding-box check of the tab bar before/after navigation). | `…/ui/**` | ✅ `daa29f7`
| **U3-5** | Verify + wrap up: tsc/lint/vitest/`next build`, run the Playwright suite if a browser is available; tick the UI-3 checklist for what's done (tab bar, routes, back buttons, full-screen review, tests); §1 UI-3 row; report; changelog line. The `routes.ts` item stays open (others' uncommitted edits; the garden layout already redirects signed-out users) — say so. | report, plan, master schedule (don't commit the last two) | ✅ 2026-09-30: Mac tsc, lint, vitest 34 files / 299, `build:prod:domain`, Playwright 448/448; real-iPhone check ✅ (Dylan). The `routes.ts` item was closed by U3-5a `3e602f8`. |
| **U3-5a** | `/garden` in `PROTECTED_PATH_PREFIXES`, `_reference`/`_gallery`/`_tokens` kept public, Vitest | `constants/routes.ts`, `routes.test.ts` | ✅ `3e602f8` (+ e2e label fix `03a1ede`) |

### UI-4 Core loop: Home, Review, Mission complete (L)

Backend:
- [x] Plant-stage counts in `GET /srs/stats` (`e53f988`, U4-2) (`new`, `learning` = Learning + Relearning, `review`, `mastered`), in the learner's timezone like the existing stats
- [x] Interval preview per rating on each `DueCard` (`interval_preview: { AGAIN, HARD, GOOD, EASY }` as due timestamps), from `ts-fsrs` `repeat()` in `fsrs-scheduler.ts`, with unit tests next to `fsrs-scheduler.spec.ts` (`df9125e`, `238c10d`; returned as formatted intervals; preview-equals-rate test added in U4-1 `365a13c`)
- [x] Update `docs/architecture/dygo_academy_api_surface.md` and `types/srs.ts` in the same change

Frontend:
- [x] (U4-3 `4b701fd`, U4-4 `6e7eb53`) **A1 Today's Garden** on real data: greeting, streak, hero garden (thirsty / ripe / wilting counts), missions card, the primary "Continue" button, "ripens tomorrow"
- [x] (`c42b5b3`, previews `238c10d`/`365a13c`) **A2 Review** on `useStudySessionStore`, `POST /srs/rate` and offline `sync`: the new card, the 4-button rating bar with previews, the progress vine
- [x] (`c42b5b3`, mission `6e7eb53`; reminder switch hidden until UI-6) **A3 Mission complete**: session stats, week strip, the next mission, the reminder switch (wired in UI-6, hidden until then)
- [x] (`6e7eb53`, U4-4) **Missions v0** in the frontend, from existing data only: mission 1 "water the due words" is real. Missions 2 and 3 appear only when their data exists; otherwise the card shows one mission.
- [x] Beta: invite 3–5 users with `?ui=garden` (done 2026-10-02; beta week runs to 2026-10-09)

**Done when (G2):** beta users do real reviews in the garden for a week, and due counts, streaks and mastery match the classic screens for the same accounts.

### UI-4 finish (U4-1 … U4-5), added 2026-09-30

**Token budget rules (every U4 pass):** read only this section and the files listed for your step (grep/sed the parts you need; never read whole reports or this whole plan). No exploring beyond the listed files unless a check fails. One commit per pass, message `UI-4 U4-n: …`. Check the previous step's commit first (`GIT_OPTIONAL_LOCKS=0 git log --oneline -15 | grep "U4-"`); if it's missing, do that step instead and stop. §10 rules apply (stage exact paths, move stale git locks to `.git/stale-locks/`). Verify with the smallest set that proves the change: backend `tsc --noEmit` + the touched jest specs; frontend `tsc --noEmit` + `next lint` on touched files + the touched Vitest files. Don't run `next build` or Playwright (Dylan runs those on the Mac). Report in ≤ 8 lines in the session report under "UI-4 finish"; don't commit the report or this plan.

Found 2026-09-30 (review of `df9125e`): the rating previews can disagree with `rate()`: (1) `computeRatingIntervals` shows the EASY interval on a new card, but `gradeFlashcard` turns EASY on a new card into GOOD; (2) the preview's card state hard-codes `learningSteps: 0` (`srs.service.ts` ~L1090) while `rate()` reads `learning_steps` from the row.

| Step | What | Files (expected) | Status |
| --- | --- | --- | --- |
| **U4-1** | Previews match `rate()`: apply `gradeFlashcard(rating, isNewCard)` before scheduling each preview (so EASY on a new card previews the GOOD interval) and pass the row's real `learning_steps` (select it in the due-cards query if missing). New tests: for a New, Learning, Review and Relearning card, `computeRatingIntervals(card)[r]` equals `formatInterval(schedule(card, gradeFlashcard(r, isNew), now).card.dueAt)` for all four ratings. | `com.dygoacademy.backend/src/modules/srs/fsrs-scheduler.ts` (+ spec), `srs.service.ts` (+ spec) | ✅ `365a13c` |
| **U4-2** | `GET /srs/stats` gains `stage_counts: { new, learning, review, mastered }` inside `computeSrsSummary` (same query style and RLS as today). `new` = the learner's words with no `user_word_srs` row or `fsrs_state = 'New'` (same rule as A7's `stageFromSrs`: never studied → seed); `learning` = Learning + Relearning; `review` = Review with `mastered_at is null`; `mastered` = `mastered_at is not null`. Leeches stay counted in their stage (A7 rule). Update `docs/architecture/dygo_academy_api_surface.md` and frontend `src/types/srs.ts` in the same commit. Jest. | `srs.service.ts` (+ spec), `notification.processor.spec.ts` only if its mock breaks, API doc, `com.dygoacademy.frontend/src/types/srs.ts` | ✅ `e53f988` |
| **U4-3** | A1/A5 live: `HomeLive` builds the garden plants from `stage_counts` (replace the `sampleGarden` estimate; keep it as fallback when the field is missing), "Ripens tomorrow" from `GET /srs/activity/upcoming` (existing hook if there is one), streak on Welcome back = `current_streak_days`. Reference fixture pages unchanged. Vitest. | `components/garden/live/HomeLive.tsx`, `live/data.ts` (+ tests), a hook in `src/hooks/` only if none exists | ✅ `4b701fd` (A5 streak left null: freeze card, see report) |
| **U4-4** | Missions v0 (existing data only): mission 1 "Water today's thirsty words" on A1 (`missions`) and A3 (`DoneLive`), target = reviewed today + still due, progress = reviewed today (from `/srs/activity` today + `/srs/stats` `due_now`); done when nothing is due. Missions 2–3 not shown. New strings in `en-US`, `vi-VN`, `zh-CN` (glossary). Vitest. | `live/HomeLive.tsx`, `live/DoneLive.tsx`, `live/data.ts` (+ tests), `messages/*.json` | ✅ `6e7eb53` (+ `TodaysGardenScreen` `thirsty` kind) |
| **U4-5** | Wrap up: backend jest (srs) + frontend tsc/lint/vitest; add a Playwright spec `ui/tests/parity.spec.ts` (signed in; skips without `.env.e2e`) comparing due count, streak and mastered count between the classic home and `/garden`; tick the UI-4 checklist items that are done (G2 stays open); §1 UI-4 row; report; changelog line. | `com.dygoacademy.automationtesting/ui/tests/parity.spec.ts`, report, plan, master schedule (don't commit the last three) | ✅ `7300da9` (parity checks the `/srs/stats` each home loads + classic streak label; runs on one viewport) |

**After U4-5 (Dylan, G2):** apply the migrations from `20260926_*` onward, run `npx playwright test` on the Mac, pick 3–5 beta users (decision 4), send the `?ui=garden` link, compare numbers for a week.

**G2 status (2026-10-02):** setup done. `apply-migrations.sh --verify`: every migration through `20261001_retention` applied; production (www / api / supabase.dygoacademy.com via the Cloudflare tunnel) runs on the same Mac and the same `dygo_supabase_db`, so this covers the live site. Playwright on the Mac: 577 passed / 7 skipped (the parity spec runs on iPhone SE only, by design), parity ✓. The Q1–Q8 quiz baselines were written for the 7 viewports beyond iPhone SE (local only: `ui/tests/__screenshots__/` is gitignored). Beta users invited the same day. **Gotcha:** the signed-in tests need the `@dygo.test` account's `profiles.ui_locale` = `en-US`; a Vietnamese profile fails the navigation tests (tab bar name) and the gallery en-US screenshot. Open: compare due count, streak and mastered count classic vs garden for each beta account mid-week (~2026-10-07) and at the end (2026-10-09).

### UI-5 Topics and topic bed (M)

Backend:
- [x] `TopicSummary` gains `new_count`, `learning_count`, `review_count` and `due_count` next to `mastered_count` and `focus_word_count`. They're string bigints, the same as the existing counts. (`3a74b95`)
- [x] The topic's word list gains per-word `fsrs_state`, `mastered_at`, `is_leech` and `next_due_at` for the caller (U5-1 `6e86063`)

Frontend:
- [x] **A6 Topics** (beds): stage-mix bar, due badge, filter chips (All / IELTS Academic / Mine / Group). The locked seed pack is hidden until UI-6. (U5-2 `03a6962`; chips are All / IELTS Academic / Mine after NAV-1, no Group chip)
- [x] **A7 Topic bed**: stage tiles that filter the list, words sorted by next due, "Water N due" (a review scoped to this topic via `GET /topics/:id/cards/due`), Quiz, and Add word as a `BottomSheet` built from `AddWordModal`'s form logic (U5-3 `57b441c`, U5-4 `321cb6c`, limit fix `b467190`)
- [x] Quiz screens restyled with the garden components; the collocation quiz becomes mission 3 (U5-5 `d94f349`, U5-6 `5f016d7`; "collocation quiz becomes mission 3" moved to UI-6 missions)

**Done when:** everything the classic topics grid and topic detail can do, the garden can do.

### UI-5 finish (U5-1 … U5-7), added 2026-09-27

State on 2026-09-27: per-topic `new_count` / `learning_count` / `review_count` / `due_count` are already in `GET /topics` (committed in `3a74b95`); A6 chips are final after NAV-1 (All / IELTS Academic / Mine). What's left is below. Same rules as the RD and U3 passes: **one commit per pass, 75 minutes apart**, read only this section + §10 + the files for the step; check the previous step's commit first (`GIT_OPTIONAL_LOCKS=0 git log --oneline -25 | grep "U5-"`), and if it's missing do that step instead and stop. Commit message `UI-5 U5-n: …`. The A6/A7 fixture pages must keep passing `garden:diff --locale en,vi` (A6-topics, A7-topic-bed, A7-topic-bed-filter-sprouts).

| Step | What | Files (expected) |
| --- | --- | --- |
| **U5-1** | Backend: `GET /topics/:id` words gain the caller's `fsrs_state`, `mastered_at`, `is_leech`, `next_due_at` (null when never studied), through the same RLS-scoped `user_word_srs` join style as the counts; never another learner's rows. Jest + API doc row. | `topics.service.ts` (+ spec), `docs/architecture/dygo_academy_api_surface.md` | ✅ `6e86063`
| **U5-2** | A6 live: stage-mix bar, due badge and "all watered" from the counts; beds sorted by due words; loading/empty states from U3-1. | `live/TopicsLive.tsx`, `live/data.ts` (+ tests) | ✅ `03a6962`
| **U5-3** | A7 live: stage tiles with real counts that filter the list (`stageFromSrs`), words sorted by next due, "due now" / date labels via the i18n formatter, wilting rows for leeches. | `live/TopicBedLive.tsx`, `live/data.ts` (+ tests) | ✅ `57b441c`
| **U5-4** | A7 actions: "Water N due" = review scoped to this topic (existing `POST /srs/sessions` with the topic / `GET /topics/:id/cards/due`); **Add word** as a garden `BottomSheet` reusing `AddWordModal`'s form logic (don't edit the classic file: extract a hook in a garden-owned file); Options → classic page for now. | `live/TopicBedLive.tsx`, new `AddWordSheet.tsx`, messages | ✅ `321cb6c`
| **U5-5** | Quiz, part 1: `/garden/quiz?topic=…` question screen with garden components for every question type `QuizQuestion` supports, feedback states (right/wrong, no red ✕ shaming), hint, audio; on `POST /quiz/generate` + `/:id/answer` + `/:id/hint`. **No canvas artboard exists for the adult quiz**: follow design system §11 and the A2 card style; save 390×844 screenshots (en + vi) to a gitignored folder for Dylan's review. | `src/app/(garden)/garden/quiz/**`, `screens/QuizScreen.tsx`, messages | ✅ `d94f349`
| **U5-6** | Quiz, part 2: result screen (score, words that need water, "Back to bed"), A7 "Quiz" opens it, leech drill (`GET /quiz/leech-drill`) reachable from A7's wilting rows. Vitest. | same folder + `live/TopicBedLive.tsx` | ✅ `5f016d7`
| **U5-7** | Verify + wrap up: tsc/lint/vitest/`next build`, backend tsc/jest, `garden:diff --locale en,vi` A6/A7, Playwright (unsigned) if available; tick the UI-5 checklist; §1 UI-5 row; report; changelog line. Note: "collocation quiz becomes mission 3" moves to UI-6 (missions). | report, plan, master schedule (don't commit the last two) | ✅ `58ab14f`

### UI-6 Retention: missions, streak freezes, reminders, Me (L, mostly backend)

Backend (one migration in `database/schema/` + seed, following the post-squash baseline process in `database/README.md`):
- [x] `daily_missions`: learner, local date, mission type (`REVIEW_DUE` / `LEARN_NEW` / `QUIZ`), target, progress, `completed_at`. It's created on first read each local day, and progress is updated inside `rate()` and `QuizService.answer()` (the same transactions Phase 10 uses).
- [x] `GET /missions/today`, `GET /missions/week` (Golden Bloom = all 3 done in a day; weekly harvest = the count per day)
- [x] Streak freezes: `streak_freezes_available`, refilled weekly and used automatically on a missed day. The streak calculation in `computeSrsSummary` counts frozen days.
- [x] Keepsakes: a milestone table plus `GET /me/keepsakes`
- [x] Profile preferences `ui_locale`, `meaning_locale`, `english_variety` next to `profiles.timezone`, plus `PATCH /me/preferences`, **designed together with Phase 11 WS1** so its Settings needs are covered here (done: `ui_locale`/`meaning_locale` from UI-L, `english_variety` + `daily_goal_minutes` in U6-4, via `PATCH /profiles/me` rather than a new `/me/preferences`)
- [x] RLS for every new table, with assertions added to the RLS suite (64 today) — `rls_retention_test.sql` (37 assertions) wired into `apply-migrations.sh --test` (U6-8 `8f1ca2f`); **passed on the Mac 2026-10-02**

Frontend:
- [x] Missions card and A3 switch to `GET /missions/today`; the reminder switch is wired to the existing notification schedules
- [x] **A4 Weekly harvest**, **A5 Welcome back** (replaces A1's content after 2+ missed days) and **A8 Me** (calendar, keepsakes, settings: daily goal, reminder time, meaning language, UK/US English). The Family row stays hidden until Phase 11 WS2.

**Done when:** missions, Golden Bloom, freezes and reminders work end to end for beta users, and the RLS suite passes.

### UI-6 finish (U6-1 … U6-8), added 2026-10-01

**Token budget rules (every U6 pass):** same as "UI-4 finish": read only this section + the files listed for your step (grep/sed the parts you need), one commit per pass `UI-6 U6-n: …`, check the previous U6 commit first (`GIT_OPTIONAL_LOCKS=0 git log --oneline -20 | grep "U6-"`; if one is missing do the earliest missing step instead and stop), §10 rules, smallest checks that prove the change (backend `tsc` + touched jest; frontend `tsc` + `next lint` on touched files + touched Vitest; no `next build`/Playwright), ≤ 8-line report under "UI-6 finish" in `docs/reports/dygo_academy_session_report_2026-09-26.md` (create the heading if missing), don't commit the report or this plan; set your row's status to ✅ + hash.

**Decisions used (defaults, Dylan can change later):** missions per day = 3: `REVIEW_DUE` (target = due words at the day's first read, min 1; 0 due → mission done), `LEARN_NEW` (target 5 new words), `QUIZ` (target 1 finished quiz; the collocation challenge link). Golden Bloom = all 3 done that local day. Streak freezes (decision 7): 2 available, refilled to 2 every Monday in the learner's time zone, one used automatically per missed day while any are left (applied lazily when the streak is computed). Keepsakes: first harvest (first mastered word), streak 7/30/100 days, Golden Blooms 10/50. Existing screens already have the props (`MeScreen`, `WeeklyHarvestScreen`, `WelcomeBackScreen.streak`, `MissionCompleteScreen`, `TodaysGardenScreen.missions`); fixture/reference pages must not change.

| Step | What | Files (expected) | Status |
| --- | --- | --- | --- |
| **U6-1** | DB only: `database/migrations/20261001_retention.sql` — `daily_missions` (user_id, local_date, type, target, progress, completed_at; unique user+date+type), `streak_freeze_uses` (user_id, local_date unique), `user_keepsakes` (user_id, kind, value, earned_at; unique user+kind+value), `profiles.streak_freezes_available smallint default 2`, `profiles.freezes_refilled_on date`, `profiles.english_variety text check in ('en-US','en-GB') default 'en-US'`, `profiles.daily_goal_minutes smallint default 10`; RLS own-rows only (select/insert/update as fits); `database/tests/rls_retention_test.sql` with assertions (non-owner sees nothing, can't write others' rows). Style like `20260927_group_rain_days.sql`. | migration, RLS test | ✅ 247d92d |
| **U6-2** | Backend missions: `modules/missions` (service, controller, module): creates today's 3 rows on first read (learner's time zone as `computeSrsSummary`), `GET /missions/today` → `{ date, missions[], goldenBloom }`, `GET /missions/week` → 7 days `{ date, done, goldenBloom }`; progress bumped inside `rate()` (REVIEW_DUE on a graded review; LEARN_NEW when the card was new) and `QuizService.answer()` completion (QUIZ), in the same transaction. Jest; API doc rows. | `modules/missions/**`, `srs.service.ts`, `quiz.service.ts`, `app.module.ts`, API doc | ✅ bc9c73d |
| **U6-3** | Backend freezes: lazy weekly refill + auto-use in the streak calculation (`computeSrsSummary` counts a frozen day as kept); `GET /srs/stats` gains `freezes: { available, used_this_week, refills_on }` and `best_streak_days`. Jest (missed day with/without freeze, Monday refill, time zone). API doc + frontend `types/srs.ts`. | `srs.service.ts` (+ spec), API doc, `types/srs.ts` | ✅ 828a74b |
| **U6-4** | Backend keepsakes + prefs: `GET /me/keepsakes` (awards lazily from stats/missions, returns earned + next), `PATCH /profiles/me` accepts `english_variety` and `daily_goal_minutes` (validated); `GET /me` (or the existing profile read) returns them. Jest; API doc. | `modules/profiles/**` (+ spec), API doc | ✅ a66e3bb |
| **U6-5** | Frontend missions: hooks for `/missions/today` + `/missions/week`; A1 missions card and A3 use them (replace U4-4's v0; fall back to v0 if the call fails); Golden Bloom state; QUIZ row links to the collocation quiz (`/garden/quiz?…` of the most-due topic). Strings in en-US/vi-VN/zh-CN. Vitest. | `src/hooks/`, `live/HomeLive.tsx`, `live/DoneLive.tsx`, `live/data.ts`, messages | ✅ 68e08e8 |
| **U6-6** | Frontend A4 + A5: `HarvestLive` harvest (missions per day, Golden Blooms), goal and freezes from `/missions/week` + stats; A5 freeze card (`WelcomeBackScreen.streak`) from `freezes`. Vitest. | `live/HarvestLive.tsx`, `live/HomeLive.tsx`, `live/data.ts` | ✅ d1e24ce |
| **U6-7** | Frontend A8 Me: best streak, Golden Blooms, calendar (missions per day), keepsakes, daily goal row → a small sheet (minutes), UK/US English in the existing Language sheet (saves `english_variety`). Family row stays hidden. Vitest. | `live/MeLive.tsx`, Language/Goal sheet files, messages | ✅ 1a4a770 |
| **U6-7b** | Frontend A3 reminder switch (added 2026-10-02: in the UI-6 checklist but in no step): `DoneLive` passes `reminder` instead of `null` — `ripening` = tomorrow's count from `useUpcomingActivity`, `time` / `on` from the learner's earliest schedule (`useNotificationSchedules`, same pick as `MeLive`); `onReminderChange` reuses `MeLive`'s logic (`useUpsertSchedule` / `useDeleteSchedule`, Web Push permission + subscribe when turning on). No schedule yet → switch off, turning it on creates one at the default time. Hidden only when push isn't supported. Vitest. | `live/DoneLive.tsx`, `live/data.ts` (+ tests), a shared hook only if `MeLive`'s logic must move | ✅ c96515a |
| **U6-8** | Wrap-up: backend jest (missions, srs, profiles, quiz) + frontend tsc/lint/Vitest; tick the UI-6 checklist items that are done; §1 UI-6 row; Status line; report; changelog line. Add `rls_retention_test.sql` to `apply-migrations.sh --test` (only if that file has no one else's uncommitted edits; otherwise leave a note). Note for Dylan: `20261001_retention.sql` is already applied (2026-10-02); run the RLS suite with `rls_retention_test.sql`, Playwright on the Mac, `garden:diff` A1/A3/A4/A5/A8 (en+vi). | report, plan, master schedule (don't commit) | ✅ 8f1ca2f (2026-10-02) |
| **U6-9** | Catch-up (only if something is missing): do the earliest missing U6 step; if all are ✅, reply "UI-6 complete" and stop without changes. | — | ⏳ |

### UI-L Languages: English, Simplified Chinese, Vietnamese (M)

**Why now.** Learners come from the US, Singapore, China and Vietnam (§2). Dylan asked (2026-09-26) for the app to ship in **English, 简体中文 and Tiếng Việt**, and for the rebuild to use **English and Vietnamese as the worked examples**: both have approved canvas pages, so both are pixel-checked. Chinese follows the same keys and layout. This takes the language work out of UI-7 and does it before the remaining screens and Groups, so every new screen is born translated.

**References.** `docs/design/garden/reference/<name>.png` (English) and `<name>-vi.png` (Vietnamese) for A1–A8 and GR1–GR7, from the canvas pages *Adult*, *Adult · Tiếng Việt*, *Adult · Groups* and *Adult · Groups · Tiếng Việt*. The Vietnamese copy in the `-vi` references is the approved translation.

**Locales and formats**

| App language | Code | Messages | Formatting locale | Clock | Week starts | Font stack (body) |
| --- | --- | --- | --- | --- | --- | --- |
| English | `en-US` | `messages/en-US.json` (the source; typed keys) | `en-US` ("Friday, September 25") | 12-hour | **Sunday** | DM Sans |
| 简体中文 | `zh-CN` | `messages/zh-CN.json` | `zh-CN` ("9月25日 星期五") | 24-hour | Monday | DM Sans for Latin, then `PingFang SC`, `Noto Sans SC`, `Microsoft YaHei` (system, no web font) |
| Tiếng Việt | `vi-VN` | `messages/vi-VN.json` | `vi-VN` ("Thứ Sáu, 25 tháng 9", "1.200") | 24-hour | Monday | DM Sans + Be Vietnam Pro per glyph (already built) |

Headings use Fraunces; for `zh-CN` the heading stack falls back to the same system CJK fonts (Fraunces has no Chinese). **Locale codes are full BCP 47 tags (2026-09-26):** `en-US`, `vi-VN`, `zh-CN` everywhere: file names, `profiles.ui_locale` / `meaning_locale`, the `dygo_locale` cookie, `?locale=` and `PATCH /profiles/me`. English is `en-US`, regardless of time zone. The old short codes are still read (cookie, profile) so nobody loses their setting.

**Which language is used.** 1) `profiles.ui_locale`, 2) the `dygo_locale` cookie (set by the language sheet before sign-in and on first visit), 3) the browser's `Accept-Language` (`zh*` → `zh-CN`, `vi*` → `vi-VN`, any `en*` → `en-US`), 4) English (`en-US`). Only the `(garden)` layout reads it; classic screens stay English and unchanged (rule 3). No locale segment in the URL.

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
- [x] **Locale plumbing:** `src/i18n/request.ts` resolves the locale as above; `src/i18n/config.ts` lists `['en-US', 'vi-VN', 'zh-CN']` (the code is also the formatting locale); `<html lang>` inside the garden (`[data-ui="garden"]` wrapper gets `lang`), `NextIntlClientProvider` with `timeZone` from the profile. Server actions or a route handler set the `dygo_locale` cookie.
- [x] **Every string through `t()`**, including aria-labels, sheet titles, toasts and empty states. Dates, times, numbers, plurals and weekday initials through next-intl's `useFormatter` / ICU (`{count, plural, …}`), never concatenated. Weekday strips (A3, A4, A8 calendar) start on the locale's first day.
- [x] **`messages/vi-VN.json`** with exactly the `-vi` reference copy; **`messages/zh-CN.json`** from the glossary (mark the file header "draft, needs native review"). Key parity test: every key in `en.json` exists in the other two with the same ICU arguments.
- [x] **Per-language layout exceptions** that the Vietnamese canvas made: topic chips and the A4 day label are `white-space: nowrap`. Apply them for all languages (no effect in English).
- [x] **Fixture pages take `?locale=en-US|vi-VN|zh-CN`** (old `en` / `vi` still accepted) (fixture data per locale in `fixtures.ts`: e.g. Vietnamese topic names, "Công việc", `T2…CN`, the Vietnamese-first review card). `garden:diff` gains `--locale` and diffs `<name>-vi` against `?locale=vi`; the report lists English and Vietnamese side by side.
- [x] **Chinese check without a canvas:** screenshots of every fixture page in `zh-CN` at the 8 viewports; nothing clipped, no new wrapping versus English, CJK glyphs from the system font (no tofu).
- [x] **Backend (allowed in this step):** `profiles.ui_locale text` and `profiles.meaning_locale text` (nullable, checked against the three codes / none), migration + RLS unchanged (own row only). There is no profile-update endpoint today: first check how `profiles.timezone` is written; if nothing writes it through the API, add `PATCH /api/v1/profiles/me` (own row, validated codes, tests). API surface doc updated in the same commit. This is the WS1 preference work shared with Phase 11.
- [x] **Language sheet** on A8 wired to the profile (optimistic, then refetch); changing the app language re-renders the garden without a full reload.
- [x] Lint: `react/jsx-no-literals` (or an equivalent check) on `src/components/garden/**` and `src/app/(garden)/**`, so a raw English string fails CI.

**Status (2026-09-26, UI-L pass):** every step above is built and committed (`33466be` → `4d6f4eb`). The 11 A-screens: Vietnamese 0.000–0.088% (A5's 0.088% is one letter, ICU's "Chủ Nhật" vs the canvas's "Chủ nhật"), English unchanged (A7 0.738%: the English references predate Be Vietnam Pro; decided). The 7 GR references are diffed when UI-G builds those screens. The font chain now follows the canvas renderer's order (see the README). Open: apply the migration, a native review of `zh-CN.json`, the language switch signed in on a real device. Report: `docs/reports/dygo_academy_session_report_2026-09-26.md`, "UI-L pass".

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

**Status (2026-09-26, UI-G pass):** every step above is built and committed (`d9ab4d8` → `92e86bb`). Pixel diff: all 7 GR screens 0.000–0.013% in English and 0.000–0.001% in Vietnamese; A1–A8 unchanged. Backend: `database/migrations/20260926_group_garden.sql` (four SECURITY DEFINER aggregate functions) with `GET /groups/garden-counts`, `GET /groups/:id/garden`, `GET /groups/:id/tricky-patches`, `GET /invites/:token/preview`; `database/tests/rls_group_garden_test.sql` (30 assertions) passes, and so does the main suite with the migration applied. Invite links are the classic `/join/<token>`; the middleware sends flagged users to `/garden/join/<token>`. Open: apply the migration and add the new test file to `apply-migrations.sh --test` (that script has other uncommitted edits); rain days aren't stored (no table), so the GR1/GR2 rain-day banners and GR3's "Last rain day" stay hidden on live data; signed-in flows not verified on a real device. Report: `docs/reports/dygo_academy_session_report_2026-09-26.md`, "UI-G pass".

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
| **RD-2** | Backend: sprint endpoint stores the rain day; `GET /groups/:id/rain-day`; `DELETE /groups/:id/rain-day`; jest; API doc row(s) | `notifications.service.ts`, `trigger-sprint.dto.ts`, `groups.controller.ts`, a `rain-day.service.ts` (+ spec), `docs/architecture/dygo_academy_api_surface.md` | ✅ `cb1fcc9`
| **RD-3** | Backend: `rainDay` on each group in `GET /groups/garden-counts` (GR1); jest | `group-garden.service.ts` (+ spec), API doc | ✅ `39d855b`
| **RD-4** | Frontend: types + hooks, GR1/GR2/GR3 rain-day blocks shown on live data, "Start rain day" sends `wordsPerGardener` and handles 409, "Water" opens the shared bed with the most due words; Vitest | `src/components/garden/live/*Group*`, `src/hooks/`, `src/types/`, messages only if a string is missing (all three files) | ✅ `97ad9c1`
| **RD-5** | Verify + report: tsc, lint, vitest, jest, `next build` in the mirror, GR pixel diffs unchanged (en + vi); session report section; §1 + this checklist; changelog line | report, plan (don't commit), master schedule (don't commit) | ✅ done in U3-0 `08b4f33`: tsc/lint/vitest/jest/`next build` pass, GR1–GR7 ≤ 0.013% en + vi

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
| `f00dc6e` | `NAV-1: …` code, messages, Vitest, and the NAV-1 section of `docs/reports/dygo_academy_session_report_2026-09-26.md` |

How it's built (read these if you touch it):
- **5 tabs on the reference pages:** `ReferenceScreen.tsx` wraps every non-GR reference in `<GroupsTabProvider value>`, so the sample learner is "in a group". Live pages are unchanged: `GroupsTabLive` still decides from `GET /groups`.
- **No Group chip:** `topicFilters()` in `live/data.ts` no longer returns a `group` chip; `TopicsScreen` lost the `groupsHref` prop and its "Open shared gardens" link; `TopicsLive` no longer passes them. The generic chip filter in `TopicsScreen` is unchanged, so shared beds (`group: 'group'`) appear under All.
- **A4 card:** `WeeklyHarvestScreen`'s `group` prop now carries `href?` and `sharedWords` (was `plotWords`; the `groupHref` prop is gone); `group: null` renders **no card**. `HarvestLive` takes the learner's **first** group from `GET /groups` and its totals from `GET /groups/:id/garden` (`watered_today`, `member_count`, `word_count` = shared words); no group, or not loaded yet / error → no card.
- **Messages** (all three files: `en-US`, `vi-VN`, `zh-CN` — the older `en.json` / `vi.json` names in §10 rule 10 now mean these): `screens.harvest.groupBody` rewritten; `screens.topics.group`, `screens.topics.openGroups`, `screens.harvest.groupName`, `screens.harvest.openGroups` removed.
- **Tests:** `data.test.ts` (no Group chip), `screens.test.tsx` (A4 card links to its garden; no card without a group). Vitest 21 files / 216 tests pass; `tsc` (app + test config) and `next lint` clean.

**Open (for the next developer):**
- [x] **Pixel diff** (done in U3-0 `08b4f33`: A1 0.000/0.000, A4 0.000/0.000, A5 0.000/0.088, A6 0.000/0.000, A8 0.050/0.000 % en/vi) on the Mac (couldn't run in the sandbox: no Chromium, too little disk for Next's compiler): `npm run dev`, then `npm run garden:diff -- --base http://localhost:3000 --cookie dygo_ui=garden --locale en-US,vi-VN --only A1-todays-garden,A4-weekly-harvest,A5-welcome-back,A6-topics,A8-me`. Each must be ≤ 0.5% (anti-aliasing only); A7 and the GR screens should be unchanged. If A4 is over, check the card is a `<Link>` with the same box as before (class `GROUP_CARD`). Never edit the references. Record the numbers in the session report and in §1.
- [ ] **Signed-in check** (`?ui=garden`): a learner in a group sees 5 tabs on every garden tab, and the A4 card opens *their* group's garden with the right counts; a learner in no group sees 4 tabs and no A4 group card; the A6 chips are All / collections / Mine only.
- [ ] Native review of the new zh-CN `groupBody` (decision 8).

**Known limits (by design, not bugs):** the live A4 card has **no initials row** (the group endpoints return aggregates only, decision 10); a learner in several groups sees the **first** one from `GET /groups` (no picker); `/garden/missions` makes one extra request (`GET /groups/:id/garden`). Classic screens are untouched.

**Sandbox notes for the next automated pass:** the device VM has ~700 MB free. A scratch mirror outside the repo worked with `npm ci --ignore-scripts --omit=optional` plus the arm64 bindings `@rolldown/binding-linux-arm64-gnu`, `lightningcss-linux-arm64-gnu`, `@unrs/resolver-binding-linux-arm64-gnu` (`npm install --no-save`); delete the mirror afterwards. Commits leave `.git/HEAD.lock` / `index.lock` behind: move them into `.git/stale-locks/`.

### UI-A Sign in and create account (A-1 … A-5), added 2026-09-29

**Why.** The classic `(auth)` login and register pages are plain forms; UI-7 only said "restyled". Dylan asked for garden screens, so they're now designed in the canvas (page **"Adult · Sign in"**, English + Vietnamese) and get built like every other screen: match the references, ≤ 0.5% pixel diff in both languages.

**Screens (references in `docs/design/garden/reference/`, each also `-vi`):**

| # | Screen | Reference(s) | Route |
| --- | --- | --- | --- |
| AU1 | Sign in: garden hero, email, password with Show/Hide, "Forgot password?", error banner | `AU1-sign-in`, `AU1-sign-in-error` | `/login` (garden look when the flag or cookie is on) |
| AU2 | Create account: name, email, password (min 6), Terms/Privacy line | `AU2-create-account` | `/register` |
| AU3 | Create account from a group invite: "Minh invited you to …" banner, "Create account and join" | `AU3-create-account-invite` | `/register?next=/join/<token>` (uses the GR6 invite preview) |
| AU4 | Reset password: email → "Check your inbox"; plus a set-new-password page in the same style | `AU4-reset-password`, `AU4-reset-password-sent` | `/forgot-password`, `/reset-password` |

**Rules.**
- Same logic as today: Supabase `signInWithPassword` / `signUp`, the `next` redirect after sign-in/up (invite links), no Google or other third-party sign-in (blocked in mainland China, design system §14.6).
- **Language chip** (top right) on every auth screen sets the `dygo_locale` cookie before sign-in (UI-L resolution order); after sign-up the choice is saved to `profiles.ui_locale`.
- **New:** "Your name" on sign-up → `profiles.display_name` (check the column/trigger first; no new column if one exists). Forgot password → `resetPasswordForEmail` with a redirect to `/reset-password`, which calls `updateUser({ password })`.
- Error copy never says which of email or password was wrong. Password field has Show/Hide and `autocomplete` set (`current-password` / `new-password`).
- The classic look stays for users without the garden flag until UI-8 (rule 3); only the garden look changes.
- Terms and Privacy links: placeholders until Dylan provides URLs (decision 12).

**Passes** (same rules as the RD/U3/U5 passes: one commit each, 75 minutes apart, read only this section + §10 + the step's files; check the previous `A-n` commit first; commit message `UI-A A-n: …`):

| Step | What | Files (expected) |
| --- | --- | --- |
| **A-1** | Commit the AU design files on their own (`docs/design/garden/reference/AU*`, `source/Adult{Login,Register,RegisterInvite,Forgot}{,Vi}.dc.html`), add the 12 AU jobs to `tools/render.js`, add AU rows to the README. | `docs/design/garden/**` | ✅ `8be6590`
| **A-2** | Garden auth shell + AU1 Sign in (garden look behind the flag, same Supabase logic), language chip, error state; fixture pages `/garden/_reference/AU1-*` (en/vi); pixel diff. | `src/app/(auth)/**` (garden branch only), `src/components/garden/auth/**`, messages | ✅ `a1b8332`
| **A-3** | AU2 + AU3 Create account (name → profile, `next` redirect, invite banner from the GR6 invite preview); fixtures + diff. | same | ✅ `38665d9`
| **A-4** | AU4 Forgot password + `/reset-password` set-new-password page; fixtures + diff. | same | ✅ `7a5e342`
| **A-5** | Verify + wrap up: tsc/lint/vitest/`next build`, `garden:diff --locale en,vi` for all AU references, Playwright unsigned run of the auth pages; report; §1 row; changelog line. | report, plan, master schedule (don't commit the last two) | ✅ `f98a832`

### UI-7 iPad, languages, auth screens, accessibility (M)

- [ ] iPad layouts from design system §10: rail at 600px+, sidebar and master–detail at 1024px+, two-pane review in landscape, keyboard shortcuts (Space, 1–4, P, Esc)
- [ ] Languages moved to **UI-L** (2026-09-26). What's left here: a native-speaker review of `zh-CN.json` and `vi-VN.json` before release.
- [ ] Meaning-language line on cards (needs `word_translations` content per language; start with the launch market's language) and the UK/US choice for IPA and audio (`ipa_us` / `ipa_uk` already exist on `DueCard`)
- [x] Login and register moved to **UI-A** (designed 2026-09-29). ~~Still here: the `/search` guest landing restyled, with its logic kept~~ Dropped 2026-10-03: `/search` was removed (`d666c75`) and redirects to the public home page at `/` (Home page v2, HP-1 … HP-11).
- [ ] Full accessibility pass (design system §15) and the reduced-motion check

**Done when (G3):** every garden screen passes the checks in §6 at all 8 viewports and in `en-US`, `zh-CN` and `vi-VN`.

### UI-7 finish (U7-1 … U7-7), added 2026-10-02

**Token budget rules (every U7 pass):** same as "UI-6 finish": read only this section + the files listed for your step, one commit per pass `UI-7 U7-n: …`, check the previous U7 commit first (`GIT_OPTIONAL_LOCKS=0 git log --oneline -20 | grep "U7-"`; if one is missing do the earliest missing step instead and stop; **U7-5 is dropped and will never have a commit, so U7-6 checks for U7-4**), §10 rules, smallest checks that prove the change (frontend `tsc` + `next lint` on touched files + touched Vitest; no `next build`/Playwright), ≤ 8-line report under "UI-7 finish" in the day's session report, don't commit the report or this plan; set your row's status to ✅ + hash.

**Breakpoint names (since UI-8 U8-4):** `md` = 600px (was `medium`), `lg` = 1024px (was `expanded`), `tablet` = 768px (the old `md`). Use these names.

**Already in the code (check, don't rebuild):** `GardenRail` + `GardenSidebar` + `ipadNav.test.tsx` (rail at `md`, sidebar at `lg`), **switched off**: they show only when `NEXT_PUBLIC_GARDEN_IPAD_NAV=true`, which is not set in `env-profiles/prod.env` (see `isGardenIpadNavOn` in `constants/garden.ts`), `RatingBar` keyboard handler, the meaning-language line in `ReviewCard`/`ReviewLive` (`word_translations`, `profiles.meaning_locale`), `english_variety` in the Language sheet (U6-7). U7-1 records what's left; later steps only fill gaps.

**Target dates** (Dylan, 2026-10-03: pulled forward to today and tomorrow, scheduled tasks `dygo-ui7-u7-*`, SGT): U7-1 Sat 10-03 18:00 · U7-2 19:15 · U7-3 20:30 · U7-4 Sun 10-04 09:00 · ~~U7-5~~ dropped · U7-6 10:15 · U7-7 11:30 · **G3 Thu 10-15** (Dylan's checks; can move earlier).

**U7-1 has no commit** (audit only): later passes treat its row's ✅ in this table as done instead of looking for a `U7-1` commit.

| Step | What | Files (expected) | Status |
| --- | --- | --- | --- |
| **U7-1** | Audit only (no code): for each UI-7 checklist item and design system §10/§15, list what exists and what's missing (rail/sidebar/master–detail per breakpoint, shortcuts Space/1–4/P/Esc, meaning line, UK/US IPA + audio, a11y items, and whether the iPad nav flag is on). Write the gap list into this table's later rows (adjust "What"); report. | this plan (not committed) | ✅ audit 2026-10-03 (exists: rail at `md`/sidebar at `lg` in `GardenTabBar` + `ipadNav.test`, flag **off** (not in `prod.env`); `RatingBar` keys 1–4 only; meaning line with `lang` in Review + Topic bed; `english_variety` saved but unused; `BottomSheet` Esc via dialog; focus ring, `ProgressVine` progressbar, reduced-motion for drip/bloom/rise/rain, `lang` on the garden wrapper. Gaps → U7-2/3/4/6 below) |
| **U7-2** | iPad layout gaps (U7-1: no screen has any `lg:` class and only Quiz/Today/Welcome back have a few `md:`; the page shell `GardenTabBar` caps width at `max-w-[560px]`, so it must widen at `md`/`lg` when the rail/sidebar show). Per design system §10: Today hero 5/8 + missions 3/8 at `md`, full-width hero + 6/12 rows at `lg`; Review card centred max 560 at `md`, two panes 5/12 + 7/12 at `lg` with the rating bar spanning both; Topics 2-column grid at `md`, master–detail at `lg` (Topics → bed, Groups → garden); Topic bed 2-column word list at `md`; Me 2 columns; Weekly harvest 2/3 columns; Mission complete/Welcome back centred columns. Phone layouts and reference pages unchanged. Vitest. Then turn the iPad nav on: add `NEXT_PUBLIC_GARDEN_IPAD_NAV=true` to `env-profiles/prod.env` (gitignored, no commit). It's a `NEXT_PUBLIC_*` value, baked in at build time, so it only shows after Dylan deploys (`deploy/request.md`). | `GardenRail.tsx`, `GardenSidebar.tsx`, garden layout, `screens/*` touched, `env-profiles/prod.env` | ✅ `ccac6d4` (10-03; `ipad:`/`ipad-lg:` variants under `data-garden-ipad`, so flag off = unchanged; sidebar lists beds / shared gardens at `lg`; flag added to `prod.env`, **waiting for Dylan to deploy**; not done: 260px landscape hero, 26-week calendar, bed table) |
| **U7-3** | Keyboard (U7-1: only 1–4 exist, in `RatingBar`'s own window listener with `isTypingTarget`; sheets already close on Esc through the dialog): add Space (show answer), P (play audio), Esc (leave review when no sheet is open), only when focus isn't in a text field; move 1–4 into the one shared hook, keep `aria-keyshortcuts` + the key hints. Vitest. | `RatingBar.tsx`, `ReviewLive.tsx`, a `useGardenShortcuts` hook | ✅ `51b6180` (10-03; shortcuts live in `ReviewScreen` (owns Show answer, audio, Close), `ReviewLive` unchanged; hook also skips open dialogs and Space on a focused button; P clicks the card's audio button, no `aria-keyshortcuts` on it yet (AudioButton untouched)) |
| **U7-4** | UK/US (U7-1: `ReviewLive` hard-codes `ipa_us ?? ipa_uk`; `english_variety` is saved by the Language sheet but nothing reads it). `ipa_uk`/`ipa_us` follow `english_variety` (fall back to the other one) on the review card, topic bed and quiz. **Audio: there's only one `audio_url`** (no UK/US clip in `DueCard`, `word.ts` or the DB), so audio stays as is; note it for Dylan as a backend follow-up, no schema change here. Vitest. | `ReviewCard.tsx`, `AudioButton.tsx`, `live/data.ts` | ⏳ |
| **U7-5** | ~~`/search` guest landing restyled in garden style~~ **Dropped 2026-10-03**: `/search` was removed (`d666c75`) and redirects to `/`, the Home page v2 (HP-1 … HP-11, all 10 boards pass `garden:diff`). Nothing to do; U7-6 can follow U7-4 directly. | — | ➖ dropped |
| **U7-6** | Accessibility + reduced motion (design system §15). U7-1 found already done: garden `:focus-visible` ring, `ProgressVine` progressbar + value text, reduced-motion for the drip/bloom/rise/rain classes and motion tokens, `lang` on the garden wrapper and on meanings, no `onClick` on `div`/`span`/`li`. To check/fix: ~28 Tailwind `transition`/`animate-` uses in `components/garden` without `motion-reduce:`; `<svg>`s in `HeroGardenCard`/`groupArt`/`icons`/`Spinner`/`PlantGlyph` have `aria-hidden` or a label; root `<html lang="en">` is fixed (garden wrapper sets the real language, fine unless VoiceOver needs it on `<html>`); review card reading order (word → IPA → meaning → example → collocations → ratings); icon-only button labels; 200% text. Fix what fails. Vitest where testable. | touched garden components | ⏳ |
| **U7-7** | Wrap-up: frontend tsc/lint/Vitest; tick the UI-7 checklist; §1 row; Status; report; changelog. Note for Dylan (G3): native-speaker review of `vi-VN.json` + `zh-CN.json`, `npx playwright test` (all 8 viewports), `garden:diff` all references en+vi, VoiceOver + real iPhone/iPad, `next build`. | report, plan, master schedule (don't commit) | ⏳ |

### UI-8 Switch over and delete the classic adult UI (S)

- [x] Set `NEXT_PUBLIC_GARDEN_UI=true` in production; `?ui=classic` stays for one week
- [x] Classic group pages (`groups/**`, `components/groups/*`, `join/[token]`) deleted with the rest once UI-G is live; only the tenant director rollup is restyled
- [x] After a stable week, **in one commit that's easy to revert**: delete every "Remove" row of the inventory in `docs/plans/archive/ui rebuild implementation plan.md`, the classic tokens, `Navbar`/`PublicNavbar`, `CONTENT_WIDTH` and the flag
- [x] Rename: drop the `garden-` Tailwind prefix, `medium`/`expanded` → `md`/`lg`, `GARDEN_CONTENT_WIDTH` → `CONTENT_WIDTH`, move the `/garden` paths to their final URLs (see §8, decision 1)
- [x] Update the frontend architecture doc (§3, §4, §16, §17), `routes.ts`, the API surface doc, the UAT checklist and the README

**Done when:** a search of `src/` finds none of the removed component or token names, the build and tests are green, and the escape hatch is gone.

### UI-8 finish (U8-1 … U8-6), added 2026-10-02

**Changed 2026-10-02 (Dylan): "middle" plan.** Switch everyone **today** (U8-1 + U8-2, 2026-10-02) with `?ui=classic` and the classic code kept; the delete half (U8-3 … U8-6) runs in one day **after G3** (target Fri 10-16), only if Dylan has confirmed no open garden bugs. G2's beta week and UI-7 continue while everyone is on the garden. **Decision 1 = new short URLs** (2026-10-02): `/garden` stays the home; `/garden/review` → `/review`, `/garden/topics/**` → `/topics/**`, `/garden/missions` → `/missions`, `/garden/me` → `/me`, `/garden/groups/**` → `/groups/**`, `/garden/quiz` → `/quiz`, `/garden/join/**` → `/join/**`; old classic paths redirect too (`/study` → `/review`, `/` signed-in → `/garden`).

**Token budget rules (every U8 pass):** same as "UI-7 finish", commits `UI-8 U8-n: …`, check `grep "U8-"`. U8-2 changes production config and U8-3 deletes code: an automated pass prepares them but **only Dylan deploys** (`deploy/request.md`), and U8-3 starts only when the §1 UI-7 row says G3 passed **and** this section has Dylan's line "Stable: no open garden bugs (date)".

**Target dates (scheduled tasks):** U8-1 **Fri 10-02 15:00 UTC** · U8-2 **Fri 10-02 16:15 UTC** (Dylan deploys after) · UI-7 + G3 10-05 → 10-15 · U8-3 **Fri 10-16 01:00 UTC** · U8-4 02:15 · U8-5 03:30 · U8-6 04:45 UTC · Dylan's final checks Fri 10-16. If G3 or Dylan's "no open garden bugs" note is missing when U8-3 fires, the pass stops and notifies.

| Step | What | Files (expected) | Status |
| --- | --- | --- | --- |
| **U8-1** | Prep: restyle the tenant director rollup (the only classic group page kept); check every "Remove" row in `docs/plans/archive/ui rebuild implementation plan.md` has a garden replacement (list any gap and stop if one is missing). Vitest. | director rollup page, the inventory | ✅ `bc999be` (inventory OK; rollup restyle dropped by Dylan 10-02, no classic tenant rollup page exists) |
| **U8-2** | Switch: `NEXT_PUBLIC_GARDEN_UI=true` in `env-profiles/prod.env`, `?ui=classic` still works for a week. Dylan deploys, then runs the parity spec + Playwright on UAT and a real iPhone/iPad. Rollback: unset the flag and redeploy. | `env-profiles/prod.env` | ✅ 10-02, not committed (`prod.env` is gitignored); **waiting for Dylan to deploy** |
| **U8-3** | Delete, **one revertable commit**: every "Remove" row, classic tokens, `Navbar`/`PublicNavbar`, `CONTENT_WIDTH`, classic group pages (`groups/**`, `components/groups/*`, `join/[token]`), the flag and `?ui=classic`. tsc/lint/Vitest green; `grep -r` of the removed names in `src/` empty. | the inventory's files | ✅ `62bb379` (10-02, run early at Dylan's request before G3 / the "Stable" line; `?ui=classic` removed first in `69c00c9`; not deployed) |
| **U8-4** | Renames: drop the `garden-` Tailwind prefix, `medium`/`expanded` → `md`/`lg`, `GARDEN_CONTENT_WIDTH` → `CONTENT_WIDTH`; no visual change. Dylan: `garden:diff` on **every** reference en+vi must match the pre-rename numbers. | `tailwind.config.*`, all garden files | ✅ `cb6026a` (10-02; CSS before/after identical; old 768px `md:` → `tablet:`; Dylan still to run `garden:diff` en+vi) |
| **U8-5** | Final URLs per decision 1 (new short URLs, mapping above), with permanent redirects from `/garden/<x>` and the old classic paths; `routes.ts`, middleware, Playwright paths. Vitest. | `routes.ts`, `middleware.ts`, app routes, `ui/tests/*` | ✅ `9a95ce7` (10-02; 308 redirects in middleware before the auth check; signed-in `/` → `/garden` stays 307) |
| **U8-6** | Wrap-up: frontend architecture doc §3, §4, §16, §17, API surface doc, UAT checklist, README; tick the UI-8 checklist; §1 row; Status; report; changelog. Note for Dylan: `next build` on the Mac, full Playwright, real iPhone/iPad → **Phase 12 done**. | docs, report, plan, master schedule (don't commit) | ✅ `bac901a` (10-02; tsc app/test/backend, lint, Vitest 363/363 green, no fixes; docs updated; Dylan: deploy, `next build`, Playwright, `garden:diff` en+vi, iPhone/iPad) |

### UI-5 quiz design (QZ-1 … QZ-4), added 2026-10-01

**Why.** U5-5/U5-6 built the quiz without a canvas artboard. Dylan asked for the quiz and its results to be designed; the canvas page **"Adult · Quiz"** (version `1790854428-1878`, approved 2026-10-01) is now the reference, committed in `425eabe`. Build it like every other screen: match the references, ≤ 0.5% pixel diff in English and Vietnamese. Nothing classic users see may change.

**References** (`docs/design/garden/reference/`, each also `-vi`; sources `docs/design/garden/source/AdultQuiz*.dc.html`; `tools/render.js` has the jobs):

| # | Reference | State |
| --- | --- | --- |
| Q1 | `Q1-quiz-choose` | CONTEXTUAL_CHOICE, 3/10, nothing picked |
| Q2 | `Q2-quiz-right` | MATCHING, 4/10, right pick + "Mastered" note |
| Q3 | `Q3-quiz-not-quite` | CONTEXTUAL_CHOICE, wrong pick ("Your pick", gold) |
| Q4 | `Q4-quiz-cloze-hint` | CLOZE, 5/10, hint open, "sustainab" typed |
| Q5 | `Q5-quiz-listen` | DICTATION, 10/10, empty field, Check dimmed |
| Q6 | `Q6-quiz-result` | 7 of 10, 3 missed, Drill + Back to bed |
| Q7 | `Q7-quiz-result-perfect` | 10 of 10, bloom art, no missed card, no Drill |
| Q8 | `Q8-quiz-drill-done` | drill result 4 of 5, 1 missed, no Drill button |

**What changes compared with U5-5/U5-6** (read the reference `.html` for exact sizes/colours; tokens: forest `#24463A`, good wash `#DDE7DA`, gold-soft `#FBF4E4` / border `#EFD9A6` / text `#6B5215`, gold `#E0B04A`, water-soft `#E3F0F8` / text `#1D4A68`):
- **Sentence prompts (CLOZE, CONTEXTUAL_CHOICE):** strip the task prefix as today, then split the masked sentence on `_____` (backend `quiz-generator.ts` uses five underscores) and render it in Fraunces 22/500, line-height 1.45, with the gap as an inline pill (min-width 88, radius 10, 2px bottom line). Empty before answering (`#F4F1EA`, line `#5E6A62`); after answering it shows the answer, green (`#DDE7DA`, line `#3E7F5A`, text forest) if right, gold if wrong. No quote marks.
- **MATCHING:** parse `Which word is a (synonym|antonym) of "X"?` → show the question in the app language (`screens.quiz.matchQ` / new `matchQAntonym`) on one line (16px muted) and the word big (Fraunces 38/600). If the prompt doesn't parse, fall back to today's text.
- **DICTATION:** no English instruction from the server; show an 84px round forest play button (36px speaker, `0 4px 0 #142A21`) centred, then `screens.quiz.listenQ` (15px muted). The 52px AudioButton next to the prompt goes.
- **Options:** min-height 54, radius 16, 12px/16px padding; right = 2px forest border + good wash + check; wrong pick = 2px gold border + gold-soft + "Your pick"; other options after answering muted `#8A938C`.
- **Text answer:** field height 54, radius 16; typed = 1px forest border; answered = 2px forest/gold border + wash. Check button = forest 58px, `opacity .45` (still disabled) while empty.
- **Hint:** water-soft note, IPA bold on the first line, definition below; "Need a hint?" link stays.
- **Feedback panel:** radius 20, padding 16, pushed to the bottom (`margin-top: auto`). Right: title, `word · IPA` (MATCHING shows the asked word, e.g. "mitigate", not the option), italic Fraunces example, "Mastered" pill radius 12. Wrong: title, `word · definition` (definition = `explanation` if present, else the hint's definition if it was fetched, else just the word), then `comesBack` (13px gold text). Primary button Next / See results inside the panel.
- **Results:** Close top right; 148px forest circle with the watering-can art (missed > 0) or the bloom art (all right) — copy the SVGs from the reference HTML into `garden/illustrations` style components; overline (Quiz done / Drill done), Fraunces 30 title, subtitle; two white tiles (Fraunces 26 value: Right `#3E7F5A`, Need water `#9A6E14`, or `#8A938C` when 0); gold missed card (radius 20, water-drop icon, chips, note); bottom: "Drill tricky words" as a white 56px secondary link only for a normal quiz with misses, then "Back to bed" primary 58px.
- **Messages** (en-US, vi-VN, zh-CN): add `screens.quiz.matchQ` ("Which word means the same as" / "Từ nào đồng nghĩa với" / "哪个词的意思相同："), `matchQAntonym` ("Which word means the opposite of" / "Từ nào trái nghĩa với" / "哪个词的意思相反："), `listenQ` ("Listen, then type the word you hear." / "Nghe rồi gõ lại từ bạn nghe được." / "听一听，然后输入你听到的单词。"). zh-CN needs the native review (decision 8).

**Steps.** Same rules as the U5/U6 passes: **one commit per pass, 75 minutes apart**; read only this section + §10 + the files for the step; check the previous step's commit first (`GIT_OPTIONAL_LOCKS=0 git log --oneline -30 | grep "QZ-"`) and if it's missing do that step instead and stop. Commit message `UI-5 QZ-n: …`. Stage exact paths. ≤ 8-line report under "UI-5 quiz design" in `docs/reports/dygo_academy_session_report_2026-09-26.md` (not committed); set the row ✅ + hash.

| Step | What | Files (expected) |
| --- | --- | --- |
| **QZ-1** | Fixture pages `/garden/_reference/Q1-quiz-choose` … `Q5-quiz-listen` (QuizScreen with the reference data, both locales, like the A-screen fixtures) + question-screen changes above (sentence pill, matching, dictation, options, field, hint, feedback panel) + the three messages. Vitest for the prompt parsing (`_____` split, matching regex, fallback). | `screens/QuizScreen.tsx`, `quiz.test.tsx`, reference fixtures, messages | ✅ `d924173` |
| **QZ-2** | Fixture pages `Q6-quiz-result` … `Q8-quiz-drill-done` + result-screen changes (art, tiles, missed card, buttons). Vitest (drill button only for a normal quiz with misses; 0 tile muted; perfect art). | `screens/QuizResultScreen.tsx`, `quizResult.test.tsx`, fixtures, illustration component | ✅ `956dd43` |
| **QZ-3** | Pixel diff on the Mac: `npm run garden:diff -- --locale en-US,vi-VN --only Q1-quiz-choose,…,Q8-quiz-drill-done` (all 16 ≤ 0.5%); fix layout until they pass. Never edit the references. Record the numbers in the README diff table. | the two screens, README | ✅ `05616dd` 2026-10-01: all 16 pass on UAT (en 0.055–0.322%, vi 0.056–0.304%); fixed the gap pill width (104px) and the diff now blurs an autofocused button |
| **QZ-4** | Wrap-up: tsc (app + test) / lint / Vitest; live check of `/garden/quiz?topic=…` with `QuizLive` (no prop changes left unwired: hint definition into the wrong panel, matching word); §1 UI-5 row note; report; changelog line. | report, plan (don't commit) | ✅ `a95b5e2` 2026-10-01 (QuizLive now passes `drillHref`, so live Drill tricky words shows): app tsc ✓, test tsc only the old `config.test.ts:61` error, `next lint` ✓, Vitest 313/313 ✓; Hint definition (via `hint`) and the matching word (from the prompt) already reach the panels. Live check not run (no browser on the VM) |

### Home page (HP-1 … HP-4), added 2026-10-02

**Why.** Dylan asked for a public home page showing what the app does, for adult learners and parents of kids. Designed on the canvas page **"Home page"** (version `1790954376-81ff`, approved 2026-10-02) and committed in `be408bc`. Illustrations only (the garden art), no app screenshots, no reviews/ratings/user counts.

**References** (`docs/design/garden/reference/`, each also `-vi`; sources `source/Landing*.dc.html`; `tools/render.js` jobs with `$size`):

| # | Reference | Size | Notes |
| --- | --- | --- | --- |
| H1 | `H1-home-phone` | 390 × 3800 | phone layout (one column) |
| H2 | `H2-home-desktop` | 1280 × 2600 | desktop layout (hero two columns, 4 stage cards in a row, 3 × 2 features, parents text + kids card side by side) |

Sections, top to bottom: header (logo, Features · How it works · For parents anchors on desktop, language chip, Sign in, Create account) → hero (garden scene: seed → fruiting tree, watering can with drops, sun; headline, lead, **Start growing** → `/register`, **I have an account** → `/login` (desktop only), languages line) → **How your words grow** (Seed, Sprout, Flower, Fruiting) → **Everything a growing vocabulary needs** (6 features) → **For parents** + "Coming soon" badge + kids card (Dygo the bird, picture quiz, bee, stars; Baloo 2 for the kids prompt) → facts row → final call to action (→ `/register`) → footer (Terms, Privacy: placeholder `#` until decision 12, © 2026 Dygo Academy). Copy: read it from the reference `.html` (en) and `-vi.html` (vi); zh-CN is a draft from the same keys and needs the native review (decision 8).

**Routing.** `/` today: signed in → `/garden` (root `middleware.ts`), signed out → 308/307 to `/search` (`lib/supabase/middleware.ts`, the 2026-09-17 "guests go to search" rule). New: **signed out → render the home page at `/`** (no redirect); signed in → `/garden` as now; `/search` stays as it is (still reachable directly). The page's language: `dygo_locale` cookie → Accept-Language → English (same as the auth screens); the language chip sets `dygo_locale` like AU1's chip does. Metadata: title "Dygo · Grow your English, one word at a time", description from the lead, `lang` per locale, Open Graph title/description.

**Responsive.** Phone layout below `lg` (1024 px); desktop layout from `lg`, content max width 1280 with 64 px side padding. Tablet widths use the phone layout (centred, max width 560 like the garden screens) until a tablet board exists.

**Steps.** Same rules as the QZ/U6 passes: one commit per pass, 75 minutes apart; read only this section + §10 + the files for the step; check the previous step's commit first (`GIT_OPTIONAL_LOCKS=0 git log --oneline -30 | grep "HP-"`) and if it's missing do that step instead and stop. Commit message `Home HP-n: …`. Stage exact paths. ≤ 8-line report under "Home page" in `docs/reports/dygo_academy_session_report_2026-09-26.md` (not committed); set the row ✅ + hash. Don't deploy (Dylan deploys).

| Step | What | Files (expected) |
| --- | --- | --- |
| **HP-1** | The page: `HomeScreen` (props only, both layouts via Tailwind `lg:`), illustrations as components (copy the SVG paths from the reference HTML), route `/` for signed-out visitors (its own route group + layout with the garden fonts/tokens via `GardenRoot`, no session needed), middleware change (guest `/` renders the page instead of redirecting to `/search`), messages `screens.home.*` in en-US / vi-VN / zh-CN, metadata. Vitest: HomeScreen links (`/register`, `/login`, anchors), middleware (guest `/` → 200 home, signed in `/` → `/garden`, guest protected path → `/login?next=`). | `src/app/(home)/**`, `components/home/**` (or `components/garden/screens/HomeScreen.tsx`), `lib/supabase/middleware.ts`, messages, tests | ✅ `627019d` |
| **HP-2** | Fixture pages `/garden/_reference/H1-home-phone` and `H2-home-desktop` (HomeScreen with the reference copy, `?locale=`), forced to the phone or desktop layout by the fixture (not by the window width). `scripts/garden-diff.mjs`: take each reference's size from its PNG (width/2 × height/2 at DPR 2) instead of the fixed 390 × 844, set the viewport to that size and shoot the full board; the A/GR/AU/Q pages stay 390 × 844. Vitest for the size helper. | fixtures, `ReferenceScreen.tsx`, `scripts/garden-diff.mjs` | ✅ `73122b9` |
| **HP-3** | Pixel diff (needs Dylan: deploy, then on the Mac `npm run garden:diff -- --base https://www.dygoacademy.com --locale en-US,vi-VN --only H1-home-phone,H2-home-desktop`, all 4 ≤ 0.5%); fix layout until they pass, never edit the references; README diff table. | the page, README | ⏭ superseded by Home v2: the v1 page is replaced, its diff/wrap-up are part of HP-11 |
| **HP-4** | Wrap-up: tsc / lint / Vitest; live check signed out and signed in (`/` → home vs `/garden`), language chip, links; §1 row note; report; changelog line. | report, plan (don't commit) | ⏭ superseded by Home v2: the v1 page is replaced, its diff/wrap-up are part of HP-11 |

### Home page v2: pain-led landing (HP-5 … HP-11), added 2026-10-03

**Why.** The v1 home page (HP-1 … HP-4) explains the garden but doesn't sell it: it lists features, never names the learner's problem, and never lets a visitor try the product. The market analysis (2026-10-03, Claude doc "Dygo Market Analysis", section *Product proposition*) set the proposition: **learn the word, learn how to use it, keep it for good**, for anyone learning English words (not only IELTS). Dylan picked four ideas from the landing-page review (2026-10-03): **1 Plant a word hero, 2 Sound familiar? pain cards, 5 What do you need English for?, 8 FAQ + seed packet call to action.** Ideas 3 (scroll-grown word), 4 (wilting vs blooming slider), 6 (mini quiz) and 7 (shared garden art) are parked for a later pass.

**Rules that still apply.** The canvas wins (§1 *Design fidelity*): every new section is **designed on the canvas first**, approved at a gate, exported as references, then built and pixel-diffed (≤ 0.5%, en + vi). Every string in `en-US`, `vi-VN`, `zh-CN` (§10 rule 10). Illustrations only, no app screenshots, **no reviews, ratings or user counts** (HP-1 rule). Show only what works on UAT today. HP-3/HP-4 (v1 diff + wrap-up) finish first; HP-5 (design) can run in parallel.

**New page order** (sections marked ★ are new; the rest are v1 sections kept as they are):

1. Header (v1)
2. ★ **Hero: Plant a word** (replaces the v1 hero)
3. ★ **Sound familiar?** (4 pain cards)
4. How your words grow (v1: Seed, Sprout, Flower, Fruiting)
5. ★ **What do you need English for?** (use-case beds)
6. Everything a growing vocabulary needs (v1 features)
7. For parents + Coming soon (v1)
8. ★ **FAQ**
9. ★ **Seed packet call to action** (replaces the v1 final call to action)
10. Footer (v1)

The v1 facts row ("A few minutes · 3 missions · 3 languages") is removed: the FAQ carries those facts. Dylan confirms at G-home.

#### G-home result (2026-10-03): approved, references are the source of truth

Canvas page **"Home page v2"** approved by Dylan; exported in `f254fbd` (`docs/design/garden/reference/H3-home-v2-phone`, `H4-home-v2-desktop`, `H3s-plant-bloomed`, `H3s-pain-flipped`, `H3s-uses-travel`, each `.png` + `.html` and `-vi`; sources `source/LandingV2*.dc.html`; `tools/render.js` jobs with `$size`). **Read every string from the reference `.html` (en-US) and `-vi.html` (vi-VN); where they differ from the tables below, the references win.** zh-CN: translate from the new English (draft, decision 8). What changed at G-home:

- **English copy rewritten for natural wording** (Dylan, 2026-10-03). Examples: hero title "Learn a word. Use it right. Remember it for good."; lead "Every word comes with real example sentences and a clear explanation in your language. Then Dygo brings it back right before you'd forget it. Just 5 minutes a day."; placeholder "A word you keep forgetting…"; bird "I'll remind you before it slips your mind. Want to keep this one?"; languages line "Available in English, Tiếng Việt and 简体中文"; pain fronts "I know what it means, but I can't use it." / "I learn a word today and forget it by next week." / "All-English explanations just confuse me." / "I start strong, then give up after three days."; uses lead "Grow the words that matter to you."; bed button "Start with these words"; Coming soon line suffix "Until then, start with your own words."; FAQ title **"Common questions"** with reworded Q&As; "I already have an account"; features and parents copy smoothed. `plant.unknown` en: "We'll grow \"{word}\" for you once you sign up." Metadata title: "Dygo · Learn English words and how to use them".
- **Word definitions (en):** confident "sure of yourself and your abilities", deadline "the time or date by which something must be done", souvenir "something you buy or keep to remember a place or trip"; the other 5 hero words as in the table. **vi bed meanings:** schedule "lịch làm việc", itinerary "lịch trình", landmark "địa danh" (shorter so tiles stay on two lines); the rest as drafted.
- **How your words grow is redesigned** (no longer the v1 section): intro "Think of every word as a plant…"; four stage cards **Stage 1–4** each with *what it means*, **Reviews:** (when Dygo waters it) and **Grows when:** / **Stays that way if:** (Fruiting), arrows between cards (row on desktop, column on phone, phone cards have the picture left of the title); below, a "Reviews spread out as a word grows" strip (drops at widening gaps, Today → Weeks later) and two tips: "A water drop means it's due today" and "Forgot one? No problem." Timings follow the FSRS mapping in §3 (Learning/Relearning = sprout, Review = flower, `mastered_at` at 21-day stability ≈ 4 good reviews = fruiting). Built in **HP-7**.
- **Desktop hero** keeps "Create free account" + "I already have an account" under the lead (phone: not shown in the hero).
- Facts row removed (confirmed); header nav Features · How it works · Questions · For parents; decision 13 decided.

#### Section specs

**★ Hero: Plant a word**

- Copy (decision 13):

  | Key | en-US | vi-VN | zh-CN (draft, decision 8) |
  | --- | --- | --- | --- |
  | `hero.title` | Learn the word. Learn how to use it. Keep it for good. | Học từ. Biết cách dùng. Nhớ mãi. | 学单词，会用它，记得住。 |
  | `hero.lead` | Dygo gives every word real examples, in your language, then brings it back just before you'd forget. 5 minutes a day. | Dygo cho mỗi từ câu ví dụ thật, giải thích bằng tiếng Việt, rồi nhắc lại ngay trước khi bạn quên. Mỗi ngày 5 phút. | Dygo 为每个单词提供真实例句和中文解释，并在你快忘记时再次提醒。每天只需 5 分钟。 |
  | `plant.placeholder` | Type a word you keep forgetting… | Gõ một từ bạn hay quên… | 输入一个你总是忘记的单词… |
  | `plant.bird` | I'll remind you before you forget it. Want to keep it? | Mình sẽ nhắc bạn trước khi bạn quên. Giữ từ này nhé? | 我会在你忘记之前提醒你。要留下这个词吗？ |
  | `plant.save` | Save this word — it's free | Lưu từ này — miễn phí | 保存这个词——免费 |
  | `plant.unknown` | We'll grow "{word}" for you once you're in. | Dygo sẽ trồng "{word}" cho bạn sau khi bạn đăng ký. | 注册后，Dygo 会为你种下"{word}"。 |

- Layout: desktop = text left, demo right (v1 hero grid); phone = title, lead, then the demo. The idle demo (pot + seed + input + 4 chips) must fit the first phone screen at 390 × 844 below the header.
- **States:** `idle` (pot with seed, input, chips) → `planting` (seed drops into the soil, 400 ms) → `sprouting` (sprout grows, 600 ms) → `bloomed` (word card opens beside/below the pot; Dygo the bird lands on the pot with `plant.bird`; primary button `plant.save` → `/register?seed=<word>`). A second chip or word replaces the card (back to `planting`). `prefers-reduced-motion`: skip `planting`/`sprouting`, show `bloomed` at once.
- **Word card** (garden `Card` + `ReviewCard` answer styling, no rating bar): word (Fraunces), IPA, part of speech, meaning line in the page language (vi-VN → Vietnamese, zh-CN → Chinese, en-US → the English definition only), one example with the word in bold, two synonym chips. No audio in v1 (no audio for guests; keeps the page light).
- **Words (decision 14, default: pre-made only).** 8 words in `src/components/home/plantWords.ts`, typed, all three locales; chips show 4 of them (`confident`, `deadline`, `mitigate`, `souvenir`); the input matches all 8 (case-insensitive, trimmed). Any other word → `plant.unknown` card (no meaning, no API call) with the same `plant.save` button. The Vietnamese meanings need Dylan's check at G-home.

  | Word | IPA (UK) | PoS | English definition | vi-VN | zh-CN | Example | Synonyms |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | confident | /ˈkɒnfɪdənt/ | adj | feeling sure about yourself | tự tin | 自信的 | She felt confident before the interview. | sure, self-assured |
  | deadline | /ˈdedlaɪn/ | noun | the latest time something must be done | hạn chót | 截止日期 | We need to finish the report before the Friday deadline. | due date, time limit |
  | mitigate | /ˈmɪtɪɡeɪt/ | verb | to make something bad less serious | giảm nhẹ | 减轻 | Trees help mitigate the heat in big cities. | reduce, ease |
  | souvenir | /ˌsuːvəˈnɪə/ | noun | something you keep to remember a place | quà lưu niệm | 纪念品 | I bought a small souvenir at the night market. | keepsake, memento |
  | negotiate | /nɪˈɡəʊʃieɪt/ | verb | to discuss something to reach an agreement | đàm phán, thương lượng | 谈判 | They negotiated a better price with the supplier. | bargain, discuss |
  | sustainable | /səˈsteɪnəbl/ | adj | able to continue without harming the environment | bền vững | 可持续的 | The city is investing in sustainable transport. | green, renewable |
  | appointment | /əˈpɔɪntmənt/ | noun | an arranged time to meet someone | cuộc hẹn | 预约 | I have a dentist appointment at 3 p.m. | booking, meeting |
  | curious | /ˈkjʊəriəs/ | adj | wanting to know or learn about something | tò mò | 好奇的 | Children are curious about everything around them. | inquisitive, interested |

- Accessibility: the input is a labelled `<input type="text">` with `enterkeyhint="go"`; chips are buttons; the card is announced with `aria-live="polite"`; focus moves to the card heading after `bloomed`.

**★ Sound familiar?** (4 pain cards)

- Title `pains.title`: "Sound familiar?" / "Nghe quen không?" / "是不是很熟悉？"; lead `pains.lead`: "Tap a card to see how Dygo helps." / "Chạm vào thẻ để xem Dygo giúp gì." / "点一下卡片，看看 Dygo 怎么帮你。"
- Each card: **front** = the pain in the learner's voice (Fraunces 22, quote style) + a small garden illustration; **back** = Dygo's answer (body 16) + the matching plant glyph.

  | Key | Front en-US | Back en-US | Front vi-VN | Back vi-VN | Front zh-CN | Back zh-CN |
  | --- | --- | --- | --- | --- | --- | --- |
  | `use` | "I know the meaning, but I can't use it." | Every word comes with real example sentences, synonyms and fill-in-the-blank practice. | "Tôi biết nghĩa nhưng không biết dùng." | Mỗi từ đều có câu ví dụ thật, từ đồng nghĩa và bài điền từ để luyện. | "我认识这个词，却不会用。" | 每个词都配有真实例句、同义词和填空练习。 |
  | `forget` | "I learn it today and forget it next week." | Dygo brings each word back just before you'd forget it. | "Học hôm nay, tuần sau đã quên." | Dygo nhắc lại từng từ ngay trước khi bạn kịp quên. | "今天学，下周就忘了。" | Dygo 会在你快要忘记之前再次提醒每个单词。 |
  | `language` | "English-only explanations confuse me." | Meanings in Vietnamese or Chinese when you need them, English only when you don't. | "Giải thích toàn tiếng Anh, khó hiểu quá." | Nghĩa bằng tiếng Việt hoặc tiếng Trung khi bạn cần, chỉ tiếng Anh khi bạn không cần. | "全英文解释，看不懂。" | 需要时用越南语或中文解释，不需要时只用英语。 |
  | `habit` | "I start strong, then give up after 3 days." | Just 5 minutes a day, 3 small missions, and a rain barrel that saves your streak on busy days. | "Hăng hái 3 ngày rồi bỏ." | Chỉ 5 phút mỗi ngày, 3 nhiệm vụ nhỏ, và thùng nước mưa giữ chuỗi ngày khi bạn bận. | "坚持三天就放弃了。" | 每天只需 5 分钟、3 个小任务，忙碌时雨水桶帮你保住连续天数。 |

- Layout: desktop 4 in a row; phone 2 × 2 grid (min card height 168). Each card is one `<button aria-pressed>`; both faces stay in the DOM, the hidden face has `aria-hidden`. Flip = 3D rotate 450 ms; reduced motion = crossfade 150 ms. Click/Enter/Space flip; flipping one card doesn't flip others.

**★ What do you need English for?** (use-case beds)

- Title `uses.title`: "What do you need English for?" / "Bạn học tiếng Anh để làm gì?" / "你学英语是为了什么？"; lead `uses.lead`: "Plant the words for your life." / "Trồng những từ cho cuộc sống của bạn." / "种下属于你生活的单词。"
- Chips (a `tablist`, arrow keys move, default **Work**): 💼 Work / Công việc / 工作 · 🎓 Study & IELTS / Học tập & IELTS / 学习与雅思 · ✈️ Travel / Du lịch / 旅行 · 🏠 Daily life / Đời sống / 日常生活 · ✏️ My own words / Từ của tôi / 我的单词.
- Panel (`tabpanel`): a garden bed illustration with a small wooden sign (the chip name) and 5 plant tiles (`PlantGlyph` mixed stages + the English word + its meaning in the page language; en-US shows no meaning line). Under the bed: one line + a secondary button "Start this bed" → `/register`.

  | Bed | Words | Line under the bed |
  | --- | --- | --- |
  | Work | deadline, negotiate, schedule, colleague, feedback | Words for emails, meetings and customers. |
  | Study & IELTS | mitigate, sustainable, significant, analyse, evidence | The IELTS Academic word bank is ready to plant. |
  | Travel | souvenir, itinerary, delay, reservation, landmark | Talk with confidence on your next trip. |
  | Daily life | grocery, appointment, neighbour, refund, borrow | The words you need every day. |
  | My own words | (5 empty seed tiles) | Add any word you meet. Dygo adds the meaning and examples. |

- **Honesty (decision 15).** Today only Study & IELTS exists as a ready-made bed. Until Work, Travel and Daily life are seeded, those panels carry a gold "Coming soon" badge and the line ends with "Start with your own words." The "My own words" line only says "Dygo adds the meaning and examples" once AI fill-in is confirmed live on UAT; until then: "Add any word you meet, with your own meaning and example."
- Vietnamese and Chinese meanings for the 25 words go in `src/components/home/useCaseWords.ts` (all three locales, typed); Dylan checks the Vietnamese at G-home.

**★ FAQ**

- Title `faq.title`: "Questions" / "Câu hỏi thường gặp" / "常见问题". Native `<details>/<summary>` (keyboard and screen readers for free), one open at a time is **not** enforced. Desktop: two columns; phone: one.

  | Question (en-US) | Answer (en-US) |
  | --- | --- |
  | Is Dygo free? | Yes. You can start free, with no card needed. |
  | Who is Dygo for? | Anyone who wants to learn English words and how to use them: for work, study, travel or everyday life. |
  | Do I need good English to start? | No. Dygo explains words in Vietnamese or Chinese when you need it. |
  | Does it work on my phone? | Yes. It runs in the browser on iPhone, Android, iPad and computers, and you can add it to your Home Screen. |
  | How much time do I need? | About 5 minutes a day. Dygo tells you which words need water today. |
  | Can I add my own words? | Yes. Plant any word in "My own words" and review it like the rest. |
  | Is there a version for children? | The kids' garden is coming soon. For now Dygo is made for teens and adults. |

  vi-VN and zh-CN are translated in HP-5 with the canvas (the canvas copy is the approved translation, like UI-L).
- SEO: `FAQPage` JSON-LD built from the same messages in the page `<head>` (per locale).

**★ Seed packet call to action**

- A seed-packet illustration (forest packet, cream label, Dygo bird stamp) with label text "Dygo seeds · Plant your first word today" / "Hạt giống Dygo · Trồng từ đầu tiên hôm nay" / "Dygo 种子 · 今天种下第一个单词", the word **Free** / **Miễn phí** / **免费** on a gold tag, and the primary button `cta.button` ("Create free account" / "Tạo tài khoản miễn phí" / "创建免费账户") → `/register` (or `/register?seed=<word>` if a word was planted in the hero this visit).
- Hover/focus on the button: the packet's top edge "tears" open and 3 seeds peek out (300 ms, CSS only). Click navigates at once (no waiting for the animation). Reduced motion: no tear.

**Metadata.** Title "Dygo · Learn the word, learn how to use it" (vi "Dygo · Học từ và biết cách dùng", zh "Dygo · 学单词，会用它"); description = `hero.lead`; Open Graph image unchanged.

#### Steps

Same rules as the HP-1 … HP-4 passes: **one commit per pass, 75 minutes apart**; read only this section + §10 + the files for the step; check the previous step's commit first (`GIT_OPTIONAL_LOCKS=0 git log --oneline -30 | grep "HP-"`) and if it's missing do that step instead and stop. Commit message `Home HP-n: …`. Stage exact paths. ≤ 8-line report under "Home page v2" in the day's session report (not committed); set the row ✅ + hash. Don't deploy (Dylan deploys). Frontend checks: `tsc --noEmit` + `next lint` on touched files + touched Vitest; no `next build`/Playwright in the pass (Dylan runs those).

**Scheduled (2026-10-03, scheduled tasks, Singapore time):** HP-6 Sun 10-04 02:00 · HP-7 03:15 · HP-8 04:30 · HP-9 05:45 · HP-10 07:00 · HP-11 08:15 (UTC: 10-03 18:00 → 10-04 00:15). Each pass checks the previous HP commit first.

| Step | What | Files (expected) | Status |
| --- | --- | --- | --- |
| **HP-5** | **Design, no code.** Claude drafts the canvas page **"Home page v2"**: boards `H3-home-v2-phone` (390 wide) and `H4-home-v2-desktop` (1280 wide), en + vi, with the new order and copy above; plus state boards `H3s-plant-bloomed` (hero after planting "deadline"), `H3s-pain-flipped` (card `forget` flipped), `H3s-uses-travel` (Travel chip selected, Coming soon badge). Uses only existing tokens, fonts and garden art (new art: seed packet, bed sign, pot). **G-home gate:** Dylan approves the boards, the Vietnamese copy and the 8 + 25 word meanings; then `tools/render.js` jobs + export into `docs/design/garden/reference/` in a `design: …` commit. | canvas, `docs/design/garden/**` | ✅ `f254fbd` (G-home passed 2026-10-03) |
| **HP-6** | Hero **Plant a word**: `PlantAWord` (states, timings, reduced motion, focus move, `aria-live`), `plantWords.ts` (8 words × 3 locales), hero copy + metadata, `/register?seed=` link. Replaces the v1 hero in `HomeScreen`. Vitest: chip → card with the right locale meaning; typed match is case-insensitive; unknown word → `plant.unknown` card; reduced motion skips to `bloomed`; save link carries `seed`. | `components/home/PlantAWord.tsx`, `plantWords.ts`, `HomeScreen.tsx`, `homeArt.tsx`, messages, tests | ✅ `40cd48b` |
| **HP-7** | **Sound familiar?** `PainCards` (4 cards, `aria-pressed`, hidden face `aria-hidden`, flip/crossfade), placed after the hero; **and How your words grow v2** (`GrowthStages`: 4 stage cards with what it means / Reviews / Grows when, arrows, the reviews-spread strip and the two tips, per the G-home notes and the H3/H4 references), replacing the v1 stage cards. Messages in all three files. Vitest: click/Enter/Space flip one card only; hidden face not in the accessibility tree; 4 stages in order with the Fruiting card using "Stays that way if". | `components/home/PainCards.tsx`, `GrowthStages.tsx`, `HomeScreen.tsx`, `homeArt.tsx`, messages, tests | ✅ `bf50bd9` |
| **HP-8** | **What do you need English for?** `UseCaseBeds` (tablist + arrow keys, bed art with sign, 5 plant tiles, Coming soon per decision 15, AI-fill line per UAT state), `useCaseWords.ts`, placed after *How your words grow*. Vitest: default Work; arrow keys move selection; Coming soon shown for unseeded beds; meaning line hidden in en-US. | `components/home/UseCaseBeds.tsx`, `useCaseWords.ts`, `HomeScreen.tsx`, `homeArt.tsx`, messages, tests | ✅ `8b21094` |
| **HP-9** | **FAQ + seed packet + final order:** `HomeFaq` (`<details>`, two columns on desktop), `FAQPage` JSON-LD per locale, `SeedPacketCta` (tear on hover/focus, carries `seed` if planted this visit via `sessionStorage`, wrapped in try/catch), remove the facts row, final section order and anchors (header nav: Features · How it works · Questions · For parents). Vitest: JSON-LD has 7 Q&As per locale; CTA href with and without a planted word; order of sections. | `components/home/HomeFaq.tsx`, `SeedPacketCta.tsx`, `HomeScreen.tsx`, `(home)/page.tsx` (JSON-LD), messages, tests |✅ `4dcd571` |
| **HP-10** | **Keep the planted word after sign-up** (Should): `/register?seed=<word>` keeps `seed` through sign-up (like `next`); on the first garden load after sign-up, if `seed` is one of the 8 pre-made words, add it to the learner's "My words" bed with its meaning/example (existing `POST /words`) and show a toast "We planted {word} for you." Unknown words: prefill the Add word sheet instead. No backend change. Vitest. | `(auth)` register page (garden branch), `live/HomeLive.tsx`, `AddWordSheet.tsx` (prefill prop only), messages, tests | ⏭ Dropped 2026-10-03 (Dylan: the landing page is marketing only, no backend calls) |
| **HP-11** | **Fixtures, diff and wrap-up:** fixture pages for H3/H4 and the three state boards (forced layout, `?locale=`), `garden:diff` jobs (sizes from the PNGs, HP-2 helper); retire the H1/H2 jobs (keep the files). Playwright spec `ui/tests/home.spec.ts` (signed out): plant a chip → card visible; flip a pain card; switch to Travel; open an FAQ item; CTA goes to `/register`. Tick this table; report; changelog line. **Dylan:** deploy, then `npm run garden:diff -- --base https://www.dygoacademy.com --locale en-US,vi-VN --only H3-home-v2-phone,H4-home-v2-desktop,H3s-plant-bloomed,H3s-pain-flipped,H3s-uses-travel` (all ≤ 0.5%), Playwright, Lighthouse mobile on `/` (Performance ≥ 90, CLS < 0.1), a real iPhone and an Android phone. | fixtures, `ReferenceScreen.tsx`, `scripts/garden-diff.mjs`, `ui/tests/home.spec.ts`, report, plan (don't commit the last two) | ✅ `9b4ee0d` (Dylan: deploy, diff, Playwright, Lighthouse, phones) |

**Done when:** the four new sections match their approved boards (≤ 0.5%, en + vi), a signed-out visitor can plant a word, flip a card, switch a bed and open an FAQ on a real phone, the CTA keeps the planted word through sign-up, and Lighthouse mobile passes.

**What to measure after launch** (from the market analysis; needs decision 16): visitors → sign-ups, share of visitors who plant a word, sign-ups with a `seed`, which use-case chip is opened most.

## 6. Verification

| Check | How | From |
| --- | --- | --- |
| Types and lint | `npx tsc --noEmit`, `npx next lint` | Every step |
| Unit tests | Vitest (frontend, added in UI-2); `npm test` (backend, 217 today) | UI-2 |
| Matches the mockup | Playwright screenshots at 390 × 844 next to `docs/design/garden/*.png`; differences listed and fixed or accepted | UI-2 |
| Screen sizes | The 8 viewports in design system §16.1 | UI-3 (iPhone), UI-7 (iPad) |
| Languages | `en-US`, `zh-CN`, `vi-VN` on iPhone SE and iPad portrait | UI-7 |
| Same data in both UIs | For beta accounts: due count, streak, mastered count and topic counts, compared classic vs garden | UI-4 → UI-8 |
| RLS | The RLS suite with new assertions for every new table | UI-6 |
| Accessibility | Contrast, labels, keyboard, VoiceOver order, 200% text, reduced motion | UI-2, full pass in UI-7 |
| Real devices | Safari on one iPhone and one iPad, plus a Home Screen install | Every gate |
| Production build | `next build` on the Mac. In the sandbox it only works with mocked fonts. | Every gate |

## 7. Rollout

1. **Dev only** (until 2026-10-02): the flag is off everywhere, and Dylan uses `?ui=garden`.
2. **Beta** (after G1 and UI-4): 3–5 invited users with `?ui=garden`. **Started 2026-10-02** (now).
3. **Everyone** (after G3): `NEXT_PUBLIC_GARDEN_UI=true`, with `?ui=classic` for one week.
4. **Delete** (UI-8): classic adult UI removed once there are no open garden bugs.

Rollback at any point: unset the env flag (everyone gets classic), or use `?ui=classic` for one browser.

## 8. Decisions needed

| # | Decision | Needed by | Default in use |
| --- | --- | --- | --- |
| 1 | Final URLs after UI-8: keep today's (`/`, `/topics`, `/study`) or use new ones (`/garden`, `/review`)? | UI-8 | ✅ Decided 2026-10-02: new short URLs (`/garden` home, `/review`, `/topics`, `/missions`, `/me`, `/groups`, `/quiz`, `/join`) |
| 2 | Body font | G1 | ✅ Decided 2026-09-26: DM Sans, with Be Vietnam Pro for Vietnamese letters (built in `6917965`). Open: accept A7's 0.74% Vietnamese-only difference, or use DM Sans alone |
| 3 | Confirm namespaced Tailwind names until UI-8 | UI-2 | Namespaced |
| 4 | Beta users for G2 | UI-4 | ✅ Picked and invited 2026-10-02 |
| 5 | Launch market, which sets the first translation and audio accent | UI-7 | — |
| 6 | Mainland China in v1? (Google sign-in, fonts at build time, audio CDN, backend reachability; design system §14.6) | UI-7 | Not in v1 |
| 7 | Streak freeze rules: how many, and how often they refill | UI-6 | 2, refilled weekly |
| 8 | Who translates `zh-CN` and `vi-VN` | UI-L | Vietnamese: the approved canvas copy (Dylan, 2026-09-26). Chinese: Claude's draft from the UI-L glossary; **needs a native reviewer** before release |
| 9 | Groups in navigation: a 5th tab "Groups" shown only to people in at least one group, or keep 4 tabs and reach groups from A4, A6's "Group" chip and Me | UI-G design | ✅ Decided 2026-09-26 (GR artboards approved): 5th tab "Groups" for group members. 2026-09-27 (NAV-1): the A-screen canvas shows it too, and A6's "Group" chip is gone |
| 10 | Which per-member facts a group may show (e.g. "watered today" dot, streak), given FR-1.2's no-teacher-exception | UI-G design | ✅ Decided 2026-09-26: aggregates only |
| 11 | Garden names for roles: `ADMIN` / `WRITE` / `READ` → "Head gardener" / "Gardener" / "Visitor", or keep "Admin / Editor / Viewer" | UI-G design | ✅ Decided 2026-09-26: plain names (Admin / Editor / Viewer; vi Quản trị / Biên tập / Thành viên) |
| 12 | Terms of Service and Privacy Policy URLs for the Create account screens | UI-A | Placeholder links |
| 13 | Home v2 hero headline | HP-5 (G-home) | ✅ Decided 2026-10-03: "Learn a word. Use it right. Remember it for good." (vi "Học từ. Biết cách dùng. Nhớ mãi.") |
| 14 | Hero demo words: pre-made only, or live AI fill-in for any typed word (needs a public, rate-limited, cached enrichment endpoint) | HP-6 | Pre-made 8 words; any other word → "we'll grow it once you're in" |
| 15 | Everyday beds (Work, Travel, Daily life): seed real topic beds before the v2 launch, or show sample words with "Coming soon" | HP-8 | "Coming soon" until seeded |
| 16 | Landing analytics tool (visitors → sign-ups, words planted, chips opened) | HP-11 | None; count sign-ups and `seed` sign-ups from the database only |

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
| Home v2 promises something UAT doesn't do (AI fill-in, everyday beds) | Visitors feel misled | Decisions 14–15: pre-made words, "Coming soon" badges; HP-11 live check against UAT |
| Home v2 animations slow on low-end Android / 4G in Vietnam | Visitors leave before the hero loads | CSS/SVG only, no video or animation library; reduced-motion path; Lighthouse mobile ≥ 90 and CLS < 0.1 in HP-11 |
| Pre-made meanings wrong or unnatural in Vietnamese/Chinese | Loses trust on the first screen | Dylan checks vi at G-home; zh-CN native review (decision 8) |
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
10. **Languages.** Every new string goes into `en-US.json`, `vi-VN.json` and `zh-CN.json` in the same commit (UI-L glossary). Every screen with a `-vi` reference is diffed in English and Vietnamese.
