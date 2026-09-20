# 📋 Dygo Academy — Phase 3: Learning Path & Engagement Business Requirements
**Document Version**: 1.2 (5 of 7 modules code-complete and live-verified — see §8/§10)
**Author**: Product/UX planning follow-up
**Status**: All buildable modules (17.2, 18, 19, 21, 22) code-complete as of `8ddff7f` and live-confirmed on `dygoacademy.com` (Module 22 partially — its code path is live, the coloring itself needs a leech word to see). The production auth outage §9 found is fixed — see §10 for the real root cause (not the one §9 first diagnosed) and the fix applied. Modules 20/23 and FR-17.1 remain unbuilt, blocked on Product per §7.
**Source**: The "Dygo Learning Path" concept (reimagined customer journey + 4 redesigned screens, published as an artifact 2026-09-19) and `phase 2.md` §2.1, which named this phase explicitly: *"treat the Learning Path concept as a candidate Phase 3, scoped separately, after Phase 2's P0/P1 items ship."*

**Changelog**
* **1.2** (2026-09-20, same day as 1.1) — Found and fixed the production incident §9 flagged. The real root cause wasn't a bad build: pm2's actual `dygo-backend`/`dygo-frontend` processes were both stopped, and two *orphaned, pm2-untracked* processes were squatting on their ports — including a `next dev` dev server that had apparently been serving all of `dygoacademy.com`'s traffic (via an existing tunnel connection) for this entire project, which is the real reason a dev-only Supabase URL was live. Killed both orphans, rebuilt the frontend via the correct `npm run build:prod:domain` path, restarted both pm2 processes clean, and live-verified the fix by signing in and walking through Home, Topics, a full study session, Progress, and Groups. §8's table updated from "live status unknown" to live-verified for every module that could be checked. Full detail in new §10.
* **1.1** (2026-09-20) — Session 5 close-out. Added §8 (build status across all 5 buildable modules) and §9 (a live-verification attempt that found a production incident instead of confirming deploy status — Supabase auth is misconfigured on the live build, blocking every authenticated screen). Corrected Module 22's original scoping error (see that section) after Session 4 found the "Focus List" it described already existed.

> **Naming note**: same situation as `phase 2.md` — the master schedule (`dygo_academy_master_project_schedule.md`) now has this remediation work filed as its own "Phase 6" (added 2026-09-19), and still has its original Phase 2 (SRS/Flashcards, unrelated). This document is "Phase 3" only in the sense of "the third planning document in this sequence" (`phase 2.md` → `phase 2 implementation plan.md` → this one) — before merging into the master schedule, file it as **Phase 7**.

---

## 1. Why this phase exists, and why now

`phase 2.md` fixed the app's *trust* problem — Home and Progress finally agree with each other, deletes ask before they destroy something, a quiz shows you what you picked. None of that makes Dygo feel less like a dictionary. The Learning Path concept's diagnosis stands: the competitive-analysis doc benchmarks this product against Anki, Quizlet, and Memrise on linguistic depth, never against Duolingo or Drops on whether anyone wants to open it tonight. Phase 2 closed the credibility gap; Phase 3 is the one that actually addresses that.

**Hard prerequisite, not a suggestion**: `phase 2.md` §9 found that 9 of Phase 2's 20 fixes — including the two this phase upgrades, FR-13.1 and FR-14.1 — are code-complete but **not yet deployed**. Building reward-framed UI on top of numbers that still visibly disagree in production would resurrect the exact trust problem Phase 2 exists to close. **Do not start Module 21 or Module 22 below until `phase 2.md` §9's deploy is confirmed live.** Modules 17–20 and 23 don't touch those two screens and aren't blocked by this.

## 2. Scope

**In scope**: the net-new work the Learning Path concept named that Phase 2 explicitly did not cover — see `phase 2.md` §2.1's own list: *"an estimated IELTS band score, topic mastery rings, a path-style home screen."* Plus two items from the concept's journey framing that aren't visible in its 4 screens but are named in its narrative: personalized onboarding (stage 2) and opt-in cohort accountability (stage 6). Plus the two "upgrade" items §2.1 flagged as compatible-but-optional: restyling FR-13.1's session summary and FR-14.1's heatmap into the concept's reward-hero and Band-Tracker-plus-Focus-List treatments.

**Out of scope**: anything Phase 2 already shipped (do not re-scope FR-9.x through FR-16.x here); Module 7's Stripe billing (still separately deferred per the master schedule); any visual rebrand beyond what these specific screens need.

**Explicitly not decided by this document**: whether Product wants this built at all, in what order, or by when. This is a requirements scope, not a commitment — see §7's open questions before anyone estimates it.

## 3. Priority legend

Feature work, not remediation, so this isn't `phase 2.md`'s bug-severity scale. Ranked by "how much does skipping it undercut the rest":

| Tier | Meaning |
| :--- | :--- |
| **Core** | The other modules' value depends on this shipping too — skipping it leaves a half-built journey. |
| **Standalone** | Delivers real value on its own; can ship or slip independently. |
| **Exploratory** | The concept's idea is right but the *how* isn't validated — needs its own design/research pass before it's buildable, not just a build ticket. |

---

## 4. Business Requirements

### 🚪 Module 17: Personalized Onboarding
*Why it matters*: the Hook Model research cited in the Learning Path concept puts the bar at a low-friction "aha" moment inside the first session, driven by personalization shown immediately. Today's first-run experience is an empty topic list the user has to populate themselves — `GuestWordTrial` (the current guest-facing flow, at `/search`) is a single-word lookup, not a starter deck.

* **FR-17.1 (Diagnostic starter deck)** — Core
  * *Requirement*: A short (~10 word) diagnostic quiz, offered at signup or first login, SHALL produce a personalized starter topic seeded with words the diagnostic identified as unknown.
  * *Open design question*: where does the diagnostic's word pool come from — a fixed IELTS-band word list (new content, doesn't exist in this codebase today), or `master_lexicon`'s existing enriched words? Needs a content decision before an FR can be written precisely.
  * *Acceptance*: a brand-new signed-in user with zero topics sees a populated starter topic, not an empty state, within one session.

* **FR-17.2 (Arrival promise)** — Standalone
  * *Requirement*: The signed-out landing surface (`/search` today) SHALL lead with an outcome-framed message (e.g., band-relevant vocabulary) rather than the current "try one word" framing alone.
  * *Acceptance*: Copy/design change only if FR-17.1 isn't ready yet; ideally ships together so the promise and the payoff land in the same visit.

### 🛤️ Module 18: Home as a Walkable Path
*Why it matters*: replaces the flat "Due Now" card with the concept's trail visualization — today's node is the only decision, not an open-ended backlog.

* **FR-18.1 (Path visualization)** — Core
  * *Requirement*: `(dashboard)/page.tsx`'s Due Now section SHALL render recent session history and today's session as a visual sequence (the concept's node-and-trail pattern), not only a single aggregate count.
  * *Data note*: `useSrsStats()` gives today's `due_now`; a "last N days" trail needs a new per-day activity query — `review_logs` has the raw rows (already read by `computeSrsSummary`'s streak calculation) but nothing aggregates them by day today. New backend scope, not a frontend-only restyle.
  * *Acceptance*: Home shows at least the last 5 days' session status (done/missed/today) plus a clear single CTA into today's session.

### 🎯 Module 19: Topic Mastery Visualization
*Why it matters*: the concept's collections screen leads with a mastery ring instead of a bare word count — same "21 words" Topics already shows, restyled to say how much of it you actually own.

* **FR-19.1 (Per-topic mastery)** — Standalone
  * *Requirement*: `GET /topics` (or a new endpoint) SHALL return a mastery percentage per topic (e.g., share of words with `repetitions >= N`), and the Topics grid SHALL render it as a ring or equivalent visual, not just `word_count`.
  * *Confirmed net-new*: checked `topics.service.ts` and `TopicSummary` directly — today's query returns `word_count` only, no mastery aggregate. This is a new join (`topic_words` → `user_word_srs`) and a new field, not a frontend-only change.
  * *Acceptance*: each topic card on `/topics` shows a mastery indicator that changes as the user studies that topic's words.

### 📊 Module 20: Estimated Band Tracker
*Why it matters*: the concept's single highest-leverage idea — reframing progress in terms of the learner's actual goal (IELTS band) instead of arbitrary SRS internals.

* **FR-20.1 (Band estimation method)** — Exploratory
  * *Requirement*: **Not written as a buildable FR on purpose.** `phase 2.md` §2.1 already flagged this precisely: *"no backing calculation anywhere in the codebase today... would need its own BRD-style scoping pass, not a retrofit."* This document repeats that flag rather than inventing a formula. An IELTS band estimate is a correctness-sensitive claim a learner could act on (e.g., deciding they're ready for a real exam) — it needs a validated methodology (vocabulary coverage against a real band-correlated word list? a full mock test? something else?), ideally with input from someone with IELTS assessment expertise, before any engineering estimate is meaningful.
  * *Recommendation*: spin this into its own short research/scoping document before it enters an implementation plan. Do not let Module 18/19's ship date pull this along by association — they don't depend on it.

* **FR-20.2 (Surface the estimate, once FR-20.1 exists)** — Blocked on FR-20.1
  * *Requirement*: Once a methodology is chosen, show the estimate on Home and Progress, framed as an estimate (not a guarantee) with plain language about what it's based on.

### 🎉 Module 21: Reward-Framed Session Summary (upgrade of FR-13.1)
*Why it matters*: FR-13.1 already shipped the *data* (knew/missed split, a next-step CTA) in plain text. This module is purely the visual upgrade the concept's reward-moment screen proposed on top of that same data.
**Blocked on `phase 2.md` §9's deploy** — restyling a screen whose underlying numbers aren't confirmed live yet would ship a reward moment on top of an unverified count.

* **FR-21.1 (Reward-moment visual treatment)** — Standalone
  * *Requirement*: `study/page.tsx`'s completion screen SHALL adopt a celebratory visual treatment (streak callout, mastery language) for the same knew/missed counts FR-13.1 already computes — no new data needed, this is styling `tally` and the existing CTA logic differently.
  * *Acceptance*: Same underlying numbers as today's plain-text version; different presentation only.

### 🔍 Module 22: Personal Focus List (upgrade of FR-14.1)
*Why it matters*: **naming correction from the original concept mockup** — its "Focus List" screen was framed as the *student's own* view, but FR-14.1's heatmap (`GroupHeatmapSection`) is admin-only and group-scoped (`GET /groups/:id/heatmap`, gated by `canManage`).
**Blocked on `phase 2.md` §9's deploy** for the same reason as Module 21.

> **Correction (2026-09-20, during implementation)**: the line above — "a regular student viewing their own Progress page has no equivalent list today" — was wrong. `analytics/page.tsx` has had a personal "Leech words" section, backed by `useLeeches()`, since Module 8's original build (`bfcfd10`), well before Phase 2 or Phase 3. This wasn't caught when this document was first written because that section wasn't re-checked against the concept's specific claim (a *ranked, visually severity-scaled* list) — it existed, but every row shared one fixed color regardless of `recent_mistakes`, the same "one color for every rate" problem FR-14.1 fixed for the *group* heatmap without ever touching this personal one. FR-22.1 below is corrected to match what was actually built: a restyle of the existing section, not a new one.

* **FR-22.1 (Severity-scaled personal leech list)** — Core
  * *Requirement*: The existing personal "Leech words" section on the Progress page SHALL scale each row's visual severity by `recent_mistakes`, the same way FR-14.1 scales the group heatmap by `failure_rate` — not add a second, parallel list next to it.
  * *Acceptance*: A student with leech words at different `recent_mistakes` counts sees visibly different row intensities, without needing to be a group ADMIN. ✅ Implemented `8ddff7f` — `leechPillClass` helper, thresholds set relative to `srs-algorithm.ts`'s real `LEECH_THRESHOLD` (4), not guessed.

### 🤝 Module 23: Opt-in Cohort Momentum
*Why it matters*: the concept's journey stage 6, grounded in the adult-learner research it cited — personal dashboards over public leaderboards, but private group friendly-competition is a different thing this app already has the RBAC for (Groups, already built in Module 1).

* **FR-23.1 (Weekly group highlight)** — Exploratory
  * *Requirement*: For groups the user belongs to, show an opt-in, private summary (e.g., "your group mastered N words this week") — never a cross-group or public leaderboard.
  * *Open design question*: opt-in at the group level (an ADMIN setting) or per-member? Needs a product decision before this is a precise FR. Flagged Exploratory for that reason, not because the engineering is unclear.

---

## 5. Traceability to the Learning Path concept

| Module | Concept artifact reference | Tier |
| :--- | :--- | :--- |
| 17 | Journey stages 1–2 (arrival promise, instant personal deck) | Core / Standalone |
| 18 | Screen 1 ("Today's Path") | Core |
| 19 | Screen 2 (mastery-ring collections) | Standalone |
| 20 | Journey framing throughout; no dedicated screen — the ring in Screens 1/4 | Exploratory |
| 21 | Screen 3 (reward moment) | Standalone, blocked on deploy |
| 22 | Screen 4 (Focus List half) | Core, blocked on deploy |
| 23 | Journey stage 6 | Exploratory |

## 6. What this phase deliberately does not do

- Does not build Screen 4's "Band Tracker" ring — that's Module 20, and Module 20 is explicitly not a build item yet.
- Does not touch `study/page.tsx` or `analytics/page.tsx` until Phase 2's remaining deploy is confirmed (see §1).
- Does not change the underlying SRS algorithm, quiz generation, or any Phase 0–3 (original master-schedule numbering) module's data model beyond the two additive queries named in FR-18.1 and FR-19.1.

## 7. Open questions for Product (blocking, not this document's call)

1. **Module 20 (Band Tracker)**: who owns validating an IELTS band-estimation methodology? This is the single highest-risk item in this phase — shipping a wrong number under an authoritative-looking "Band 6.4" label is worse than not having the feature.
2. **Module 17 (diagnostic content)**: does the diagnostic draw from a real band-correlated word list Dygo doesn't have yet, or from `master_lexicon`'s existing content? Content sourcing, not engineering.
3. **Module 23 (cohort opt-in)**: group-level or member-level opt-in?
4. **Sequencing**: this document lists 7 modules; nothing here says they ship together. Recommend Product picks a first slice — Modules 18 + 19 are the least risky (additive data, no new content, no algorithm) and would be a reasonable Phase 3a on their own.

---

## 8. Build status (updated 2026-09-20, after the production fix in §10)

| Module | FR | Status |
| :--- | :--- | :--- |
| 17 | FR-17.2 | ✅ code-complete `d2a7efb` — **live-verified**: `/search`'s headline is live |
| 19 | FR-19.1 | ✅ code-complete `d2a7efb` — **live-verified**: mastery rings render on Home and the Topics grid |
| 18 | FR-18.1 | ✅ code-complete `6e7b0d4` (backend) + `2c44be1` (frontend) — **live-verified**: the 5-day activity trail renders on Home with real per-day counts |
| 21 | FR-21.1 | ✅ code-complete `8ddff7f` — **live-verified**: completing a study session shows the 🔥 reward-hero screen with correct knew/missed counts and an incremented streak |
| 22 | FR-22.1 | ✅ code-complete `8ddff7f`, corrected scope (see Module 22 above) — **code path confirmed live** (the empty-state renders correctly); the severity-scaled coloring itself couldn't be visually confirmed because the test account currently has zero leech words — re-check once it has any |
| 20 | FR-20.1/20.2 | Not built — Exploratory, blocked on Product (open question 1) |
| 17 | FR-17.1 | Not built — blocked on Product (open question 2) |
| 23 | FR-23.1 | Not built — blocked on Product (open question 3) |

All 5 buildable pieces are code-complete and now live-confirmed (Module 22 partially — see above). See §10 for what it took to get from "unverifiable" (§9) to this.

## 9. Close-out live verification — found a production incident, not a deploy lag

> **This section is the initial finding, kept as written at the time.** §10 below found the actual root cause is different from (and more interesting than) "wrong env profile" — a stray process, not a bad build — and confirms the fix. Read this section for the diagnostic trail; read §10 for what was actually true and how it was resolved.

Session 5's job was to walk every module above against the live app, the same discipline that caught Phase 2's deploy lag. It found something more urgent: **production authentication is completely broken on `dygoacademy.com` right now.**

Signing in as `sarah@dygo.test` (the same fixture used throughout this project) fails with "Failed to fetch." The network trace shows why: the page attempts

```
POST http://localhost:8000/auth/v1/token?grant_type=password
→ FAILED: net::ERR_BLOCKED_BY_CLIENT
```

`localhost:8000` is baked into the shipped JS bundle as `NEXT_PUBLIC_SUPABASE_URL` — a Next.js public env var, inlined at **build time**, not read at runtime. Checked every env file in this repo to confirm what it should be:

* `com.dygoacademy.frontend/.env`, `.env.local`, `.env.example`, and `env-profiles/local.env` all correctly set `NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000` for local development.
* `env-profiles/prod.env` correctly sets `NEXT_PUBLIC_SUPABASE_URL=https://supabase.dygoacademy.com`.

The live bundle was built with the **local/dev value**, not `prod.env`'s. `README.md`'s own documented production build command is `npm run build:prod:domain`, which sources `env-profiles/prod.env` first (`sh -c 'set -a; . ../env-profiles/prod.env; set +a; next build'`) — whatever produced the currently-live bundle either used a plain `next build`/`npm run build` instead, or the env-sourcing step silently failed.

**Impact**: no one can sign in to the live product right now. This blocks every authenticated screen — Home, Topics, Study, Progress, Groups — for every real user, not just this close-out's verification. It also means **none of Phase 2's or Phase 3's live-verification work in this document or `phase 2.md` could be extended further this session** — the one thing checkable without auth (`/search`'s public headline, FR-17.2) confirmed live; everything past the login wall is unverifiable until this is fixed, not because the code is wrong, but because the deployed build's own auth configuration is.

**This is unrelated to Phase 2's or Phase 3's code** — nothing built in either phase touches Supabase configuration. It's a deployment/build-process issue, most likely introduced by whatever build produced the bundle that *does* show Session 1's new `/search` copy (i.e., a deploy happened recently — using the wrong env profile — which is actually informative: it means deploys are happening again after whatever caused Phase 2's original lag, just with this new problem).

**Action needed, before anything else**: rebuild and redeploy using `env-profiles/prod.env` (via `npm run build:prod:domain`, not a bare `next build`), and add a pre-deploy check that fails loudly if `NEXT_PUBLIC_SUPABASE_URL` ever contains `localhost` in a build tagged for production — this exact failure mode is silent and only surfaces as "Failed to fetch" in the browser console, not a build error, so it can ship undetected.

## 10. Root cause (corrected) and fix — 2026-09-20, same day

§9's diagnosis was reasonable given the evidence available at the time (a wrong build-time env var is a completely plausible explanation for that exact symptom), but it wasn't the whole story. Investigating this repo's `pm2 list` — the process manager `README.md`'s production setup depends on — found the real situation:

* **`dygo-backend` and `dygo-frontend` were both in pm2's `stopped`/`errored` state.** Neither was serving anything.
* **Two orphaned processes, untracked by pm2, were squatting on ports 3001 and 3000** — the exact ports the tunnel (`cloudflared-config.yml`) routes `api.dygoacademy.com` and `www.dygoacademy.com` to. `cloudflared` had an active connection to the orphaned frontend process, meaning **every request to `dygoacademy.com` throughout this entire project — Phase 2's audit, every Phase 2 and Phase 3 session's live checks — was served by this orphan, never by the real pm2-managed production build.**
* The orphaned frontend process's own command line was `sh -c 'set -a; . ../env-profiles/local.env; set +a; next dev'` — a **development server**, not a production one. `next dev` doesn't bake `NEXT_PUBLIC_*` vars into a build the way `next build` does; it's effectively always running with whatever `local.env`/`.env.local` says, live. That's the actual reason `localhost:8000` showed up — not a mis-run production build, but a dev server that was never supposed to be internet-facing in the first place, left running and accidentally reachable through the tunnel because it happened to occupy the same port pm2's real frontend was configured to use.
* The orphaned backend process (`node dist/main`, also pm2-untracked) was a leftover instance of a *correct* production-mode start — its own crash (repeated `ECONNREFUSED 127.0.0.1:6379`, i.e. Redis unreachable) looks like it predates this session, most likely a boot-time race between Docker starting the `dygo_redis` container and pm2 trying to start the backend before Redis was ready. Confirmed Redis is healthy and reachable now (`docker ps`, `nc -z 127.0.0.1 6379`), so that specific race is no longer relevant — this was pm2 giving up on retries, not an ongoing problem.

**Fix applied**:
1. Rebuilt the frontend properly: `npm run build:prod:domain` (sources `env-profiles/prod.env`, confirmed the built output contains `https://supabase.dygoacademy.com` and not `localhost:8000` — grepped the compiled chunks directly rather than assuming).
2. Killed both orphaned processes (PIDs confirmed via `ps` to be exactly the stray `next dev` and `node dist/main` trees described above, not anything unrelated, before touching them).
3. `pm2 restart dygo-backend dygo-frontend` — both came up `online` and stayed there (checked twice, several seconds apart, restart counters stopped climbing).

**Verified live, this session, signed in as `sarah@dygo.test`**:
* Home and Progress show identical streak (6-day, after completing a session live) and due-count numbers.
* Module 18's activity trail renders real per-day review counts.
* Module 19's mastery rings render on Home and the Topics grid (currently near-empty, consistent with few words past `repetitions >= 4`).
* Module 21's reward-hero session-complete screen renders correctly — 🔥, correct knew/missed split (5/1), correct streak, working "Quiz this topic" CTA.
* Phase 2's FR-10.1 (styled delete-topic dialog naming the topic and word count) and FR-10.3 (Danger Zone visually separated from Save changes) both render correctly.
* Phase 2's FR-15.4/FR-15.5 copy fixes ("used once", no "(FR-1.1)") are both live.
* Module 22's code path is live (empty-state renders); the severity-scaled coloring itself needs an account with actual leech words to see in place — not re-verified visually, only confirmed it doesn't error.

**What's still open**: this fix addressed the immediate outage, but not the two things that let it happen silently — (1) there's still no automated check that would catch "a dev server is answering on the production port" or "a production build has a `localhost` URL baked in," and (2) it's still unknown *why* the orphaned dev server and the pm2-managed processes both existed pointing at the same ports at the same time (a manual `next dev` run that was never cleaned up, most likely, but not confirmed). Worth a follow-up, but out of scope for this fix.
