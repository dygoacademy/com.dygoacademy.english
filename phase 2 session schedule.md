# 🗓️ Dygo Academy — Phase 2 Session Schedule (Token-Budgeted)
**Document Version**: 1.0
**Reads with**: `phase 2.md` (the 18 FRs — what and why) and `phase 2 implementation plan.md` (the 5 PR waves — how). This document only re-slices those two into small, self-contained Claude sessions, each sized to fit comfortably in one conversation's context/token budget instead of one long session trying to do a whole wave (or all of Phase 2) at once.

**Before Session 1**: there are currently ~250 uncommitted changes sitting in the repo (nothing committed since `10d131e "release v2"`, 2026-09-16) — including all of this live session's own recent work (word delete, quiz feedback, button redesigns) and, separately, work from at least one other process (the `exampleSentence` quiz feature, edits to `groups.service.ts`/`storage.service.ts`/`configuration.ts`). Recommend reviewing and committing what's there in logical chunks *before* starting Session 1 — building eight more sessions of changes on top of an uncommitted 250-file diff makes it much harder to tell what any one session actually changed, and risks losing work if something goes wrong on disk.

Each session below lists: scope, files, a paste-ready opening prompt (references the plan docs by FR id rather than re-explaining them, to keep the session's first message cheap), and a done-check. Run `cd com.dygoacademy.backend && npm test && npm run lint` and `cd com.dygoacademy.frontend && npx tsc --noEmit && npm run lint` clean *before* Session 1 and again after *every* session — catching a regression one session late is far cheaper than catching it three sessions late.

---

## Session 1 — Wave 0: copy & nav warm-up
**Covers**: FR-16.1, FR-16.2, FR-15.2, FR-15.3, FR-15.4
**Size**: smallest session in this schedule — five tiny, independent edits (~2h of work per the implementation plan), safe to batch into one session since none of them touch the same logic.
**Files**: `Navbar.tsx` (sticky header + Home nav entry), topics-page copy, `NotificationSettings.tsx`, groups-admin invite-count copy.

**Opening prompt**:
> Implement Wave 0 from `phase 2 implementation plan.md` (§3): FR-16.1, FR-16.2, FR-15.2, FR-15.3, FR-15.4. Follow the file paths and "Do" steps already written there — grep for the "Module 3" string yourself for FR-15.2 and the `use_count` display code for FR-15.4 since the plan didn't pin exact lines for those two.

**Done-check**: `npx tsc --noEmit && npm run lint` clean; scroll the longest page in each section to confirm nothing sits under the now-sticky header; visually confirm "Home" appears in the nav.

---

## Session 2 — Wave 1a: wire Home to real data (P0)
**Covers**: FR-9.1, FR-9.2, FR-9.3, FR-15.1 (steps 1–4 of the implementation plan's Wave 1)
**Size**: the most important session in this schedule — this is the retention-loop trust bug. Frontend-only, one page plus two small components.
**Files**: `src/app/(dashboard)/page.tsx`, `DueNowCard.tsx`, `LeechNudge.tsx`; reuses `useSrsStats()`/`useLeeches()` (already correct, already used by `analytics/page.tsx`).

**Opening prompt**:
> Implement Wave 1 steps 1–4 from `phase 2 implementation plan.md` (§4): FR-9.1/9.2/9.3/15.1. Home's streak/due/leech numbers are hardcoded literals (`"12-day streak"`, `dueCount={12}`, `count={2}`) — replace with `useSrsStats()`/`useLeeches()`, same as `analytics/page.tsx` already does. Don't do steps 5–6 (the `computeSrsSummary` extraction) yet — that's Session 3.

**Done-check**: open Home and Progress side-by-side on a live account with known due/leech state; confirm identical numbers; confirm the leech nudge is absent at zero leeches and its "Fix →" link opens the same list Progress shows.

---

## Session 3 — Wave 1b: single source of truth for the SRS summary
**Covers**: FR-9.1–9.3's deeper fix (implementation plan §4, steps 5–6) — extracting `computeSrsSummary()` and pointing `notification.processor.ts` at it instead of its own hand-copied SQL.
**Size**: kept separate from Session 2 on purpose — it's a backend refactor with its own test surface, not required to close the *visible* bug, and mixing it into Session 2's diff would make that PR harder to review.
**Files**: `srs.service.ts`, `notification.processor.ts`, `srs.service.spec.ts`, `notification.processor.spec.ts`.

**Opening prompt**:
> Implement Wave 1 steps 5–6 from `phase 2 implementation plan.md` (§4): extract a `computeSrsSummary(queryFn, userId)` function out of `SrsService.stats()`/`findLeeches()`, and point `NotificationProcessor.buildPayload()` at it instead of its own duplicated SQL. Add the regression tests the plan describes — a fixture user should produce identical streak/due/leech numbers whether read via `GET /srs/stats` or the worker's payload builder.

**Done-check**: `npm test` clean in the backend (watch for the same kind of `toEqual` snapshot break this session's own quiz-answer change hit earlier — check any test asserting the worker's exact payload shape).

---

## Session 4 — Wave 2: destructive-action confirmations
**Covers**: FR-10.1 (build), FR-10.3 (build), FR-10.2 + FR-11.1 (verify only, per the plan's own finding that both are likely already correct)
**Files**: `topics/[topicId]/page.tsx` (`handleDelete`), `GroupSettingsPanel.tsx`, reusing the `AlertDialog` pattern from `WordStatusRow.tsx` (built earlier this session).

**Opening prompt**:
> Implement Wave 2 from `phase 2 implementation plan.md` (§5): FR-10.1 and FR-10.3, reusing the `ui/alert-dialog.tsx` `AlertDialog` pattern already shipped in `WordStatusRow.tsx`. Also do the FR-10.2 and FR-11.1 *verification* steps the plan describes (live-account checks, not code) and report the result — don't build anything for those two unless verification finds a real gap.

**Done-check**: topic delete now names the topic + word count before firing; group delete is visually separated from "Save changes" with its own confirm naming roster/topic counts; FR-10.2/FR-11.1 verified live and noted as already-done (or flagged if not).

---

## Session 5 — Wave 3a: quiz exit + submit contrast
**Covers**: FR-12.1, FR-12.3
**Size**: paired because both are small, independent quiz-page tweaks that don't touch the same component as Session 6.
**Files**: `quiz/page.tsx` (the × control), `QuizQuestion.tsx` (Submit button styling).

**Opening prompt**:
> Implement FR-12.1 and FR-12.3 from `phase 2 implementation plan.md` (§6). For FR-12.1, pick Option A (confirm dialog once ≥1 question answered) unless you tell me otherwise — it's the smaller lift; Option B (resume) is the better long-term UX but bigger scope. Note in your summary which one was used.

**Done-check**: exiting a quiz after ≥1 answered question prompts a confirm; exiting at 0 answered does not; enabled vs. disabled Submit is now visually distinct beyond a subtle shade shift.

---

## Session 6 — Wave 3b: show the chosen answer
**Covers**: FR-12.2
**Size**: its own session — restructuring how `QuizQuestion`/`QuizFeedback` hand off state is more involved than the plan's other quiz items and deserves full context rather than sharing a session with Session 5's smaller changes.
**Files**: `QuizQuestion.tsx`, `QuizFeedback.tsx`, `quiz/page.tsx` (`handleSubmit`).

**Opening prompt**:
> Implement FR-12.2 from `phase 2 implementation plan.md` (§6): on a wrong multiple-choice answer, the user's selected option should stay visible and marked (alongside the correct one), not vanish the instant the feedback panel replaces it. Follow the plan's suggested approach — local `selectedOption` state in `QuizQuestion`, and either keep it mounted while showing `result` or merge it with `QuizFeedback`.

**Done-check**: answering a multiple-choice question wrong shows both your pick and the correct answer marked in place, not just a generic panel.

---

## Session 7 — Wave 3c: study session summary
**Covers**: FR-13.1
**Files**: `study/page.tsx` (`handleRate`, the completion screen).

**Opening prompt**:
> Implement FR-13.1 from `phase 2 implementation plan.md` (§6): tally knew/missed during `handleRate` (check `RatingButtons.tsx`'s actual rating values — `AGAIN`/`HARD`/`GOOD`/`EASY` — and tell me which ones you're counting as "knew" before assuming a 2-way split), show both counts on the completion screen, and add one primary CTA beyond "back to topics." Keep it plain/textual per `phase 2.md` §2.1 — no Learning-Path-style reward visuals, that's separately-scoped future work.

**Done-check**: ending a mixed session shows both counts and a CTA other than "back to topics."

---

## Session 8 — Wave 4: analytics heatmap fidelity
**Covers**: FR-14.1
**Size**: fully independent of every other session — can run any time after Session 1, in any order, per the implementation plan's own note.
**Files**: `analytics/page.tsx` (`GroupHeatmapSection`), `useGroupHeatmap.ts` (read-only — no backend change needed, the data's already there per-word).

**Opening prompt**:
> Implement FR-14.1 from `phase 2 implementation plan.md` (§7): filter the heatmap to `failure_rate > 0` only, and replace the fixed destructive-color class with 3–4 intensity buckets scaled by `failure_rate`. A stepped scale is enough — no continuous gradient needed.

**Done-check**: a 0%-miss word no longer appears; two different miss rates render visibly different intensities.

---

## Session 9 — Close-out
**Covers**: `phase 2.md` §8's definition of done.
**Files**: `phase 2.md` (traceability table), `dygo_academy_master_project_schedule.md` (changelog), `dygo_academy_uat_checklist_2026-09-02.md`-style verification notes.

**Opening prompt**:
> Walk `phase 2.md` §4/§5 FR-by-FR against the live app (not just code review) and mark each with ✅ + a one-line note in the traceability table (§5), including the two that turned out to already be done (FR-10.2, FR-11.1). Add a changelog entry to `dygo_academy_master_project_schedule.md` per this repo's existing convention — and per `phase 2.md`'s own naming note, rename this phase to "Phase 6" or "Remediation Pass 1" there so it doesn't collide with the master schedule's own existing "Phase 2" (SRS/Flashcards).

**Done-check**: every P0/P1 FR has a ✅ and a live-account verification note, not just a code review; no item silently deferred without a changelog line.

---

## Notes on sizing

- Sessions 1, 4, 5, 8 are small (well under an hour of Claude's own work each); 2, 3, 6, 7 are the sessions worth giving full, undivided context to.
- Session 8 can be run whenever — it has zero dependency on the others.
- Sessions 2 and 3 should not be merged even though they're both "Wave 1" — the plan itself frames step 5–6 as optional-but-recommended, and past history in this repo (see `dygo_academy_master_project_schedule.md`'s pass-by-pass changelog) shows scope creep within a single pass is exactly what makes it hard to tell later which change fixed which bug.
- If a session's token budget runs out mid-way, the smallest safe stopping point is after a single FR is fully done and tests pass — not mid-FR. `git status`/`git diff` at the start of the *next* session (same habit the 16th pass's own finding recommends) to confirm nothing was left half-done.
