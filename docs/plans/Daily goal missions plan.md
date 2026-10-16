# Daily goal missions plan

Dylan asked for this on 2026-10-15, after the learner journey review (`/mnt/project-files/notes/learner-journey-review.md`, item 1 and item 10).

## Problems

1. **Water plants new words.** Home's Water mission and hero open `/review` with no `due=1`. The session asks for 20 cards and the server tops up the due words with seeds, so "Water 3" plants up to 17 new words. Those come back due, so watering snowballs.
2. **The daily goal does nothing.** Me saves `daily_goal_minutes` (5, 10, 15, 20, 30), but every learner gets the same day: water all due, plant 5, one quiz or speak.

## What changes

### Water only waters
- `/review` without `?new=` is a due-only session. The frontend sends `dueOnly` and the server skips the new-word query.
- Planting only happens through `?new=N` (the Plant mission, bed Plant buttons, topic search Plant, the done screen offer).

### Missions come from the daily goal

| Goal | Water | Plant (max) | Practice |
|---|---|---|---|
| 5 min | all due | 3 | Quiz, 5 questions |
| 10 min | all due | 5 | Quiz (10) or Speak (3), alternating days |
| 15 min | all due | 8 | Quiz (10) or Speak (5), alternating days |
| 20 min | all due | 10 | Quiz (10) and Speak (5) |
| 30 min | all due | 15 | Quiz (15) and Speak (5) |

A goal between tiers uses the tier below it (e.g. 25 → 20); below 5 uses 5, above 30 uses 30.

**Time budget.** Pace guesses: a review 10 s, a new word 40 s, a quiz question 12 s, a spoken sentence 30 s (constants in `missions.plan.ts`, to tune from real session times).
- Watering is counted first. If due words × 10 s fill the goal, there is no Plant mission that day ("catch up" day).
- Otherwise Plant = the tier's number, lowered to what the remaining time buys after practice, never below 3.
- Speak needs enough words with speaking items; with fewer than 3 the day falls back to the quiz only.
- Today's plan is fixed on the day's first read. A goal change applies from the next day.

**Golden Bloom** = every mission of that day done (2 to 4 missions), not "3 done".

**Estimate.** `GET /missions/today` returns `estimate_minutes` and `quiz_questions`. Home shows "about N min" next to Today's missions, and a catch-up line when there is no Plant mission.

### Done screen offers the seeds
After watering, the done screen's next step is the open Plant mission ("Plant 5 new words") before the quiz or speak.

### Daily new-word cap
A session can plant at most what is left of today's Plant mission (target − progress). After that, planting sessions are empty and say so: today's seeds are planted, raise the daily goal in Me to plant more. On a catch-up day nothing can be planted. The A1b "Plant 5 more" extra only shows while seeds are left.

## Not in this change
- Bees (pronunciation) as a 30 min mission: needs a new mission type and migration.
- Measuring each learner's real pace.
- Re-planning today when the goal changes.
