# A1c: missions done, words still thirsty — implementation plan

Status: design approved by Dylan on 2026-10-18. The boards are on the Dygo Word Garden canvas (Garden page): `AdultTodayDone.dc.html` (EN) and `AdultTodayDoneVi.dc.html` (VI). Copies of both are in `docs/design/garden/source/`.
Repo: `com.dygoacademy.english`. Frontend only. No backend change and no migration.

## Why

A real learner (Ann, day 1) finished all 3 daily missions and asked "where do I continue?".
- Her Garden page showed A1 with 3 Done rows and nothing to tap.
- A1b All watered, which has the "Want a little more?" list, only shows when `due_now === 0`. That is `showAllWatered` in `src/components/garden/live/data.ts`.
- Words planted today come back due a few minutes later, so new learners almost never see A1b.

## What to build

When **all of today's missions are done** (`missions.goldenBloom || every mission done`) **and words are still due** (`due_now > 0`), A1 stays as it is today and gets the "Want a little more?" section under the missions card:

1. **Water N thirsty words**: subtitle "Bonus · about 1 min". It links to Review with due words only, like the A1 Water mission. N is `due_now`. The row shows only while `due_now > 0`.
2. **Plant 5 new words**: subtitle "From {bed}". It uses the same rule and link as A1b: `extraPlantBed` + `plantAllowance` + `GARDEN_ROUTES.plant`, and it is hidden when there is no bed or the allowance is 0.
3. **Say 3 sentences**: subtitle "About 2 min". It uses A1b's `speakHref` (`GARDEN_ROUTES.sounds`).

On A1c the A1b quiz row ("Quiz a bed") is left out so the screen fits. A1b itself keeps all three of its rows.

Unchanged:
- A1b All watered still shows when the missions are done and nothing is due.
- A1 with open missions looks exactly as today.
- The daily missions stay sized from the Profile daily goal.

## Steps

1. **Design commit (CLAUDE.md rule 13).**
   - `docs/design/garden/source/AdultTodayDone.dc.html` and `AdultTodayDoneVi.dc.html` are already in place. Add `tools/render.js` jobs `A1c-today-done` (en) and `A1c-today-done-vi` (vi).
   - Export `reference/A1c-today-done(-vi).png` + `.html` with `node render.js ../reference A1c`. Never edit PNGs by hand.
   - Add a row to `docs/design/garden/CHANGELOG.md`.
   - Commit these files on their own.
2. **Shared list component.** Move the "Want a little more?" heading and list out of `AllWateredScreen.tsx` into a small props-only component, for example `garden/MoreList.tsx`. It takes rows of `{ key, href, icon, title, meta }`. Use it in both A1b and A1c so they stay identical. Add the water icon well in the water tone (`bg-water-soft`, water drop) to match the board.
3. **TodaysGardenScreen.** Add an optional `more` prop (rows, or null). When it is set, render the list under the missions card, with margins and gap taken from `reference/A1c-today-done.html`. The board drops the "Tomorrow … words ripen" reminder line when the list shows, so match that.
4. **HomeLive / data.ts.**
   - Add `showMoreOnHome(stats, missions)`: true when all missions are done and `due_now > 0`. It is false when the missions call failed.
   - Build the rows with the same helpers A1b uses, adding the water row first.
   - Keep `showAllWatered` as it is.
5. **Copy (EN / VI / ZH)**, reusing the A1b keys where the text is the same:
   - EN: "Water {count} thirsty words" (with a plural form for 1), "Bonus · about 1 min".
   - VI: "Tưới {count} từ đang khát", "Thêm · khoảng 1 phút".
   - ZH: write the equivalent.
6. **Tests.**
   - `data.test.ts`: `showMoreOnHome` with (done + due → true), (done + nothing due → false, A1b instead), (open mission → false), (missions undefined → false).
   - `screens.test.tsx`: A1 with `more` renders the 3 rows in order with the right links; it is hidden without `more`; the water row is absent when the count is 0.
   - Run `npx tsc --noEmit -p .`, lint (`ESLINT_USE_FLAT_CONFIG=false npx eslint --no-eslintrc -c .eslintrc.json src/components/garden`) and `npx vitest run`. Compare against the existing baseline failures, not against zero.
7. **Check against the boards.** Take a screenshot of A1 in this state at 390×844 in en-US and vi-VN and compare it with `reference/A1c-today-done(-vi).png`. Only font anti-aliasing may differ.
8. Add a `Change Log.md` entry, commit, and **stop**. Deploy only when Dylan asks (`deploy/request.md`).

## Out of scope (separate proposal)

- The "Week done, keep growing" section on This week (`AdultMissionsAllDone.dc.html` on the Missions page) is not part of this build.
- The "Water: Done while words are thirsty" wording is not part of this build. The Water mission's size is fixed at the day's first read; the bonus row covers the rest.
