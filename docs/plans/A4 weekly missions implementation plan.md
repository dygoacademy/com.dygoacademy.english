# A4 This week: 3 weekly missions — implementation plan (for Claude Code)

Date: 2026-10-17 · Owner: Dylan · Design: canvas page "Adult · Missions", boards `AdultMissions(Vi)` (**A4**, redrawn 2026-10-17)
Design changelog: `docs/design/garden/CHANGELOG.md`, entry "2026-10-17 — A4 This week: weekly missions" (*Approved*).
Dylan's rule: keep Dygo simple and clear. **Missions set the goal; practice happens on screens that already exist.** No new practice screen.

## What changes

| | Today (A4 Weekly harvest, built UI-6) | New (A4 This week) |
|---|---|---|
| Header | "Week of …" + "Weekly harvest" | "Week of 12 October · 2 days left" + **"This week"** |
| Top | Dark week card | **Weekly missions card**: 3 missions + reward line |
| Week plants | Big dark card | Same data, smaller (plants 42 px, no subtitle), Golden Bloom seed-pack line kept |
| Road to Band 7 | Card with legend + ETA | Smaller card (number + bar, no legend/ETA row) |
| Rain barrel tile, group tile | 2 tiles | **Removed** (rain barrel = the reward; groups have their own tab) |
| Daily missions | On A1 | **Unchanged**, still on A1 |

## 1 · The three missions (v1 rules)

Week = Monday 00:00 → Sunday 23:59 in the learner's time zone (`profiles.timezone`, same as the daily missions / freezes). Counts start at 0 each Monday; unfinished missions just reset (no penalty, no message).

| key | Title EN / VI | Goal | Counts when | Button → |
|---|---|---|---|---|
| `rescue` | Rescue wilting words / Cứu từ đang héo | 3 words | a **wilting (leech) word is answered right** in the leech drill (`GET /quiz/leech-drill` → existing drill screen, A2 quiz "drill" kind). Each word counts once a week. | the leech drill (`/quiz?drill=leech` or the route the drill already uses) |
| `sentence` | Use it in a sentence / Dùng từ trong câu | 3 sentences | a `speaking_attempts` row this week whose stage is `bloom` or `fruit` (the sentence was accepted). Each item counts once a week. | the sentence speaking flow (SP1), seeded with words planted or watered this week if the session API supports it; otherwise the normal session |
| `sound` | Sound of the week: **th** / Âm của tuần: **th** | 5 words | a `speaking_harvests` row this week (word pollinated, P4 ≥ 80 %) whose word contains the week's sound | the stepping-stones flow (P1) for the next bee word with that sound |

- **No wilting words this week:** swap `rescue` for **"Water 20 words" / "Tưới 20 từ"** (counts reviews from the SRS log this week; button → Review A2), same row layout with the blue water-drop icon, so there are always 3 missions. This is the only fallback.
- **Sound of the week (v1 = rotation, same for everyone):** a fixed list of sounds that Vietnamese learners find hard, one per ISO week: `θ` (th: think), `ð` (th: this), final `t/d` (want, world), final `s/z` (cats, dogs), `ʃ` (she), `v` (very), `r` (right), `l` final (feel). Match a word to the sound with its IPA (`master_lexicon.ipa_uk` / `ipa_us`; for "final" sounds, last phoneme). The chip shows the spelling ("th", "-t/-d", "-s", "sh", "v", "r", "-l") and the example words line shows 3 words from the learner's bee words / beds that have it. **Personal sound (from the learner's own GOP results) is v2**: per-phoneme results aren't stored today (they live only in the check queue), so don't add storage for it in this build; note it in `QUESTIONS.md`.
- If fewer than 5 of the learner's words have the sound, the goal is the number that do (min 3); if fewer than 3, use the next sound in the list.

## 2 · Reward: +1 rain barrel

- All 3 done → +1 streak freeze, once per week, the moment the 3rd finishes (idempotent: a `weekly_missions` row per user + week with `rewarded_at`).
- Today freezes refill to `STREAK_FREEZES_PER_WEEK = 2` every local Monday (`srs.service.ts`). Change the refill to `max(current, 2)` and cap the bonus at **3 held**, so the earned barrel isn't wiped on Monday. If already at 3, the line says "+1 rain barrel" but nothing is added (no error).
- The reward line: "Finish all 3 → **+1 rain barrel** · 0/3"; when done, blue background "All 3 done · **+1 rain barrel** added · 3/3" (copy on the board).

## 3 · Backend

- Migration `weekly_missions`: `user_id`, `week_start date` (local Monday), `sound text`, `goals jsonb` (`{rescue:3, sentence:3, sound:5}` after fallbacks), `rescued_word_ids uuid[]`, `rewarded_at timestamptz null`, PK (`user_id`, `week_start`), RLS own rows.
- `GET /missions/weekly?tz=` (missions controller): creates the week's row on first read (picks the sound, fixes the goals), then returns `{ weekStart, daysLeft, sound: { key, label, examples: string[] }, missions: [{ key, done, goal, count }], rewardEarned, freezes }`. Counts are computed from the existing tables (leech drill answers → record the rescued word id when the drill answer is right; `speaking_attempts`; `speaking_harvests`).
- Rescue counting: in the quiz answer handler for leech-drill items, if the answer is right and the word was a leech, add its id to `rescued_word_ids` for the current week (no duplicates).
- After any counted event (drill answer, sentence attempt, pollination), check whether all 3 are done and grant the freeze (transaction, `rewarded_at is null`).
- jest: week boundaries in Asia/Ho_Chi_Minh and Asia/Singapore; each counter; fallback when no leeches; sound rotation + IPA match + min-goal rule; reward once per week; freeze cap 3 and Monday refill keeps the bonus.

## 4 · Frontend

- `WeeklyHarvestScreen.tsx` → layout of the new A4 board (keep the file/route `/missions`). Copy sizes/colours from `docs/design/garden/source/AdultMissions(Vi).dc.html`:
  - header "Week of {date} · {n} days left" / VI "Tuần từ {d/m} · còn {n} ngày", title "This week" / "Tuần này";
  - missions card (white, radius 22): 3 rows, each = 48 px icon tile (rescue: wilting plant on `#F3EEDD`; sentence: clay mic on `#FBEFE9`; sound: the bee on `#FBF4E4`), title 16/700, sub 12 muted, gold progress bar + "n/goal" (green when done), right: dark pill button (Rescue / Speak / Say · Cứu / Nói / Phát âm) or "Done ✓" with a green tick badge on the icon; whole row is the link;
  - reward line; week plants card (smaller); Road to Band 7 (smaller); tab bar.
- Use the existing `Bee` component for the sound icon; the sound chip = Fraunces on `#FBF4E4`, `lang="en"`.
- Messages `screens.missions.weekly.*` EN / VI (from the board), ZH to match. Remove keys only the rain barrel / group tiles used.
- iPad (iA4): same cards in the existing iPad layout (missions card full width on top); no new iPad board — keep it simple, check by eye.

## 5 · References and tests

- References (already in `docs/design/garden/reference/`, jobs in `tools/render.js`): `A4-weekly-harvest(-vi)` (**updated**: in progress), `A4-weekly-harvest-done(-vi)` (**new**: all done). Reference pages + `garden-diff.mjs` names; `npm run garden:diff -- --only A4-weekly-harvest` ≤ 0.5 % EN + VI.
- vitest: rows render count/goal/done; buttons link to the right routes; reward line both states; fallback mission when no leeches; sound chip + examples; tab bar.
- Backend jest as above; `tsc --noEmit`, lint.

## 6 · Done when

- On UAT with a test learner: answer 3 wilting words right in the drill → Rescue 3/3 ✓; 3 accepted sentences → 3/3 ✓; 5 pollinated "th" words → 5/5 ✓; reward line turns blue and the freeze count goes up by 1 (max 3); next Monday all reset and the bonus barrel is still there.
- `Change Log.md`; A4 row + the 2026-10-17 entry set to **Built**. Deploy UAT via `deploy/request.md`.
- Commits: a "Design" commit for the files already in the working tree (`source/AdultMissions(Vi).dc.html`, the A4 references, render.js jobs, CHANGELOG entry, this plan), then backend + frontend.

Out of scope: personal sound from GOP results (v2), "Catch a word in the wild" and "Friday harvest check" missions (ideas for later), new practice screens.
