# Loading screen: LD1 at app start, LD3 for slow loads — implementation plan (for Claude Code)

Date: 2026-10-13 · Owner: Dylan · Design: canvas page "Loading" (boards `LoadingSprout`, `LoadingBee`; `LoadingRain` is **not used**)
Design changelog: `docs/design/garden/CHANGELOG.md`, entry "2026-10-13 — Loading screen: LD1 Seed to sprout + LD3 Bee's flight" (*Approved*).
Dylan's rule: keep Dygo simple and clear.

## What changes

| | Today (built) | New |
|---|---|---|
| First load after the app opens | `LiveLoading`: grey spinner + "Loading your garden…" | **LD1 Seed to sprout**: the logo grows (seed → stem → leaves → the bee lands), "dygo", rotating line |
| A load that takes long | Spinner forever | **LD3 Bee's flight**: the bee circles "dygo" + a "While you wait" word card |
| After 10 s | Spinner forever | LD3 with "Still loading… check your connection" + Try again |
| Tab-to-tab navigation | `(garden)/loading.tsx` skeleton + tab bar + `NavProgress` (built today, `c18a42b`, `9fb6325`, `f050396`) | **No change.** Only after 2.5 s does LD3 take over (see Flow) |

Out of scope: the root `src/app/loading.tsx` (landing / auth pages), the landing page, the kids app, native splash screens (there is no native shell; the PWA is plain Next.js).

## Flow (timings are the spec)

```
App start  (first loader since the page loaded)
  0 ms       cream background only (no art yet, so fast loads never flash)
  400 ms     LD1 fades in (200 ms)
  4 000 ms   still loading → cross-fade to LD3 (300 ms), word card slides up 300 ms later
  10 000 ms  LD3 slow state: line → "Still loading… check your connection", "Try again" link appears

Later loads in the same session
  0–2 500 ms whatever shows today (spinner from LiveLoading, or the tab skeleton)
  2 500 ms   still loading → LD3 fades in over it
  10 000 ms  LD3 slow state
```

- **No minimum time.** When data arrives, the loader goes away at once; we never hold a ready screen back.
- "App start" = the first `GardenLoader` mounted in this page load (also true right after sign-in or after onboarding "Ready", because those are full page loads or first mounts). Keep it in a module-level flag: `let booted = false;` set to `true` in the cleanup of the first loader that unmounts. Server render and the first client render both see `false`, so no hydration mismatch.
- The 400 ms delay is done in CSS (`animation-delay` with `both` fill), not JS, so it also holds for the server-rendered HTML before hydration. The later phase changes (4 s, 2.5 s, 10 s) are JS timers in a `useEffect` and are written to `data-phase` on the root (`sprout` | `bee` | `slow`) so tests can read them.

## 1 · Component: `src/components/garden/loader/`

- `GardenLoader.tsx` (`'use client'`): `{ onRetry?: () => void }`.
  - Root: `role="status"`, `aria-live="polite"`, `aria-busy="true"`, full screen (`min-h-screen-dvh`, `bg-bg`, centred column, `max-w-[560px]` like the screens; on iPad it's the same centred column).
  - `<span className="sr-only">` with `screens.live.loading` ("Loading your garden…"); changes once to `loader.slow` in the slow phase. The rotating lines and art are `aria-hidden`.
  - Phase `sprout` renders `<SproutArt/>`, phase `bee` / `slow` renders `<BeeOrbitArt/>` + `<WaitWordCard/>`. Cross-fade: keep the old art mounted for 300 ms with an opacity transition, or just fade the new one in; both are fine.
  - Slow phase: the line is `loader.slow` (not rotating) and a text button `screens.live.retry` under it (44 px tall, forest text, no fill). Tap → `onRetry?.()` or, if no `onRetry`, `window.location.reload()`.
- `SproutArt.tsx`: the LD1 SVG (viewBox 0 0 100 100 drawn at 240 × 240). Stem `M50 79 V44`, left leaf `M50 64 C36 64 26 54 29 41 C42 40 50 50 50 64 Z` (#24463A), right leaf `M50 52 C64 51 74 41 71 27 C58 27 50 37 50 52 Z` (#3D6B57), soil ellipse (50,80, 22 × 4.5, #E3DDD0), seed. Then "dygo" (Fraunces 600, 38 px, forest) and the rotating line (15 px, muted).
- `BeeOrbitArt.tsx`: 390 × 320 SVG; dotted orbit path `M195 82 C 280 80, 322 112, 322 150 C 322 190, 280 220, 195 218 C 110 220, 68 190, 68 150 C 68 112, 110 84, 195 82` (#C9BFA8, 2 px, dash 3 7, moving), four pollen dots (#F2C744) at top/right/bottom/left that glow as the bee passes, "dygo" (Fraunces 600, 40 px) in the middle, the bee flying the path in 4.2 s (CSS `offset-path`; it flips to face left on the bottom half).
- **Bee:** use the existing `src/components/garden/Bee.tsx` (same bee as Topics / Pronunciation). Wings flap with a 0.16 s scaleY on a wrapper `<g>`, not on the wing ellipses themselves (they carry their own rotate). Bee at 0.8 × on LD1 (landing on the right leaf tip), 1 × on LD3.
- `WaitWordCard.tsx`: white card, `#E3DDD0` border, radius 20, padding 18 × 20, 24 px from the sides, 56 px from the bottom (+ safe-area inset). Label `loader.wait` (12 px, 700, uppercase, tracking .1em, muted) · word (Fraunces 600, 26 px, forest, `lang="en"`) + `/IPA/ · pos` (15 px muted) · meaning + example (15 px). Pick a random word **after mount** (`useEffect`), so server and client match; the card only appears in the `bee` phase anyway.
- Exact sizes, colours, keyframes and timings: copy from `docs/design/garden/source/LoadingSprout.dc.html` and `LoadingBee.dc.html` (the CSS in `<helmet>`). Both boards use a `lang` tweak (`en` / `vi`) instead of separate `…Vi` files.

### Animation CSS

Put the keyframes in `globals.css` under the garden section, all prefixed `dg-ld-` (seed drop, soil squash, stem draw by `stroke-dashoffset`, leaf pop with `cubic-bezier(.3,1.5,.5,1)`, bee fly-in, sway, fade-out at 92–100 %, line rotation 7.5 s with 3 spans, orbit, pollen glow, card slide). Use `transform-box: fill-box` **only on animated elements** (a global `svg *` rule moves the bee's wings).

### Reduced motion (`motion-reduce:` / `@media (prefers-reduced-motion: reduce)`)

All animations off. Base styles are the final frame: LD1 = full sprout with the bee landed; LD3 = bee at the top of its path, card shown; only the first line shows. Phase changes still happen (they're not motion) but without the cross-fade.

## 2 · Wire it in

- `src/components/garden/live/LiveState.tsx`: `LiveLoading` becomes a thin wrapper: `export function LiveLoading({ onRetry }: { onRetry?: () => void } = {}) { return <GardenLoader onRetry={onRetry} />; }`. Keeping the name means the ~15 Live screens (`HomeLive`, `ReviewLive`, `QuizLive`, `TopicBedLive`, `OnboardReadyLive`, `JoinLive`, …) get it with no change. Where a screen already has a `refetch`, pass it as `onRetry` (nice to have, not required).
- **Later loads (not app start):** `GardenLoader` with `booted === true` renders today's spinner + "Loading your garden…" (the old `LiveLoading` markup, moved inside) until 2.5 s, then LD3. So nothing changes for normal fast screens.
- `(garden)/loading.tsx` (route skeleton with tab bar): keep it. Add the same 2.5 s → LD3 rule inside it only if it's simple (wrap the skeleton with a timer that swaps to `<GardenLoader/>` in phase `bee`); otherwise leave it and note it in `QUESTIONS.md`.
- `LiveError` is unchanged.

## 3 · Messages (`screens.loader`), EN · VI (ZH: write to match)

| key | EN | VI |
|---|---|---|
| sprout.1 / 2 / 3 | Watering your garden… / Waking the bees… / Ripening today's words… | Đang tưới khu vườn… / Đang gọi đàn ong dậy… / Đang ủ chín từ hôm nay… |
| bee.1 / 2 / 3 | Pollinating your words… / Watering your garden… / Almost ready… | Đang thụ phấn cho từ vựng… / Đang tưới khu vườn… / Sắp xong rồi… |
| slow | Still loading… check your connection | Vẫn đang tải… kiểm tra kết nối mạng |
| wait | While you wait | Trong lúc chờ |

Retry button: reuse `screens.live.retry` ("Try again" / VI as today).

**Words** (`screens.loader.words`, 8 items; the word, IPA and example stay English in every language; only the meaning is translated):

| word | IPA · pos | EN meaning | VI meaning | example |
|---|---|---|---|---|
| bloom | /bluːm/ · verb | to produce flowers; to grow and do well | nở hoa; phát triển tốt | Her English bloomed in a year. |
| sprout | /spraʊt/ · verb | to start to grow | nảy mầm; mọc lên | New ideas sprout when you read widely. |
| thrive | /θraɪv/ · verb | to grow or develop very well | phát triển mạnh | Plants thrive with regular water. |
| nurture | /ˈnɜːtʃə/ · verb | to help something grow and develop | nuôi dưỡng, vun đắp | Good teachers nurture curiosity. |
| harvest | /ˈhɑːvɪst/ · noun | the crops gathered; the result of work | mùa gặt; thành quả | This year's harvest was excellent. |
| flourish | /ˈflʌrɪʃ/ · verb | to be very successful; to grow well | hưng thịnh; phát triển tốt | Small businesses flourish here. |
| cultivate | /ˈkʌltɪveɪt/ · verb | to develop a skill or habit | trau dồi; vun đắp | Cultivate a habit of daily reading. |
| resilient | /rɪˈzɪliənt/ · adjective | able to recover quickly from difficulty | kiên cường, bền bỉ | Resilient learners keep going after mistakes. |

The meaning follows the **app language** (the learner's meaning language isn't loaded yet at this point). Store `pos` as a key (`verb` / `noun` / `adjective`) and translate it like the other screens do.

## 4 · References and tests

- References are already in `docs/design/garden/reference/`: `LD1-loading-sprout(-vi)`, `LD3-loading-bee(-vi)` (still frames; jobs in `tools/render.js`). Add a reference page for each in `(garden-reference)/garden/_reference/[name]` showing the still state (`motion-reduce` frame, phase forced, word = bloom), add the four names to `NAMES` in `scripts/garden-diff.mjs`, then `npm run garden:diff -- --only LD1-loading-sprout,LD3-loading-bee` ≤ 0.5 % EN + VI.
- `vitest` (fake timers; compare against HEAD and count only new failures):
  - first loader: `data-phase="sprout"`, then `bee` at 4 s, `slow` at 10 s;
  - a second loader after the first unmounted: spinner until 2.5 s, then `bee`, `slow` at 10 s;
  - unmount clears all timers (no state update after unmount);
  - slow phase shows Try again; tap calls `onRetry`, or `window.location.reload` when none;
  - the word card renders a word from the list, with `lang="en"` on the word;
  - screen-reader text is "Loading your garden…" and switches to the slow text once; rotating lines are `aria-hidden`;
  - `LiveLoading` still renders (existing Live screen tests keep passing).
- `tsc --noEmit`, `npm run lint`.

## 5 · Done when

- `Change Log.md` entry; in `docs/design/garden/CHANGELOG.md` set the LD1 / LD3 rows and the 2026-10-13 entry to **Built** with the commit.
- Check by hand on a slow network (Chrome DevTools "Slow 4G") on iPhone width and iPad: app start shows LD1, then LD3 after 4 s; a tab switch shows the skeleton + tab bar as today; OS reduced motion shows still frames.
- Deploy UAT via `deploy/request.md`.
- One commit, after a "Design" commit for the new sources, references, render jobs and changelog entry (already written into the repo, not committed yet).
