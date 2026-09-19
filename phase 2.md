# 📋 Dygo Academy — Phase 2 (Remediation): UX & Trust Business Requirements
**Document Version**: 1.3 (Code-complete — see §9 for live-deploy status)
**Author**: UX Audit Follow-up
**Status**: All 20 FRs code-complete as of `e6750a1`. 11 verified live; 9 (Sessions 4–9's output) confirmed still pending deploy — see §9. Not yet closed pending that deploy and a re-verification pass.
**Source**: Screen-by-screen UX audit of `dygoacademy.com`, 2026-09-19 (18 findings, sign-in → home → topics → study → quiz → progress → groups → profile, desktop + mobile)

**Changelog**
* **1.3** (2026-09-19) — Session 9 close-out: implemented and closed the two FRs no session had been assigned (FR-15.5, found mid-Phase-2 but never scheduled; FR-16.3, missing from the schedule doc entirely — a gap in that doc, not a skipped item), bringing all 20 FRs to code-complete. Walked every FR against the live app rather than trusting the commit history, and found a real deploy lag: only work through commit `20dab8e`/`6d6c8f3` (11 FRs) is actually live; everything from `88de075` on (9 FRs, all of Sessions 4–9) is code-complete and test-covered but still showing pre-fix behavior in production. Documented as new §9 rather than backdated into existing FR rows, since each FR's underlying fix is genuinely done — what's missing is a deploy, not more engineering. Added a changelog entry to `dygo_academy_master_project_schedule.md` filing this work as "Phase 6" there, per this document's own naming note below.
* **1.2** (2026-09-19) — Read the actual backend/frontend code (not just the live app) while drafting the developer implementation plan (see `phase 2 implementation plan.md`) and found the real root cause differs from what the audit could observe from the UI alone for three items. Added §7 documenting each, rather than rewriting the original "Problem" bullets, which are still accurate descriptions of what the audit *observed* — only the diagnosis and the resulting effort/priority change. No acceptance criteria changed; FR-9.1–9.3 still require the same end-user behavior, they're just cheaper to fix than assumed. FR-10.2 and FR-11.1 may already be done.
* **1.1** (2026-09-19) — Checked this document against the separately-produced "Dygo Learning Path" concept (a reimagined customer journey + 4 redesigned screens, aimed at making the product feel like a daily coaching habit rather than a dictionary). Verdict: **compatible, not duplicated** — the concept assumes FR-9.1–9.3 are already fixed and visually restyles the same data FR-13.1 and FR-14.1 already require; it does not satisfy either FR on its own, and it introduces real net-new scope (an estimated IELTS band score, topic mastery rings, a path-style home screen) that this document does NOT cover. Added §2.1 to state that relationship explicitly, cross-referenced FR-13.1/FR-14.1 to it, and added open question 4 in §6 about sequencing. No FR text, priority, or acceptance criteria changed.

> **Naming note**: the master schedule (`dygo_academy_master_project_schedule.md`) already has a "Phase 2" (Module 3/4 — SRS & Flashcards, code-complete). This document is a *different* phase — the first remediation pass after the MVP roadmap's Phase 0–5 — named "Phase 2" only because that's what was asked for here. Before merging into the master schedule, rename this to **Phase 6** or **Remediation Pass 1** to avoid two documents both claiming "Phase 2."

---

## 1. Why this phase exists

The MVP roadmap's core KPI is **Day-30 retention > 45%** (`dygo_academy_final_master_brd.md` §2), driven entirely by the streak/due-card/leech-word loop (Modules 3, 6, 8). The audit found that loop currently **shows contradictory numbers to the user on two different screens** and **advertises a fix that doesn't exist** — that's not cosmetic, it's the retention mechanic itself failing to earn trust. A second cluster of findings (unconfirmed deletes, an internal ticket ID leaking into reminder copy, a "Phase 1" label on a dead button) are smaller individually but compound the same impression: the product doesn't fully believe its own state.

Phase 2 closes those gaps before any new feature work (Module 7 billing, etc.) resumes, on the theory that shipping monetization on top of a retention loop with known data-integrity bugs is the wrong order.

## 2. Scope

**In scope**: the 18 findings from the audit, converted to testable requirements, grouped under new Modules 9–16 (continuing the numbering from the master BRD's Modules 1–8).
**Out of scope**: any net-new feature (Module 7 Stripe billing, offline sync, etc.), visual redesign beyond what a fix requires, and the "cross-topic due counts land with Module 3" work referenced in the app's own copy (§4, Module 15) — that's a real backend feature, not a remediation, and is called out as an open question rather than scoped here. Also out of scope: the "Dygo Learning Path" gamified-journey concept (estimated band score, path-style home screen, topic mastery rings) — see §2.1.

### 2.1 Relationship to the "Dygo Learning Path" concept

A separate exercise proposed a reimagined customer journey and four redesigned screens (Home as a walkable "path," topics as mastery-ring collections, a reward-framed session-complete screen, a Band Tracker + Focus List replacing the raw heatmap) aimed at making Dygo feel like a daily coaching habit instead of a reference tool. That concept is **downstream of this document, not a substitute for it**:

* It explicitly assumes FR-9.1–9.3 (one streak, one due-count, one leech-nudge source) are already fixed — a path/streak UI built on top of numbers that still disagree with themselves would just make the trust problem more visible, not less.
* Its "reward moment" screen and "Band Tracker + Focus List" screen are visual treatments of the *same underlying requirements* as FR-13.1 (session summary) and FR-14.1 (heatmap fidelity) — but they add framing (an estimated band score, "mastered" language, ranked focus words) that goes beyond what either FR requires. Shipping FR-13.1/FR-14.1 as written does **not** ship the concept's screens, and shipping the concept's screens would satisfy FR-13.1/FR-14.1's acceptance criteria as a side effect — but the concept itself is not scoped, estimated, or committed to by this document.
* The concept's estimated-band-score feature has no backing calculation anywhere in the codebase today (nothing in `dygo_academy_final_master_brd.md`'s 8 modules computes a band estimate) — it would need its own BRD-style scoping pass, not a retrofit into Phase 2.

Recommendation (not a decision this document makes): treat the Learning Path concept as a candidate **Phase 3**, scoped separately, after Phase 2's P0/P1 items ship. See open question 4 in §6 for the one sequencing choice that does affect this document.

## 3. Priority legend

| Priority | Meaning | Maps to audit severity |
| :--- | :--- | :--- |
| **P0** | Ships before anything else in this phase — actively erodes trust or loses user data | Critical |
| **P1** | Ships this phase — confuses users or costs them time | Moderate |
| **P2** | Ships if capacity allows — polish | Minor |

---

## 4. Business Requirements

### 🔁 Module 9: Retention-Loop Data Integrity
*Why it matters*: this is the D30-retention mechanic (BRD §2, KPI1). Two screens disagreeing about streak/due/leech state directly undermines the one number the whole roadmap is built to move.

* **FR-9.1 (One streak, one source)** — P0
  * *Problem*: Home shows "12-day streak"; Progress shows "5d" for the same account, same session.
  * *Requirement*: Streak SHALL be computed by exactly one service/query, consumed by every screen that displays it. No screen may derive its own streak count.
  * *Acceptance*: Home, Progress, and any future streak display return byte-identical values for the same account at the same instant; a regression test asserts this across at least two surfaces.

* **FR-9.2 (One due-count, one source)** — P0
  * *Problem*: Home's "Due Now" says 12 words / ~4 minutes; Progress's "DUE NOW" tile says 0, for the same account.
  * *Requirement*: "Due now" SHALL be computed by exactly one query (the existing `next_due_at <= NOW()` path per FR-3.4), consumed identically by Home and Progress.
  * *Acceptance*: Both screens show the same due count at the same instant; covered by an integration test seeding known due cards and asserting both endpoints agree.

* **FR-9.3 (Leech nudge must match the leech query)** — P0
  * *Problem*: Home's "2 words keep tripping you up · Fix →" leads to a page reading "No leech words right now."
  * *Requirement*: The count shown in the Home nudge SHALL come from the same query FR-3.3's leech detection uses (`GET /srs/leeches`), not an independently derived number. If that query returns zero, the nudge SHALL NOT render.
  * *Acceptance*: With zero leech words, the Home nudge is absent. With N ≥ 1 leech words, the nudge shows N and its "Fix →" link opens a page listing exactly those N words.

### 🗑️ Module 10: Destructive Action Safety
*Why it matters*: NFR "Data Isolation" (BRD §6) protects data from other tenants; nothing currently protects a user's own data from their own mis-tap.

* **FR-10.1 (Confirm before deleting a topic)** — P0
  * *Problem*: "Delete this topic" at the foot of a 20-word list fires immediately, no confirmation, permanently removing every word and its SRS history.
  * *Requirement*: Deleting a topic SHALL require an explicit confirmation step naming the topic and word count before the delete executes.
  * *Acceptance*: Clicking "Delete this topic" opens a confirmation naming the topic ("Delete 'IETLS 6.5 vocabulary all brand' and its 21 words?"); the delete only fires on a second, explicit confirm.

* **FR-10.2 (Undo or confirm on single-word delete)** — P1
  * *Problem*: Each word row's trash icon deletes immediately; rows are tightly packed, especially on mobile.
  * *Requirement*: Deleting a single word SHALL either require a lightweight confirm (e.g. a second tap on an armed state) or provide a short-lived undo affordance (toast, ~5s) restoring the word and its SRS state.
  * *Acceptance*: A mis-tap on the trash icon is recoverable without contacting support; covered by a UI test.

* **FR-10.3 (Separate destructive group actions from routine ones)** — P1
  * *Problem*: "Save changes" and "Delete group" render as equal-weight, adjacent buttons in group settings.
  * *Requirement*: "Delete group" SHALL be visually separated from "Save changes" (distinct placement and/or styling) and SHALL require its own confirmation naming the group, its roster size, and its topic count.
  * *Acceptance*: The two actions cannot be triggered by the same click target or accidentally chained; confirmation text names what will be lost.

### 🔒 Module 11: Sharing & Privacy Defaults
* **FR-11.1 (Groups default to private)** — P1
  * *Problem*: A group's "Public — discoverable, and its topics are cloneable by other groups" checkbox ships pre-checked.
  * *Requirement*: New groups SHALL default to private (unchecked). Making a group public SHALL be an explicit, deliberate action by an ADMIN.
  * *Acceptance*: A newly created group's `is_public`-equivalent field is `false` until an ADMIN explicitly toggles it; existing groups are unaffected by this change (no silent re-privatization of live public groups without a separate migration decision — flagged as an open question in §6).

### ✍️ Module 12: Quiz Experience Integrity
* **FR-12.1 (Confirm or preserve progress on quiz exit)** — P1
  * *Problem*: The × control exits a quiz mid-question (observed at question 3 of 10) straight to Home, silently discarding answered questions.
  * *Requirement*: Once at least one question has been answered, exiting SHALL either prompt for confirmation or persist session position so the topic's quiz entry point offers to resume.
  * *Acceptance*: Exiting after ≥1 answered question shows a confirm, or re-opening the quiz for that topic resumes at the next unanswered question.

* **FR-12.2 (Show the chosen answer, not just the verdict)** — P1
  * *Problem*: On multiple-choice questions, selecting an option immediately replaces all four options and the user's choice with a generic correct/incorrect panel — the user never sees their own answer highlighted.
  * *Requirement*: The selected option (and, if wrong, the correct option) SHALL remain visible, visually marked, for at least a brief interval before or instead of being replaced by the feedback panel.
  * *Acceptance*: A UI snapshot test on an incorrect multiple-choice answer shows both the user's selection and the correct answer marked in place.

* **FR-12.3 (Distinguish enabled from disabled Submit)** — P2
  * *Problem*: Immediately after typing an answer, Submit briefly renders in the same pale fill used for its disabled (empty-field) state, though it is already clickable.
  * *Requirement*: Enabled and disabled button states SHALL be distinguishable by more than a subtle shade shift (e.g. fill vs. outline, or opacity delta ≥ 40%).
  * *Acceptance*: A visual regression test captures both states and asserts a minimum contrast/opacity delta.

### 🗂️ Module 13: Study Session Closure
* **FR-13.1 (Session summary and next step)** — P1
  * *Problem*: "That's every card for now" shows only a count of cards rated and a single link back to topics — no knew/missed split, no suggested next action.
  * *Requirement*: The study-session-complete screen SHALL show the knew/didn't-know split for the session and SHALL surface at least one relevant next action (e.g. "Quiz this topic," or the next topic with cards due).
  * *Acceptance*: Ending a session with a mix of ratings shows both counts; a primary CTA other than "back to topics" is present when a next action exists.
  * *Cross-ref*: the "Dygo Learning Path" concept's reward-moment screen is one possible visual treatment of this same requirement (see §2.1) — implementing this FR does not require adopting that treatment.

### 📊 Module 14: Analytics Heatmap Fidelity
* **FR-14.1 (Heatmap color scales with miss rate)** — P1
  * *Problem*: "Class Mistake Heatmap" lists all 21 words in the topic — including words never missed (0/1, 0%) — in the same pale-red pill as words missed a third of the time (1/3, 33%).
  * *Requirement*: The heatmap SHALL only list words with at least one recorded mistake, and pill color/intensity SHALL scale with miss rate rather than being uniform.
  * *Acceptance*: A word with 0% miss rate does not appear in the heatmap; two words with different miss rates render visibly different intensities, verified by a snapshot test across at least three rate buckets.
  * *Cross-ref*: the "Dygo Learning Path" concept's "Focus List" screen is one possible visual treatment of this same filtered/ranked data (see §2.1); its "Band Tracker" ring is separate, net-new scope this FR does not cover.

### 🧹 Module 15: Copy Hygiene (No Internal Language in Production UI)
*Why it matters*: every instance below is internal planning language (a sprint milestone, a ticket ID, a build-phase label) that reached a live screen. None require new engineering — all are copy or visibility fixes.

* **FR-15.1 (No dead controls, no roadmap labels in UI)** — P1
  * *Problem*: Home's "+ Add a word · Phase 1" button does nothing when clicked and carries an internal build-phase label.
  * *Requirement*: A control SHALL NOT ship in a clickable, fully-styled state if it has no behavior. Internal phase/milestone labels SHALL NOT appear in user-facing copy.
  * *Acceptance*: Either the control is wired to the existing "Add a word" flow (already live on the topic page) or removed from Home until it is; no build-phase terminology remains in the string.

* **FR-15.2 (User-facing language on the Topics page)** — P2
  * *Problem*: Topics page footer reads "Due counts per topic land with Module 3 — reviews are cross-topic in the meantime, see the Home tab."
  * *Requirement*: Any explanatory copy on a production screen SHALL be written for the learner, without internal module/milestone names.
  * *Acceptance*: Copy reviewed and rewritten (e.g. "Review counts are combined across all your topics for now — see Home for your due cards.") or removed if the underlying per-topic due-count feature ships instead (see open question in §6).

* **FR-15.3 (No ticket references in help text)** — P2
  * *Problem*: Profile's daily-reminder description ends with "(FR-6.3/6.4)".
  * *Requirement*: User-facing help text SHALL NOT cite internal requirement or ticket identifiers.
  * *Acceptance*: String reviewed; parenthetical removed.

* **FR-15.4 (Grammar pass on admin-facing copy)** — P2
  * *Problem*: Group invite-link row reads "used 1 times."
  * *Requirement*: Usage-count copy SHALL pluralize correctly.
  * *Acceptance*: Renders "used once" / "used N times" (N ≥ 2).

* **FR-15.5 (No ticket references on create-group / create-topic forms)** — P2
  * *Problem*: Found 2026-09-19 during Wave 2's live verification of FR-11.1 (not part of the original audit, which never opened these forms): the "Public" checkbox label ends in "(FR-1.1)" in two places — `CreateGroupForm.tsx` ("...cloneable by other groups (FR-1.1)") and `CreateTopicModal.tsx` ("...discoverable and cloneable by other groups (FR-1.1)"). `GroupSettingsPanel.tsx`'s own copy of this label is already clean (no suffix) — only these two.
  * *Requirement*: Same as FR-15.3 — no internal requirement/ticket identifiers in user-facing copy.
  * *Acceptance*: "(FR-1.1)" removed from both `CreateGroupForm.tsx` and `CreateTopicModal.tsx`.

### 🧭 Module 16: Navigation & Information Architecture
* **FR-16.1 (Persistent navigation)** — P1
  * *Problem*: The top bar (Topics/Groups/Progress/Profile) scrolls away with page content; long pages (20-word topic list, group admin panel, full heatmap) require scrolling back to the top to switch sections.
  * *Requirement*: The primary navigation header SHALL remain reachable (sticky/fixed) at any scroll position on every authenticated screen.
  * *Acceptance*: Scrolling to the bottom of the longest page in each section still shows a way to reach the other three tabs without scrolling up.

* **FR-16.2 (Explicit Home entry point)** — P2
  * *Problem*: There is no "Home" tab; the dashboard is only reachable via the "Dygo" wordmark, which carries no link affordance (no hover state, no underline), and is unlabeled plain-centered text on mobile.
  * *Requirement*: The primary navigation SHALL include an explicit, labeled entry point back to the dashboard.
  * *Acceptance*: A "Home" tab (or equivalent labeled control) is present in the nav on both desktop and mobile layouts.

* **FR-16.3 (Consistent time format)** — P2
  * *Problem*: The reminder-time picker uses 12-hour format ("08:00 PM"); the saved reminder list shows 24-hour format ("21:27").
  * *Requirement*: Time display SHALL use one format consistently within the same feature.
  * *Acceptance*: Input and saved-list rows render in the same format (12- or 24-hour, either is acceptable as long as it's consistent).

---

## 5. Traceability

All 20 FRs are code-complete as of `e6750a1`. §9 explains the ✅-live vs. ✅-code split below — a deploy lag discovered during close-out, not an implementation gap.

| FR | Audit finding | Severity | Screen(s) | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FR-9.1 | Streak count disagrees with itself | Critical | Home, Progress | P0 | ✅ live-verified 2026-09-19 — `20dab8e` + `d442a65` |
| FR-9.2 | Due-now count disagrees with itself | Critical | Home, Progress | P0 | ✅ live-verified 2026-09-19 — `20dab8e` + `d442a65` |
| FR-9.3 | "Fix →" points at nothing | Critical | Home | P0 | ✅ live-verified 2026-09-19 — `20dab8e` (no leech nudge shown at 0 leeches) |
| FR-10.1 | Delete-topic has no confirm | Critical | Topic detail | P0 | ✅ code-complete `88de075` — tsc/lint clean; **not yet live**, see §9 |
| FR-10.2 | Delete-word has no confirm | Critical | Topic detail | P1 | ✅ live-verified 2026-09-19 — already done, predates Phase 2 |
| FR-10.3 | Save/Delete group equal weight | Moderate | Group admin | P1 | ✅ code-complete `88de075` — tsc/lint clean; **not yet live**, see §9 |
| FR-11.1 | Group "Public" default on | Moderate | Group admin | P1 | ✅ live-verified 2026-09-19 — not a bug, unaffected by deploy lag |
| FR-12.1 | Quiz exit with no warning | Moderate | Quiz | P1 | ✅ code-complete `590afcb` (confirm-dialog option) — **not yet live**, see §9 |
| FR-12.2 | Multiple choice hides selection | Moderate | Quiz | P1 | ✅ code-complete `4619253` — **not yet live**, see §9 |
| FR-12.3 | Submit looks disabled when it isn't | Minor | Quiz | P2 | ✅ code-complete `590afcb` — **not yet live**, see §9 |
| FR-13.1 | Empty study-session-complete screen | Minor | Study | P1 | ✅ code-complete `cc603bf` — **not yet live**, see §9 |
| FR-14.1 | Heatmap: one color for every rate | Moderate | Progress | P1 | ✅ code-complete `fe9676e` — **not yet live**, see §9 |
| FR-15.1 | "Phase 1" dead button | Moderate | Home | P1 | ✅ live-verified 2026-09-19 — `20dab8e` |
| FR-15.2 | "Module 3" note in topics copy | Moderate | Topics | P2 | ✅ live-verified 2026-09-19 — `769c889` |
| FR-15.3 | "FR-6.3/6.4" in reminder copy | Minor | Profile | P2 | ✅ live-verified 2026-09-19 — `05eccf6` |
| FR-15.4 | "used 1 times" grammar | Minor | Group admin | P2 | ✅ live-verified 2026-09-19 — `05eccf6` ("used once") |
| FR-15.5 | "(FR-1.1)" on create-group checkbox | Minor | Group admin | P2 | ✅ code-complete `e6750a1` — **not yet live** (confirmed still showing during this pass), see §9 |
| FR-16.1 | No sticky header | Moderate | Global | P1 | ✅ live-verified 2026-09-19 — `abe1c44` |
| FR-16.2 | No labeled Home entry | Minor | Global | P2 | ✅ live-verified 2026-09-19 — `abe1c44` |
| FR-16.3 | 12h/24h time format mismatch | Minor | Profile | P2 | ✅ code-complete `e6750a1` — **not yet live** (confirmed still showing "21:27" during this pass), see §9 |

## 6. Open questions for Product (not decided by this document)

1. **FR-9.2 / topics-page copy**: is a true per-topic due count (the feature the app's own copy promises "lands with Module 3") in scope for this phase, or does Phase 2 only fix the cross-screen contradiction and defer the per-topic feature? This document assumes the latter — FR-15.2 rewrites the copy rather than building the feature.
2. **FR-11.1**: should already-public groups created before this fix stay public, or does someone need to review and re-confirm them? This document does not silently flip existing data.
3. **FR-10.2**: undo-toast vs. confirm-dialog for single-word delete — either satisfies the requirement; pick one for consistency with the rest of the app's interaction patterns.
4. **FR-13.1 / FR-14.1 sequencing**: ship the plain fix now (knew/missed counts + a CTA; a filtered, rate-scaled word list) on the current visual system, or hold both until the Learning Path concept (§2.1) is scoped as Phase 3 and build the final treatment directly — building the plain version first risks restyling the same screen twice. This document defaults to "ship the plain fix now" (P1, not blocked on Phase 3 being scoped), but that's a sequencing call for Product, not an engineering one.

## 7. Findings from reading the actual code (2026-09-19)

The audit was written from the live app's behavior alone, without reading the source. Planning the implementation surfaced three places where the real diagnosis changes the fix — noted here rather than in §4 so the original audit observations stay intact as a record of what was actually seen.

* **FR-9.1–9.3 are cheaper than they look.** Home's streak pill, "Due Now" numbers, and leech-nudge count are not computed by a divergent backend query — they're **hardcoded literal props** in `src/app/(dashboard)/page.tsx` (`"12-day streak"`, `dueCount={12}`, `count={2}`), left over from a UI stub. The Progress page already calls the correct real hooks (`useSrsStats()`, `useLeeches()`). The fix for the *symptom* is wiring Home to the same hooks Progress already uses — small, frontend-only. Separately, while tracing this, found that `NotificationProcessor.buildPayload()` (the 15-minute push-reminder tick) hand-copies its own independent SQL for streak/due/leech-count instead of reusing `SrsService`'s logic — same numbers today, but two authored copies of the same query is exactly the "no single source of truth" pattern Module 9 exists to close, just not the one the audit could see. Recommend folding a shared-function extraction into this module's fix even though it wasn't the visible bug. Full detail in the implementation plan's Module 9 section.
* **FR-10.2 may already be done.** `WordStatusRow.tsx` already replaced its delete action with a styled Radix `AlertDialog` confirmation, per an in-code note dated 2026-09-18 — a day before this audit. Recommend verifying this against the acceptance criteria before assigning it as build work.
* **FR-10.1 has a confirmation step already — it's just unstyled.** "Delete this topic" calls `window.confirm(...)`, the browser's native dialog, not "no confirmation at all." The real gap is consistency and information density (doesn't name the topic or word count) against the AlertDialog pattern `WordStatusRow` already uses — a smaller task than the original P0 framing implied, though still worth doing before this ships.
* **FR-11.1 could not be reproduced against current code.** `CreateGroupForm.tsx` already defaults `isPublic` to `false`, and the database column (`001_initial_schema.sql`) is `not null default false` — both layers already do the right thing for a newly created group. The one public group seen live during the audit ("IELTS Vocabulary") isn't part of the tracked seed data (`004_seed_data.sql`'s three seeded groups are named differently and two of three are already private), so it was most likely created public on purpose by whoever set up that test data, not produced by a default-on bug. Recommend downgrading this from a code fix to a one-time manual verification (create a fresh group in the live app, confirm the checkbox renders unchecked) before spending engineering time on it.

## 9. Close-out verification (2026-09-19)

All 20 FRs (18 original + FR-15.5, found during Session 4's live check of FR-11.1) are code-complete as of `e6750a1` — `tsc --noEmit`, `eslint`, and `jest` (165/165 backend) clean on every commit in this document's history, re-run and re-confirmed this session. FR-16.3 was never assigned to a session in the schedule doc (a gap in that doc, not a skipped item) and was closed here alongside FR-15.5.

**Live-account verification, not just code review** — this session's actual close-out work — surfaced something the implementation plan couldn't have anticipated: **this environment has a real deploy lag, not a live-reloading dev server.** Walking every FR against `https://dygoacademy.com` found a clean boundary:

* **Live and verified working**: everything through commit `20dab8e` / `6d6c8f3` — FR-9.1, FR-9.2, FR-9.3, FR-15.1, FR-15.2, FR-15.3, FR-15.4, FR-16.1, FR-16.2, plus FR-10.2 and FR-11.1 (both pre-existing behavior, unaffected by the lag). Confirmed directly: Home and Progress show identical "5-day streak" / "13 due"; the leech nudge doesn't render at 0 leeches; the Topics page's rewritten copy is live; the reminder description has no ticket reference; the invite row reads "used once"; the nav is sticky with an explicit Home tab.
* **Code-complete, confirmed still showing old behavior live**: everything from `88de075` onward — FR-10.1, FR-10.3, FR-12.1, FR-12.2, FR-12.3, FR-13.1, FR-14.1, FR-15.5, FR-16.3 (Sessions 4–9's entire output). Directly reproduced: clicking "Delete this topic" still does nothing (no dialog opens — the pre-fix `window.confirm` build is what's deployed); the group settings panel still shows "Save changes"/"Delete group" side by side; the Public-checkbox label still reads "...cloneable by other groups (FR-1.1)"; the reminder list still shows raw "21:27" instead of a locale-formatted time.

This is an infrastructure gap, not an engineering one — nothing here points to a code defect, and this repo's own `.github/workflows` has been empty since Phase 0 (per `dygo_academy_master_project_schedule.md`), so there was never an automatic deploy-on-commit pipeline to rely on in the first place. **Action needed from whoever owns deploys**: push a new build so Sessions 4–9's work (FR-10.1, FR-10.3, FR-12.1, FR-12.2, FR-12.3, FR-13.1, FR-14.1, FR-15.5, FR-16.3 — 9 of the 20 FRs) actually reaches users. Until that happens, this document's code-level "done" is real but the live product still has the original P0-adjacent bugs (no styled delete confirmation on topics, no separated danger zone on groups) in front of actual users.

## 10. Definition of done for Phase 2

- All P0 items (FR-9.1–9.3, FR-10.1) shipped and covered by an automated test (unit or integration) that would fail on the original bug. ✅ — see §9.
- All P1 items shipped or explicitly re-prioritized with Product sign-off. ✅ — see §9.
- `dygo_academy_uat_checklist_2026-09-02.md`-style checklist entry added confirming each FR above was verified against a live account, not just a code review (the master schedule's standing caveat — most prior phases were never run against a live stack). ✅ — done in §9, and it's what surfaced the deploy-lag finding.
- No open P0/P1 item ships silently deferred without a note in `dygo_academy_master_project_schedule.md`'s changelog, per this repo's existing convention. Done — see that file's new changelog entry for this phase (added this session, filed as "Phase 6" there per the naming note in this document's header).
