# A1b All watered — implementation plan (for Claude Code)

Date: 2026-10-10 · Owner: Dylan · Design: canvas page "Adult · Garden", board A1b `AdultAllWatered` (EN + VI)
Design changelog: `docs/design/garden/CHANGELOG.md`, row A1b and entry "2026-10-10 — A1b All watered: ready to build".
Design files: `docs/design/garden/source/AdultAllWatered(Vi).dc.html` · reference PNGs `docs/design/garden/reference/A1b-all-watered(-vi).png` (render jobs in `tools/render.js`).

> **Gate:** A1b is **Approved** (Dylan, 2026-10-10).

## 1. Today

`/garden` → `HomeLive` → `TodaysGardenScreen` (A1) always, even when nothing is due and all missions are done: the learner sees the normal hero ("N words growing · 0 thirsty") and a missions card where every row is done, with nothing to do next.

## 2. Target behaviour

**When:** render A1b instead of A1 when `due_now === 0` **and** today's missions are all done (`GET /missions/today` → `goldenBloom === true`, or every mission `done`). If the missions call failed, use `due_now === 0` alone. Welcome back (A5) still wins when it applies (it needs something due, so they never clash). Nothing due but a mission still open → A1 (its Next up card already handles that).

**Screen, top to bottom** (copy spacing, sizes, colours and text from the board):

1. **Header** — same component as A1: date, greeting ("Good evening, Minh"), streak pill (the board leaves the pill out; keep it, same as A1).
2. **Hero** — forest card, overline "Your garden", title "All watered today", line "Nothing is thirsty. Your garden is resting." (replaces the legend), sun top-right, a small butterfly (`flutter` animation), the garden plants with no drops (gentle `sway` on flowers). Respect `prefers-reduced-motion`.
3. **Golden Bloom card** — white card: bloom icon on a gold circle (`bloom` animation once), "3 of 3 missions · Golden Bloom grown", second line "Next ripening: tomorrow 7:30 · 14 words" from `ripensTomorrow` (same data as A1's bell line). No reminder set → "Next ripening: tomorrow · 14 words"; nothing ripens tomorrow → hide the second line.
4. **"Want a little more?"** — heading + one white list card with up to three rows (icon in a pale green circle, title, small grey line, chevron), each a link:
   - **Plant 5 new words** · "From {bed}" → `/review?new=5&topic={id}` — the bed with the most seeds (`GET /topics` `seed_count`). Hide the row when no bed has seeds.
   - **Say 3 sentences** · "About 2 min" → `GARDEN_ROUTES.sounds`.
   - **Quiz a bed** · "10 quick questions" → `missionQuizHref(topics)`.
5. **Tab bar** — Garden active.

No "Tomorrow · words ripen" bell line under it (the Golden Bloom card carries it).

## 3. Steps

1. **Rule** — `src/components/garden/live/data.ts`: `showAllWatered(stats, missions)` + unit tests (due 0 + all done → true; due 0 + one open → false; due > 0 → false; missions undefined + due 0 → true). `extraPlantBed(topics)` → `{ id, title } | null` (most `seed_count`, first on a tie) + tests.
2. **Route** — `src/constants/garden.ts`: `plant(count, topicId?)` → `/review?new=N` plus `&topic=id` when given. `review/page.tsx` already reads both `topic` and `new`; check `ReviewLive` passes `topicId` with `newWords` (it does via `useStudySession(topicId, …, newOnly)`), add a test.
3. **Screen** — new `src/components/garden/screens/AllWateredScreen.tsx` (props only, like the others): `date, greeting, name, streakDays, plants, bloom: { done, total }, ripens: { time: ClockTime | null; count } | null, extras: { plant: { bed: string; href } | null; speakHref; quizHref }`. Reuse the A1 header, `HeroGardenCard` (add an optional `subtitle` prop and a `resting` look: sun + butterfly, no legend) and `GardenTabBar`. iPad: same single column centred (`ipad:max-w-[720px]`), like A5.
4. **Live** — `HomeLive.tsx`: after the Welcome back check, `if (showAllWatered(s, missions.data))` → `<AllWateredScreen … />`, else A1.
5. **Messages** — new `screens.allWatered` in `messages/en-US.json`, `vi-VN.json`, `zh-CN.json` (ZH: write to match):
   - `title` "All watered today" · VI "Hôm nay đã tưới xong"
   - `resting` "Nothing is thirsty. Your garden is resting." · VI "Không còn cây nào khát nước. Vườn đang nghỉ ngơi."
   - `bloom` "{done} of {total} missions · Golden Bloom grown" · VI "Xong {done}/{total} nhiệm vụ · Hoa Vàng đã nở"
   - `nextRipening` "Next ripening: tomorrow {time} · {count, plural, one {# word} other {# words}}" · VI "Lần chín tiếp theo: {time} ngày mai · {count} từ"
   - `nextRipeningNoTime` "Next ripening: tomorrow · {count, plural, one {# word} other {# words}}" · VI "Lần chín tiếp theo: ngày mai · {count} từ"
   - `more` "Want a little more?" · VI "Muốn học thêm chút nữa?"
   - `plant` "Plant 5 new words" · VI "Gieo 5 từ mới"; `plantFrom` "From {bed}" · VI "Từ luống {bed}"
   - `speak` "Say 3 sentences" · VI "Nói 3 câu"; `speakTime` "About 2 min" · VI "Khoảng 2 phút"
   - `quiz` "Quiz a bed" · VI "Kiểm tra một luống"; `quizMeta` "10 quick questions" · VI "10 câu hỏi nhanh"
6. **Reference fixture** — `screens/fixtures.ts`: `ALL_WATERED` (Friday 25 September, evening, Minh, 23-day streak, 3/3, tomorrow 7:30 · 14 words, bed "Environment"); `ReferenceScreen.tsx` case `'A1b-all-watered'`; add `A1b-all-watered` to the fixture list and to `scripts/garden-diff.mjs` `NAMES`. Note the board has no streak pill — the diff will show that area; if it's over 0.5 %, ask Dylan whether to add the pill to the board rather than dropping it.
7. **Tests** — `screens.test.tsx`: the three extras with their hrefs, plant row hidden without seeds, ripening line variants; `HomeLive`: due 0 + goldenBloom → A1b, due 0 + open mission → A1. Run `vitest src/components/garden` and compare against HEAD (count only new failures); `tsc --noEmit`.
8. **Check** — `npm run garden:diff -- --only A1b-all-watered` (EN + VI, ≤ 0.5 %); on UAT with a test account that has watered everything and done its missions.
9. **Wrap up** — `Change Log.md` entry; set A1b to **Built** with the commit in `docs/design/garden/CHANGELOG.md` (§2 row + §3 line); deploy UAT by writing `deploy/request.md`.

## 4. Out of scope

- iPad-specific A1b layout (no iPad board yet; the single centred column is enough behind the iPad flag).
- Other empty states (A6c No topics yet, GR1b Not in any group).
