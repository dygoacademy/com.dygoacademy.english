# Loading screen: LD3b replaces LD3 (bee + tab bar, no word card) — implementation plan (for Claude Code)

Date: 2026-10-13 · Owner: Dylan · Design: canvas page "Loading", board `LoadingBeeNav` (**LD3b · Bee's flight · slow loads**)
Design changelog: `docs/design/garden/CHANGELOG.md`, entry "2026-10-13 — Loading: LD3b replaces LD3" (*Approved*).
Builds on what is already built: `ed2165a` … `966516b` (GardenLoader, route + root loading). Read `docs/plans/Loading screen implementation plan.md` for the parts that don't change.

## What changes (Dylan, 2026-10-13)

| | Built now | New |
|---|---|---|
| Bee screen | LD3: full screen, bee 150 px from the top, "While you wait" word card at the bottom | **LD3b**: same bee orbit + rotating line, **no word card**, **tab bar at the bottom** on tab screens |
| Where the bee sits | `mt-[150px]` | Centred in the space above the tab bar (whole screen when there's no tab bar) |
| LD1 Seed to sprout (app start) | Full screen | **No change** (full screen, no tab bar) |
| Timings, 400 ms fade-in, "continue the wait", 10 s slow message + Try again, reduced motion, screen-reader text | as built | **No change** |

LD3 is removed (canvas board deleted; `source/LoadingBee.dc.html` kept for history).

## 1 · GardenLoader (`src/components/garden/loader/GardenLoader.tsx`)

- Bee / slow phases render:
  ```
  <div root: min-h-screen-dvh, flex column, bg-bg>
    <div flex-1, flex column, items-center, justify-center, pb-5>   ← art area
      <BeeOrbitArt/>            (no top margin; the board uses -40 px on the svg)
      line(s) or slow message + Try again   (the board pulls the line up 70 px under the orbit)
    </div>
    {tabBar ? <GardenTabBar active={tabFor(pathname)} /> : null}
  </div>
  ```
  Copy the exact offsets from `docs/design/garden/source/LoadingBeeNav.dc.html` (`margin-top:-40px` on the orbit svg, `margin-top:-70px` on the line), so the art is optically centred above the tab bar.
- **Tab bar rule:** show it in the `bee` and `slow` phases when the path being loaded is a screen that has the tab bar. Add `hasTabBar(pathname)` + `tabFor(pathname)` in one small module (e.g. `loader/tabs.ts`, move `tabFor` there from wherever it lives now). Base the list on the screens that render `GardenTabBar` today: Today's garden (incl. Welcome back, All watered, Tend), Missions / Weekly harvest, Topics + Topic bed, Groups + Group garden, Me / Profile. Not on Review, Quiz, Speak, Pronounce, Join, onboarding (`/welcome/*`), or the sign-in pages. A unit test lists every route either way.
- `usePathname()` gives the path being loaded (the route fallback and the root `loading.tsx` both render while the new URL is already set). In the root `loading.tsx` (sign-in → garden) the same rule applies, so `/garden` gets the tab bar at the bee phase.
- The tab bar is the real `GardenTabBar` (taps work, so the learner can leave a slow screen). On iPad it is whatever `GardenTabBar` already renders (rail / sidebar), so the art area takes the remaining width.
- LD1 (`sprout` phase) stays full screen with no tab bar. When it hands over to LD3b at 4 s, the tab bar appears with the bee (no fade on the tab bar itself; the art keeps `dg-ld-in`).
- Remove the `word` prop and the `<WaitWordCard>`.

## 2 · Remove the word card

- Delete `loader/WaitWordCard.tsx` and `loader/words.ts` and their tests.
- Messages: remove `screens.loader.wait` and `screens.loader.words` (EN, VI, ZH).
- Root `src/app/loading.tsx`: stop sending `components.partOfSpeech` if only the card used it; send what `GardenTabBar` needs instead (its tab labels namespace), so the tab bar has its labels there too.
- `globals.css`: remove the card keyframes (`dg-ld-card` or similar) if nothing else uses them.

## 3 · References and diff

- New references (already in `docs/design/garden/reference/`, jobs in `tools/render.js`): `LD3b-loading-bee-nav` (Garden tab), `LD3b-loading-bee-nav-vi`, `LD3b-loading-bee-nav-topics` (Topics tab active). Still frames: bee at the top of its path, first line only.
- `ReferenceScreen.tsx`: replace the `LD3-loading-bee` case with the three LD3b names (phase pinned to `bee`, pathname/active tab pinned: `/garden` or `/topics`).
- `scripts/garden-diff.mjs`: replace `LD3-loading-bee` with the three LD3b names. `npm run garden:diff -- --only LD1-loading-sprout,LD3b-loading-bee-nav` ≤ 0.5 % EN + VI.
- Delete `reference/LD3-loading-bee.png/.html` and `reference/LD3-loading-bee-vi.png/.html` (no longer diffed). Keep `source/LoadingBee.dc.html`.

## 4 · Tests (vitest; compare against HEAD, count only new failures)

- Bee phase on `/garden`: tab bar shown, Garden active; on `/topics/abc`: Topics active; on `/review`, `/quiz/...`, `/welcome/level`: no tab bar.
- Sprout phase: never a tab bar, even on `/garden`; at 4 s the tab bar appears with the bee.
- Slow phase: tab bar still shown on tab screens; Try again still works.
- No "While you wait" card anywhere (query by text).
- `hasTabBar` table test.
- Existing timing / continue-the-wait / reduced-motion tests keep passing.
- `tsc --noEmit`, lint.

## 5 · Done when

- `Change Log.md` entry; in `docs/design/garden/CHANGELOG.md` set LD3b's row and the "LD3b replaces LD3" entry to **Built** with the commit.
- By hand on "Slow 4G" (iPhone width + iPad): app start shows LD1 full screen, then the bee with the tab bar on `/garden`; switching tab on a slow network shows the bee above the tab bar with the new tab highlighted; Review on a slow network shows the bee full screen (no tab bar); no word card anywhere.
- Deploy UAT via `deploy/request.md`.
- One commit, after a "Design" commit for the files already in the working tree (`source/LoadingBeeNav.dc.html`, the LD3b references, the render.js jobs, the CHANGELOG entry and this plan).
