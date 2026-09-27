# Dygo Academy — Adult UI/UX Rebuild Plan

> **Superseded (2026-09-26) by `phase 12 implementation plan.md`.** Kept because the 2026-09-25 session report points at it; its Inventory table is still the list UI-8 deletes from.


**Date**: 2026-09-25 · **Owner**: Dylan
**Live version**: the "Dygo Academy — Adult UI/UX Rebuild Plan" doc in Claude (this file is an export of it; if they differ, the doc wins)
**Spec it builds to**: `dygo_academy_ui_ux_design_system.md` v0.2 · **Visual reference**: the "Dygo Word Garden" design canvas, Adult page (A1–A8)

The adult experience is rebuilt in 9 phases (UI-0 to UI-8). The Word Garden design is built next to the current screens, the new version becomes the default, and then the old UI code is deleted. Data, auth and API code are kept.

---

## Instructions for the automated pass (night of 2026-09-25/26)

Read this section first if you are an automated pass picking this file up.

1. **Scope tonight: UI-0 and UI-1 only.** Start UI-2 only if both are committed and verified with budget left. Do not touch UI-3 onwards.
2. **Do not delete or restyle any existing screen.** Everything new goes in `src/app/(garden)/` behind the `NEXT_PUBLIC_GARDEN_UI` flag. Users without the flag must see the app exactly as before.
3. **Open decisions (bottom of this file) are not answered yet.** Use these defaults and write them down in the session report as assumptions:
   - Body font: **Be Vietnam Pro** (safe for Vietnamese); display font Fraunces.
   - Final URLs: undecided, so keep new screens under `/garden/...` for now.
   - Phase names: keep `UI-0`…`UI-8`.
4. **First steps before any code:** `git status` for uncommitted work from an earlier pass; read the latest session report and the master schedule changelog; recheck the Inventory table below against `src/`.
5. **Commit per phase, and only your own files.** One commit each, message `UI-0: …` / `UI-1: …`. On 2026-09-25 the repo has about 110 uncommitted changes that are **not yours** (Phase 10 FSRS work, the database squash, new frontend files such as `LearningPath.tsx`, `timezone.ts`). Never `git add -A`, `git add .`, `git stash`, `git reset` or `git checkout` them: stage only the exact paths you created or edited. If a file you must edit (`globals.css`, `tailwind.config.ts`, `middleware.ts`, `layout.ts`) already has someone else's uncommitted changes, edit on top of them and say so in the report. Follow the git lock-file workaround from earlier passes (retry loop, `mv` the lock files, never bare `/tmp`).
6. **Don't touch the backend or `database/`** in this plan's UI-0 to UI-2.
7. **Verification the sandbox can do:** `tsc --noEmit`, `next lint`, `npm test`. `next build` hangs in the sandbox; say so in the report rather than claiming a build passed.
8. **Write the day's session report** (`dygo_academy_session_report_<today's date>.md`, or append a pass section if it exists) with what was done, what was assumed and the next open item. Add a changelog line to `dygo_academy_master_project_schedule.md` pointing at this plan.
9. **Stop and report instead of guessing** if `src/` doesn't match the Inventory closely enough to know where the flag and route group go.

---

## Goal and scope

**Goal:** every adult screen matches the Word Garden mockups (A1–A8) on iPhone and iPad, in English, Chinese and Vietnamese.

**What "remove all current UI" means:** every page layout, visual component and style in the adult area goes. That covers the shadcn-styled cards, the Navbar, `LearningPath`, `MasteryRing`, the current flashcard and quiz visuals, and the old colour tokens.

**What it does not mean:** the parts that make the app work stay. These are the login and session checks, the API client, the data hooks, the types and the study-session store (full list in Inventory).

**Out of scope here:** the kids' Garden (its own plan later, reusing UI-1 and UI-2) and dark mode. Groups and teacher screens are restyled only in UI-8, not redesigned.

## Approach: build alongside, then switch and delete

Deleting the current UI first would leave the app unusable for weeks, with nothing to compare the new screens against. Instead, the new UI grows next to the old one and replaces it screen by screen.

1. **New route group.** New screens live in `src/app/(garden)/`, with their own layout, fonts and theme. Old screens stay in `(dashboard)/` untouched.
2. **Feature flag.** A `NEXT_PUBLIC_GARDEN_UI` flag plus a per-user override (`?ui=garden`, remembered in a cookie). `middleware.ts` sends flagged users to the new routes. Everyone else sees the old app.
3. **Same data underneath.** New screens call the same hooks and API client, so both UIs show the same words and progress during the switch.
4. **Switch, then delete.** When every adult screen is done and passes the checks, the flag defaults to on. After one stable week, UI-8 deletes the old routes and components in a single, reviewable commit.

## Inventory: remove, rewrite, keep

Taken from the frontend `src/` tree on 2026-09-25. Recheck against the repo at the start of UI-0.

| Path | Today | Decision | Replaced by |
| --- | --- | --- | --- |
| `(dashboard)/page.tsx` + `topics/LearningPath.tsx` | Home, 5-row day path | Remove (UI-8) | A1 Today's Garden |
| `(dashboard)/study/page.tsx`, `flashcard/Flashcard`, `RatingButtons`, `ProgressiveClues` | Study session, hold-to-rate | Remove (UI-8) | A2 Review, 4-button rating bar |
| `flashcard/AudioButton.tsx` | Audio playback | **Rewrite** logic into the new audio button | A2 audio button |
| `flashcard/WordCardModal.tsx` | Word detail modal | Remove (UI-8) | Bottom sheet (UI-2) |
| `(dashboard)/topics/page.tsx`, `TopicGridCard`, `TopicCard`, `TopicCollectionRow`, `TopicsViewToggle`, `MasteryRing`, `TierProgressCard` | Topics grid | Remove (UI-8) | A6 Topics (beds) |
| `(dashboard)/topics/[topicId]/page.tsx`, `WordStatusRow`, `EmptyTopicState`, `LeechNudge`, `AddWordModal` | Topic detail | Remove; `AddWordModal` form logic **rewritten** as a sheet | A7 Topic bed |
| `(dashboard)/quiz/page.tsx`, `quiz/QuizQuestion`, `QuizFeedback`, `QuizAwards` | Quiz | Restyle in UI-5, question logic kept | Collocation challenge mission |
| `(dashboard)/analytics/page.tsx` | Analytics | Remove (UI-8) | A8 Me (calendar, stats) + A4 Weekly harvest |
| `(dashboard)/settings/page.tsx`, `settings/NotificationSettings` | Settings | Remove; notification logic kept | A8 Me settings |
| `(dashboard)/groups/**`, `groups/*` (9 components), `join/[token]` | Groups and invites | **Restyle only** (UI-8), no redesign | New tokens + components |
| `layout/Navbar.tsx`, `PublicNavbar.tsx` | Top nav | Remove (UI-8) | Tab bar / rail / sidebar (UI-3) |
| `(auth)/login`, `(auth)/register`, `search/page.tsx`, `onboarding/GuestWordTrial` | Sign-in, guest landing | Restyle in UI-7, logic kept | Garden-styled auth |
| `components/ui/*` (shadcn: button, card, dialog, select…) | Base components | Keep the accessible behaviour (Radix); **restyle** with new tokens | UI-2 components |
| `globals.css` colour tokens, `tailwind.config.ts` | Old palette (`--primary` 15 52% 50%) | **Rewrite** (UI-1) | Design system §5 tokens |
| `lib/api-client.ts`, `lib/supabase/*`, `middleware.ts`, `config/env.ts` | Data + auth | **Keep** (middleware gains the flag) | — |
| `hooks/*` (`useTopics`, `useDailyActivity`, `useUpcomingActivity`…), `types/*`, `stores/useStudySessionStore.ts`, `lib/timezone.ts`, `constants/routes.ts` | Data layer | **Keep** | — |
| `constants/layout.ts` (`CONTENT_WIDTH`) | One width for all | **Rewrite** as widths per screen size | Design system §6.2 |

## Phase overview

Phases run in order. UI-0 to UI-4 are one release train, and learners only see the new UI once gate G2 passes. The old UI is deleted only after G3 and a stable week.

| Phase | Name | Size | Gate at the end |
| --- | --- | --- | --- |
| UI-0 | Prep and decisions | S | — |
| UI-1 | Foundations (tokens, fonts, i18n) | S | — |
| UI-2 | Components + gallery | M | **G1** parts match the mockup |
| UI-3 | App shell and navigation | S | — |
| UI-4 | Core loop: Home, Review, Mission complete | L | **G2** core loop live in beta |
| UI-5 | Topics | M | — |
| UI-6 | Retention features: Missions, Welcome back, Me | L | — |
| UI-7 | iPad, languages and polish | M | **G3** all screens pass QA |
| UI-8 | Switch over and delete the old UI | S | — |

The gates: **G1** = the component gallery matches the mockup side by side; **G2** = Home, Review and Mission complete run on real data for flagged beta users; **G3** = every adult screen passes the screenshot, locale and accessibility checks.

## Phase by phase

Sizes are rough estimates for one developer working with Claude: S = 2–3 days, M = about a week, L = 1–2 weeks. New backend work is listed only where a phase needs it.

### UI-0 Prep and decisions (S)

- [ ] Recheck the Inventory table against the repo; fix anything that moved
- [ ] Answer the open decisions at the end of this doc (fonts, market order, China scope)
- [ ] Add the `NEXT_PUBLIC_GARDEN_UI` flag, the `?ui=garden` cookie override, and the redirect in `middleware.ts`
- [ ] Create the empty `(garden)` route group with its own `layout.tsx`
- [ ] Take baseline screenshots of the current UI (for the before/after record and regression checks)
- [ ] Export the 8 adult mockups as reference PNGs at 390 × 844 into the repo (`docs/design/garden/`)

**Done when:** a flagged user lands on an empty garden page; everyone else sees the app exactly as today.

### UI-1 Foundations (S)

- [ ] Colour, spacing, radius, shadow and motion tokens as CSS variables in `globals.css`, scoped to `[data-ui="garden"]` so the old UI keeps its colours until UI-8
- [ ] Tailwind names for every token (`bg-surface`, `text-muted`, `rounded-card`) and the new screens (`md` 600, `lg` 1024, `short`)
- [ ] Fonts through `next/font` (self-hosted): Fraunces + DM Sans or Be Vietnam Pro, with the CJK system fallback
- [ ] `CONTENT_WIDTH` rewritten with widths per screen size
- [ ] `next-intl` set up with `en` messages only; every new string goes through `t()` from day one
- [ ] Viewport meta with `viewport-fit=cover`, safe-area helpers, `100dvh`

**Done when:** a test page shows every token, text style and font correctly in English, Chinese and Vietnamese test strings.

### UI-2 Components (M)

- [ ] Build the 18 components in the design system §11, restyling the existing Radix/shadcn primitives where one exists (dialog → sheet, switch, button)
- [ ] `PlantGlyph` with all stages (seed, sprout, flower, tree, wilting, thirsty) and sizes
- [ ] `AudioButton` rewritten on top of today's playback logic, with an "audio unavailable, retry" state
- [ ] A component gallery page at `/garden/_gallery` (flag only) showing every component in every state

**Done when (G1):** each component in the gallery matches the mockup side by side at 390px, and passes keyboard and VoiceOver checks.

### UI-3 App shell and navigation (S)

- [ ] Bottom tab bar (iPhone), with safe-area padding; placeholder routes for Garden, Missions, Topics, Me
- [ ] Pushed sub-screens with a back button; full-screen review with no tab bar
- [ ] Loading, error and empty states in the new style (replacing `loading.tsx` / `error.tsx` for the group)
- [ ] Rail and sidebar variants built now, but only switched on in UI-7

**Done when:** you can tap through all 4 tabs and back on an iPhone without layout jumps.

### UI-4 Core loop: Home, Review, Mission complete (L)

- [ ] **A1 Today's Garden** on real data: due count (thirsty), mastered count (ripe), leeches (wilting), streak from daily activity, "ripens tomorrow" from upcoming activity
- [ ] **A2 Review**: new card and 4-button rating bar on the existing study store and SRS endpoint; the hold-to-rate gesture is dropped
- [ ] **A3 Mission complete**: session stats from the study store
- [ ] Missions v0, worked out in the frontend from existing data: "water the due words" is real; "plant new words" and "collocation challenge" are shown only if the data exists, otherwise hidden
- [ ] Invite 3–5 beta users through the cookie override

**Done when (G2):** beta users complete real review sessions in the new UI for a week with no data differences against the old UI.

### UI-5 Topics (M)

- [ ] **A6 Topics** (beds) from `useTopics`: stage mix bar, due badge, filter chips
- [ ] **A7 Topic bed**: stage tiles, word list sorted by next due date, review this bed, add word as a bottom sheet (logic from `AddWordModal`)
- [ ] Quiz screens restyled; the collocation quiz becomes mission 3

**Done when:** everything the old topics grid and topic detail could do is possible in the new screens.

### UI-6 Retention features: Missions, Welcome back, Me (L, includes backend)

- [ ] **Backend:** daily missions (`GET /missions/today`, progress updates), Golden Bloom and weekly harvest counts, streak freezes, reminder time and push/email sending, keepsakes, profile fields `ui_locale`, `meaning_locale`, `english_variety`
- [ ] **A4 Weekly harvest**, **A5 Welcome back** (shown on Home after 2+ missed days), **A8 Me** with the garden calendar, keepsakes and settings
- [ ] Old analytics and settings pages get a link to the new Me screen, ready for removal

**Done when:** missions, freezes and reminders work end to end for beta users.

### UI-7 iPad, languages and polish (M)

- [ ] iPad layouts from the design system §10: rail at 600px+, sidebar and master–detail at 1024px+, two-pane review in landscape, keyboard shortcuts
- [ ] Chinese and Vietnamese messages; meaning-language and UK/US settings wired to content
- [ ] Login, register and the guest landing restyled (logic kept)
- [ ] Accessibility pass (design system §15) and reduced-motion check

**Done when (G3):** every adult screen passes the screenshot, locale and accessibility checks in the Testing section.

### UI-8 Switch over and delete the old UI (S)

- [ ] Flag defaults to on for everyone; keep `?ui=classic` as an escape hatch for one week
- [ ] Groups, invites and `join` restyled with the new components (no redesign)
- [ ] After a stable week: delete every Remove row in the Inventory, the old tokens, the Navbar and the flag, in one commit
- [ ] Move `(garden)` routes to their final URLs; update `routes.ts`, the frontend architecture doc (§3, §4, §16, §17) and the UAT checklist

**Done when:** no file in `src/` references the old components or tokens, the build is green, and the escape hatch is gone.

## Testing and verification

Each phase is checked the same way before it is called done. Automated checks run in `com.dygoacademy.automationtesting`, next to the existing API specs.

| Check | How | From phase |
| --- | --- | --- |
| Matches the mockup | Playwright screenshot at 390 × 844 next to the reference PNG from UI-0; small differences listed and fixed or accepted | UI-2 |
| Screen sizes | The 8 viewports in design system §16.1 (iPhone SE to iPad 13") | UI-3 (iPhone), UI-7 (iPad) |
| Languages | `en-US`, `en-SG`, `zh-CN`, `vi-VN` on iPhone SE and iPad portrait; Sunday week start in `en-US` | UI-7 |
| Same data in both UIs | For beta users, due count, streak and topic counts compared between old and new screens | UI-4 to UI-8 |
| Accessibility | Contrast, labels, keyboard, VoiceOver order, 200% text, reduced motion (design system §15) | UI-2, full pass in UI-7 |
| Real devices | Safari on one real iPhone and one real iPad, plus a Home Screen install | Every gate |
| No old code left | Search `src/` for the removed component names and old token names; must return nothing | UI-8 |

## Risks and mitigations

| Risk | Effect | Mitigation |
| --- | --- | --- |
| Missions, freezes and reminders need backend work that isn't planned yet | UI-6 slips; Home shows missions that don't count | UI-4 shows only missions built from existing data; new ones stay hidden until UI-6 ships the API |
| Two UIs live at once | Double maintenance, confusing bug reports | Keep the overlap short (G2 to UI-8); the old UI gets bug fixes only, no features |
| Old and new styles clash | Old shadcn screens change colour when new tokens land | New tokens scoped to `[data-ui="garden"]` until UI-8 |
| Mockup detail that doesn't fit real data (long topic names, 3-digit counts, Vietnamese text) | Broken layouts | Test with the longest real data and `vi-VN` on iPhone SE in every phase |
| DM Sans may lack Vietnamese | Mixed fonts in meanings | Decide in UI-0; Be Vietnam Pro as the fallback choice |
| Sandbox quirks seen in earlier passes (`next build` hanging, git lock files) | Slow or failed verification | Run builds on your Mac for gates; keep commits small per phase |
| Deleting code other screens still import | Build breaks at UI-8 | Search for imports before deleting; delete in one commit that is easy to revert |

## Decisions needed before UI-1

- [ ] **Body font:** DM Sans (if its Vietnamese support is confirmed) or Be Vietnam Pro?
- [ ] **Final URLs:** keep today's paths (`/`, `/topics`, `/study`) after the switch, or use new ones (`/garden`, `/review`)?
- [ ] **Beta group:** who are the 3–5 beta users for G2?
- [ ] **Market order:** which market first? It decides which translations and audio accent UI-7 does first.
- [ ] **Mainland China in v1?** If yes, backend reachability has to be checked before UI-7.
- [ ] **Backend owner for UI-6:** is the missions, freezes and reminders work part of this plan, or a separate backend phase?
- [ ] **Phase names:** keep `UI-0`…`UI-8`, or fold these into the repo's numbering as Phase 12 onwards?
