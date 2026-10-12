# Onboarding: 2 steps (About you → Reminder → All set) — implementation plan (for Claude Code)

Date: 2026-10-12 · Owner: Dylan · Design: canvas page "Adult · Onboarding"
Design changelog: `docs/design/garden/CHANGELOG.md`, entries "2026-10-12 — Onboarding: no "Say 5 words", no First bed row", "2026-10-11 — Onboarding: 2 steps", "2026-10-11 — Onboarding: 3 steps instead of 4" (read the newest first; it wins).

> **Gate:** the entries are *For approval*. Build only after Dylan marks them **Approved** in the changelog. Dylan's rule: keep Dygo simple and clear.

## Before / after

| | Today (built) | New |
|---|---|---|
| Steps | `/welcome/level` → `/goal` → `/bed` → `/reminder` → `/ready` (4-dot header) | `/welcome/level` (**About you**) → `/welcome/reminder` → `/welcome/ready` (2-dot header) |
| OB1 | Level only, 4 big rows with "I can…" lines | **About you**: level as 4 compact tiles + goal chips + IELTS band inline |
| OB2 Goal | Own screen, tall band chart, test day | **Removed** (merged into OB1); test day removed from onboarding |
| OB3 First bed | Pick a seed packet | **Removed**; bed picked from the goal, not shown |
| OB4 Reminder | Sun arc + presets + channel switches | **3 choices** + "Remind me at …" + Not now |
| OB5 Ready | 4-row summary | 3 rows: Level, Goal, Reminder |
| OB4b Say 5 words | (designed, not built) | **Not built. Don't build it.** |

Design files (`docs/design/garden/source/`): `OnboardLevel(Vi)`, `OnboardReminder(Vi)`, `OnboardReady(Vi)`. Old boards kept for history only: `OnboardGoal(Vi)`, `OnboardBed(Vi)`, `OnboardVoice(Vi)`; don't build from them.

Rules: copy spacing, sizes, colours and copy from the boards; all strings in `messages/{en-US,vi-VN,zh-CN}.json` (write ZH to match); `prefers-reduced-motion`; `vitest` (compare against HEAD, count only new failures); backend `jest` for profiles; `tsc --noEmit`; render references with `docs/design/garden/tools/render.js` (jobs below) and `npm run garden:diff -- --only OB1-about-you,OB4-reminder,OB5-ready` ≤ 0.5 % EN + VI; `Change Log.md`; set the changelog rows to **Built** with the commit; deploy UAT via `deploy/request.md`. One commit (+ one Design commit for the source files and references first).

---

## 1 · OB1 About you (`/welcome/level`, `OnboardLevelScreen`)

- Header: back → AU2 (or wherever sign-up returns), **2-stage** plant progress (seed, sprout), step 1 of 2.
- Title "Let's set up your garden" · sub "Two quick questions. You can change them later." (VI on the board).
- **Your English today**: 2×2 grid of tiles (60 px tall): Just starting · A1–A2, Getting there · B1, Comfortable · B2, Advanced · C1. Selected = dark green border + pale green fill. Stores `cefr_level` (A2/B1/B2/C1 as today; "A1–A2" maps to A2). Pre-select today's default **B1** (D-7); the board shows B2 only as an example.
- Small grey line under the tiles: "Not sure? Pick the closest; Dygo adjusts as you learn." (replaces the "Try 10 quick words" link, which had no screen).
- **What are you growing towards?** chips: IELTS Academic, IELTS General, Work, Travel, Just for me.
- **Target band** row (dark card, −/+ stepper, "Higher bands plant more academic words.") only for IELTS Academic / General; IELTS 4.0–9.0, half bands, start 7.0 (existing `BAND_STEPPERS.IELTS`).
- Continue saves `cefr_level`, `study_goal`, `target_band` in one `PATCH /profiles/me/onboarding`, then → `/welcome/reminder`.
- **Goal values** (backend `STUDY_GOALS` + the DB check in `20261008_onboarding.sql`): add `IELTS_GENERAL`, `WORK`, `TRAVEL`. Keep `IELTS` (= Academic), `LIFE` (= Just for me) and `PTE` (no longer offered on screen; existing rows stay valid, and the band rules for PTE stay). New migration for the check constraint. `target_band` is kept only for `IELTS` / `IELTS_GENERAL` (and `PTE` for old rows); other goals clear it.
- **First bed from the goal** (no screen): on Continue, if `first_topic_id` is empty, set it to the library topic for the goal: IELTS / IELTS_GENERAL → Environment, WORK → Work & careers, TRAVEL → Travel, LIFE → Everyday life (or, if a slug is missing, the biggest library topic, as `seedPackets` ranks them). Do it server-side in the onboarding PATCH (or a small helper the PATCH calls) so it's one place; the existing planting of the first 10 seeds stays as it is.
- Remove the test-day field from onboarding (the Profile header already has "Test day: add date").

## 2 · OB4 Reminder (`/welcome/reminder`, `OnboardReminderScreen`)

- Header: back → `/welcome/level`, step 2 of 2.
- Title "When should we water?" · sub "One reminder a day, when your words are ripe. Change it any time in Profile."
- Three radio rows (72 px): **Morning · 7:30** "Before work or class" (sun icon), **Lunch · 12:30** "A short break" (sun), **Evening · 21:00** "Wind down with words" (moon on dark green). Default Morning.
- Button **"Remind me at {time}"** → save the reminder (existing `upsert` with `reminderTime`, `timezone: localTimezone()`, `isEnabled: true`), then ask the OS for notification permission (as today, only after the tap), then → `/welcome/ready`. **Not now** → reminder off → `/welcome/ready`.
- Remove from onboarding: the sun arc, the preview notification, the "Remind me by" channel switches (phone notification is the default; Zalo / Email stay in Profile › Reminder A8c).
- **Time zone: no change** (Dylan, 2026-10-12): keep detecting it with `localTimezone()`; no picker anywhere. Check that the detected zone is also saved on the profile at sign-up / first onboarding save, since server reminders use `profiles.timezone`; if it isn't, save it in the OB1 PATCH.

## 3 · OB5 Ready (`/welcome/ready`)

- Summary card has three rows: **Level** (Change → `/welcome/level`), **Goal** (Change → `/welcome/level`), **Reminder** (Change → `/welcome/reminder`). Remove the First bed row.
- Header copy stays ("10 Environment seeds are in the ground…"), using the bed picked in step 1.
- Buttons as today ("Meet your first 5 words", "Look around the garden first"); `complete: true` as today.

## 4 · Routes and clean-up

- `/welcome/goal` and `/welcome/bed`: redirect to `/welcome/level` (old links, half-finished onboardings). Delete `OnboardGoalLive/Screen`, `OnboardBedLive/Screen` and their tests once nothing imports them.
- The onboarding gate (`app/(onboarding)/gate.test.tsx`): someone who stopped on the old goal or bed step resumes at `/welcome/level` (if no goal) or `/welcome/reminder`.
- `onboarding.ts`: drop the sun-arc helpers if nothing else uses them; keep `BAND_STEPPERS`, `hasBand`, `stepBand`, `formatBand` (add `IELTS_GENERAL` to `hasBand` / steppers, same range as IELTS).
- iPad: onboarding is the phone column centred (as today).

## 5 · Messages (`screens.onboarding`), EN · VI

| key | EN | VI |
|---|---|---|
| about.title | Let's set up your garden | Cùng thiết lập khu vườn |
| about.sub | Two quick questions. You can change them later. | Hai câu hỏi nhanh. Bạn có thể đổi sau. |
| about.levelLabel | Your English today | Tiếng Anh của bạn hiện nay |
| level.A2 / B1 / B2 / C1 | Just starting / Getting there / Comfortable / Advanced | Mới bắt đầu / Đang tiến bộ / Khá vững / Nâng cao |
| about.notSure | Not sure? Pick the closest; Dygo adjusts as you learn. | Chưa chắc? Chọn mức gần nhất, Dygo sẽ điều chỉnh khi bạn học. |
| about.goalLabel | What are you growing towards? | Bạn vun trồng cho mục tiêu nào? |
| goal.IELTS / IELTS_GENERAL / WORK / TRAVEL / LIFE | IELTS Academic / IELTS General / Work / Travel / Just for me | IELTS Academic / IELTS General / Công việc / Du lịch / Cho bản thân |
| about.band / bandNote | Target band / Higher bands plant more academic words. | Band mục tiêu / Band càng cao, càng nhiều từ học thuật. |
| reminder.title / sub | When should we water? / One reminder a day, when your words are ripe. Change it any time in Profile. | Khi nào nên tưới? / Mỗi ngày một lời nhắc, đúng lúc từ đã chín. Đổi bất cứ lúc nào trong Hồ sơ. |
| reminder.morning / lunch / evening | Morning · Before work or class / Lunch · A short break / Evening · Wind down with words | Sáng · Trước giờ làm hoặc đi học / Trưa · Giờ nghỉ ngắn / Tối · Thư giãn cùng từ vựng |
| reminder.cta / notNow | Remind me at {time} / Not now | Nhắc tôi lúc {time} / Để sau |

(ZH: write to match.) Remove keys that only the deleted screens used.

## 6 · References and tests

- render.js jobs (EN + VI): `OB1-about-you` (`OnboardLevel`), `OB1-about-you-work` (state `goal: 'work'`, no band row), `OB4-reminder` (`OnboardReminder`), `OB5-ready` (`OnboardReady`). Replace the old OB1–OB5 jobs and drop OB2 / OB3 references.
- Tests: OB1 saves level + goal + band in one PATCH; band row only for IELTS goals; non-IELTS goal clears the band; first bed set from the goal (and left alone if already set); OB4 Remind me saves time + timezone and asks permission after the tap; Not now turns the reminder off; OB5 shows 3 rows; `/welcome/goal` and `/welcome/bed` redirect; the gate resumes correctly; backend accepts the new goals and rejects unknown ones.

## Out of scope
"Say 5 words" (removed), any time-zone setting, a level check ("Try 10 quick words"), test day in onboarding, iPad-specific onboarding layouts.
