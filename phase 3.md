# 📋 Dygo Academy — Phase 3: Learning Path & Engagement Business Requirements
**Document Version**: 1.0 (Draft for Product review)
**Author**: Product/UX planning follow-up
**Status**: Draft — scoping only, no FR here is committed or estimated by engineering yet
**Source**: The "Dygo Learning Path" concept (reimagined customer journey + 4 redesigned screens, published as an artifact 2026-09-19) and `phase 2.md` §2.1, which named this phase explicitly: *"treat the Learning Path concept as a candidate Phase 3, scoped separately, after Phase 2's P0/P1 items ship."*

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
*Why it matters*: **naming correction from the original concept mockup** — its "Focus List" screen was framed as the *student's own* view, but FR-14.1's heatmap (`GroupHeatmapSection`) is admin-only and group-scoped (`GET /groups/:id/heatmap`, gated by `canManage`). A regular student viewing their own Progress page has no equivalent list today — `useLeeches()` returns their leech words, but Progress doesn't render it as a ranked, visual list the way the concept's mockup shows. This module is net-new for students, not a restyle of FR-14.1 for them.
**Blocked on `phase 2.md` §9's deploy** for the same reason as Module 21.

* **FR-22.1 (Student-facing focus list)** — Core
  * *Requirement*: The Progress page SHALL show the signed-in user's own leech words (`useLeeches()`, already live) as a short, ranked list — reusing FR-14.1's intensity-bucket pattern for visual consistency, applied to personal data instead of group-aggregate data.
  * *Acceptance*: A student with leech words sees them ranked on their own Progress page without needing to be a group ADMIN.

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
