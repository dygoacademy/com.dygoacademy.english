# Seeds & Harvest: the full task against what is built

Checked 2026-10-24 against branch `seeds-harvest/phase-2` (Phase 1 and 2 code, on UAT since
2026-10-23) and the beta library rebuilt from `database/content/library_beta.csv`.

## 1. The plan's names in this repo

| Plan | Repo | Note |
| --- | --- | --- |
| `words` | `master_lexicon` | One row per spelling; `audio_url`, `ipa_us`, `definition_en`, `example_sentences`. No `is_phrase` yet. |
| `user_words` | `user_word_srs` (per learner, per `topic_word_id`) + `seed_drops` | A learner's word is a topic word in a bed. Library beds are shared, so a dropped seed is a topic word in the learner's own My words bed, and `seed_drops (topic_word_id, bed_topic_id, dropped_by, kind)` carries the plan's `source = 'dropped'`, `dropped_by_word_id` and `bed_topic_id`. Words they add are `topic_words.added_by`; bed words are the rest. |
| `topic_words.order` | `topic_words.created_at` | No order column; beds plant oldest first. |
| `word_relations (word_id, related_word_id, …)` | `word_relations (lexicon_id, related_word, kind, rank, reviewed_at)` | The related word is text, matched to `master_lexicon` by spelling. |
| `user_beds` | `user_beds` | As planned. The old bed becomes `harvested` (nothing left) or `resting`. |
| Stage "fruit" | `user_word_srs.mastered_at` set (stability ≥ 21 days) | Set only by `SrsService.applyReview` (flashcards and quiz answers). Pronunciation never writes it. |
| Daily goal Light / Steady / Intense | `profiles.daily_goal_minutes`, tiers 5 / 10 / 15 / 20 / 30 min (`GOAL_TIERS`) | Plant 3 / 5 / 8 / 10 / 15. Light, Steady and Intense = the 5, 10 and 15 minute tiers. |
| "Plant 5 new words" | `daily_missions` `LEARN_NEW`, target from `planDay`; words from `SrsService.findDue` | |
| Analytics stream | none | The only event pipe is `POST /telemetry/media` (audio timings). No product events exist. |
| Feature flags | env variables (`VOICE_DONATION_ENABLED`, `NEXT_PUBLIC_VOICE_DONATION`) | |

## 2. Built vs the task

| Task item | State |
| --- | --- |
| `user_beds`, backfill, `isHarvestReady`, `rankPackets`, S2, S3 | Built. |
| Packets: always 3, fill an empty slot from the other rules | Done 2026-10-24: an empty slot takes the next bed of the other rules. |
| Choosing a packet opens its first planting | Done: it opens the new bed's first planting. |
| Home "Pick your next seed packet" card; "Want a little more?" → Bed harvest; "incl. 2 dropped seeds" | **No board.** Today the Plant mission itself opens S2 while the bed is empty, so Home never shows "Plant 0". Question A. |
| Share → share card image | **No board** for the card; today Share sends a line of text and the link. Question B. |
| Seed drops, planting order, thirsty limit, S1 | Built. |
| `seed_drops` feature flag, off by default | Done: `SEED_DROPS_ENABLED` (off by default); with it off nothing drops and S1 never shows. |
| Only relations whose related word has native audio drop | Done: the related word must have a `master_lexicon` entry with audio; the import lists the ones missing (74 of the 81 draft relations). |
| `is_phrase` on words | Done: `master_lexicon.is_phrase` (`20261025_word_phrases.sql`). |
| Idempotent drop (a retried review never drops twice) | Done: a fruit word drops once, ever. |
| Numbers in one config file | Done: `modules/beds/seeds-harvest.config.ts`. |
| *mitigate* test fixture | Done: `database/seeds/07_seeds_harvest_fixture.sql`; the acceptance runs (`seeds-harvest.acceptance.spec.ts`) pass on a database seeded with it. |
| Analytics events | **Not possible as written**: no analytics stream. Question C. |
| Phase 3 (Vietnamese, iPad) | **Stop**: the canvas still has only the three English phone boards. Missing: `SeedDropVi`, `BedHarvestVi`, `SeedPacketsVi`, and iPad versions of all three. |
| Section 8 design guide | Done: `docs/design/garden/seeds-harvest.md`. |

## 3. Open questions (section 9), current rule kept

1. A seed already growing in another bed: **skipped** (current rule).
2. A harvested bed's fruit: **still drops** into that bed (current rule; S2's note says so).
3. Audio and IPA for phrase entries: no producer yet. With the audio rule, only related words that
   already have a lexicon entry with audio drop: 7 of the 81 draft relations today.
4. Thirsty limit: **20**, read as a cap (a day whose watering fills the goal still plants 0).

## 4. Questions for Dylan

- **A.** Draw the Home "Pick your next seed packet" card, the "incl. 2 dropped seeds" note and the
  "Want a little more?" harvest row, or keep today's behaviour (the Plant mission opens S2)?
- **B.** Draw the share card, or keep the text + link share?
- **C.** Analytics: add a small `product_events` table (and a 0-alert on `planting_empty`), or leave it?
- **D.** Seeds of a harvested bed (question 2) and the thirsty cap reading (question 4): keep?
