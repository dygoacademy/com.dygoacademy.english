# Seeds & Harvest: implementation plan

Approved by Dylan on 2026-10-23. Product plan: doc "Dygo Word Garden: Seeds & Harvest plan".
Design: canvas page **Adult · Seeds & Harvest**, boards S1 `SeedDrop`, S2 `BedHarvest`,
S3 `SeedPackets` (`docs/design/garden/source/`, references `S1-seed-drop`, `S2-bed-harvest`,
`S3-seed-packets(-goal)`).

Problem: a 5-word bed is fully planted on day 1, so on day 2 *Plant 5 new words* has nothing
from that bed. Fix: the end of a bed becomes a harvest and a choice of 3 seed packets (Phase 1),
and fruit drops related words back into the bed (Phase 2).

One branch and one review per phase. The next phase starts only after the previous one is
approved and merged.

## 0. The plan's names in this repo

| Plan says | Repo has | Note |
| --- | --- | --- |
| `user_words` | `user_word_srs` (one row per learner and topic word, `topic_word_id`) | A word the learner added sits in their private "My words" bed (`topics.is_my_words`). Phase 2 adds `source` / `dropped_by_word_id` there. |
| `topic_words` (`topic_id`, `word_id`, `order`) | `topic_words` (`topic_id`, `lexicon_id`, `created_at`) | No `order` column; oldest first is the bed order. The word is `master_lexicon` via `lexicon_id`. |
| `user_beds` | new (Phase 1) | Before this, the learner's bed was `profiles.first_topic_id`, picked from the goal at onboarding. |
| Stages seed → fruit | Not stored. `stageFromSrs` (frontend `plantStage.ts`): seed (New), sprout (Learning / Relearning), flower (Review), tree (`mastered_at` set, stability ≥ 21 days), wilting (leech); thirsty = due now. | "Fruit" in this plan = **tree** (mastered); "ripe" = **flower**; "growing" = seed, sprout or wilting. Speaking also has a `fruit` stage (score ≥ 90), which is not this. |
| A review moves a word to fruit | `SrsService.rate` sets `mastered_at` when stability first reaches 21 days | Phase 2 hooks the seed drop there. |
| Mission *Plant 5 new words* | `daily_missions.type = 'LEARN_NEW'`; target from `planDay` (`missions.plan.ts`); words from `SrsService.findDue` new-cards query | Order before Phase 1: own words, then the first bed, then every other library word, oldest first. |
| Daily goal Light / Steady / Intense | `profiles.daily_goal_minutes`, tiers 5 / 10 / 15 / 20 / 30 min (`GOAL_TIERS`), plant 3 / 5 / 8 / 10 / 15 | Light = 5 min (3), Steady = 10 min (5), Intense = 15 min (8) already match. The labels don't exist in the app. |

## Phase 1: Harvest and seed packets (S2, S3)

- **Database** `20261023_user_beds.sql`: `user_beds (user_id, topic_id, status active|resting|harvested,
  started_at, harvested_at)`, one active bed per learner, owner-only RLS. Backfilled from
  `profiles.first_topic_id`.
- **The active bed** replaces the first bed everywhere `FIRST_BED_TOPIC` was used (planting order,
  quiz, speaking): the learner's `active` bed, else `first_topic_id`.
- **API** `GET /beds/active`, `GET /beds/:topicId/harvest`, `GET /beds/packets`, `POST /beds`
  (plant a packet: it becomes the active bed; the old one becomes `harvested` when it had nothing
  left to plant, else `resting`).
- **Harvest ready** = the bed has at least one READY word and every one of them is planted.
- **Packets** (`beds.plan.ts`, unit tested), from public beds the learner has never had:
  1. Follow the bee: the most words already in the learner's garden (at least 1).
  2. Same goal: a bed whose title fits the learner's goal (the onboarding first-bed patterns), else
     one from the same library shelf as the current bed; biggest first.
  3. Something new: a shelf the learner has no bed from, at their level; else any other bed.
  Level = the middle half of the bed's word levels (`B2`, `B1–B2`).
- **Screens** S2 at `/topics/[id]/harvest`, S3 at `/topics/[id]/packets`. Today's *Plant* mission
  (A1 row and A3 "Next up") opens S2 while the active bed is ready to harvest, so a learner sees the
  harvest instead of being handed library words. After S3 the learner lands on the new bed (A7).
- **Gate**: a learner with a 5-word bed always has something to plant on day 2.

## Phase 2: Seed drops, pilot (S1)

`word_relations`, `user_word_srs.source` / `dropped_by_word_id`, the drop in `SrsService.rate`
when `mastered_at` is first set, planting order bed words then dropped seeds, the "incl. 2 dropped
seeds" note on A1, and the "more than 20 thirsty → plant 2" rule. Content: pairings and word family
for the 20 most-used beds. Gate: relations reviewed by an editor; dropped seeds have native audio.

## Phase 3 and 4

Phase 3: relations for all words, synonyms, Vietnamese and iPad boards for S1–S3. Phase 4: tune the
numbers from real usage.

## Open questions

In `docs/design/QUESTIONS.md` (Q-24 onwards).
