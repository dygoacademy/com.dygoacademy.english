# PR: pron-v2/step-a — Pronunciation v2, Step A

Branch `pron-v2/step-a` off `seeds-harvest/phase-2` (local git, no remote; Dylan's answer 1). Not merged,
app not deployed. Plan: Dylan's Adult Pronunciation rebuild plan of 2026-10-25, sections 2 and 3; step-1
comparison doc "Adult Pronunciation rebuild: step 1 comparison".

## Commits

| Commit | What |
| --- | --- |
| `27dae52` | Design (rule 13): P4 v2 `PronStonesResult(Vi)` and SP0 `SpeakMic(Vi)` boards, `render.js` jobs, 32 references (EN + `-vi`); old P4 references removed |
| `16077e7` | Code: rules, stored syllables, stones, SoundButton, recordings deleted, events, speech server |
| (this file's commit) | Docs: design CHANGELOG, README screens table, `pronunciation.md` guide, this PR file |

## Summary

1. **One config file each side**: `frontend/src/lib/speaking/pron-config.ts`, `backend/src/modules/speaking/pron-config.ts`. No countdown; auto-stop 1 s after the voice / 4 s / tap; under 0.3 s = P2b quiet; wobbly = syllable under 60; pass = 80+ (visual only); almost perfect = a pass with a syllable under 85. c51f28a's other-word rules kept (shorter heard word always `other_word`; another word passes only at 90+ with no wobbly syllable).
2. **Stones**: `ResultStones` draws the P4 v2 card with the board's own maths (`layoutResultStones`); states clean / close / wobbly / selected with the board's colours (new tokens `--stone-close`, `--stone-close-edge`, `--stone-selected`, `--pron-chip`, `--pron-chip-line`). `stoneView` turns the scores into states, outcome and the selected stone. Never one stone for a word unless its stored list has one syllable.
3. **SoundButton**: voices Native / You, states ready / loading / playing (tap stops) / couldn't play; one shared player (`usePlayer` now has a `tag` and `fail`), so one sound at a time. Variants `hear` (P1), `outline` (P3), `pill` (P4). P1 and P3 use it now; the P4 pills wire in with the Step B screen. The iPad layout still compiles and is unchanged.
4. **Your recording**: `useTake` keeps the take in memory only and clears it on next bee, back to the bed / close (unmount), and try again. Backend: the uploaded audio is zero-filled right after scoring (after the donation copy, for learners with an active voice-donation consent only); also on a failed check. Tested.
5. **Syllable data**: migration `20261025_word_pron_data.sql` (`syllables_us/uk` `[{text, stressed, start_ms, end_ms}]`, `pron_tip` by locale, `audio_slow_url_us/uk`). `PronDataService` fills them for new words (after READY, never delaying the learner) and `npm run pron-backfill` for existing ones (`--dry-run`, `--limit`, `--word`, `--library`, `--all`; does the work itself, so it doesn't need a deployed backend). Spans: Google TTS SSML marks scaled onto the word clip (see flags). Slow clip at speakingRate 0.7. `GET /speaking/words/:id` and the Bees list (`GET /speaking/harvest`) return the stored data in the profile accent; a word without stones is left out of the Bees, the word endpoint returns `blocked: "no_syllables"`, a word check is refused (422 `no_syllables`), all logged.
6. **Speech server**: each phone now has `start_ms`, `end_ms` (forced alignment) and `heard` (greedy CTC decode over its frames; null when the mean best-token probability is under 0.5). Only fields were added. The backend maps them per syllable (time range, score, heard IPA); a scorer split unlike the stones fails the check as `syllable_mismatch` (P3 Check again / Record again), logged.
7. **Analytics**: migration `20261025_pron_events.sql` adds the 7 `pron_*` names to the existing `product_events` table; `POST /events` (login required, each event's props allow-listed); `track()` in `src/lib/track.ts`. Wired now: `pron_scored`, `pron_not_heard`, `pron_word_played` (P1, P3, P4), `pron_chip_played` (P4's current Hear-syllable button), `pron_say_again`, `pron_skipped`, `pron_word_blocked`.
8. **Tests**: stone states, pass / almost / retry, the P4 button table, auto-stop, 0.3 s rule, blocked words, one sound at a time, recording cleared on leave and deleted after scoring, scorer mismatch, syllable building, spans, events.

## Test results

- Backend: `tsc` clean, `npm run lint` clean, jest 48 suites, 648 passed, 3 skipped.
- Frontend: `tsc` clean, `npm run lint` clean. vitest: 42 failing tests in 32 files, the same 42 as the base commit `c51f28a` (checked by running the suite with these changes stashed); none new. All pronunciation tests pass (PronounceLive 12, lib/speaking + hooks, SoundButton 3, pron-result).
- Speech server: 27 passed in the built image (`docker run … python -m pytest tests`); a live call on the real models returns the new phone fields.

## Defaults to flag (decided as the plan said; please confirm)

1. Almost perfect = a pass with any syllable under 85.
2. Skip to next bee doesn't count as a try (it sends `pron_skipped`, no attempt).
3. Say all runs every bee in the bed and stops on a retry; the `PRON_MAX_WORDS = 3` cap is removed in Step B (still 3 today).
4. A pass with a syllable under 60 shows that syllable as close (never wobbly).
5. A retry with no syllable under 60 marks the lowest as wobbly.
6. A retry with 2+ wobbly stones: the badge counts the real clean stones, the lowest is selected.
7. A retry shows only clean and wobbly stones (syllables 60–84 are clean), as on the board.
8. Scorer syllable count ≠ stored stones = scoring error. Exception: a one-stone word takes all its phones as one syllable.
9. One-syllable words with data get one stone.
10. The wobbly "a phone under 45" rule is dropped.

## Things that didn't fit the plan exactly

- **Syllable spans**: a word said one `<phoneme>` per syllable (needed for SSML marks) is about 27 % slower than the word clip ("mitigate" 0.99 s against 0.77 s voiced), so it can't be the word clip. The word clip stays as it was; the mark times are scaled onto its voiced part (read from its stored `.wav` copy). Close, not exact.
- **Slow clip** uses speakingRate 0.7 as written; the word clip is 0.85, so Slowly is only about 18 % slower than Hear it (today's Slowly plays the clip at 0.7×, about 0.6 overall). Easy to change in `PRON.slowSpeakingRate`.
- **Analytics table**: `product_events` (Seeds & Harvest, 2026-10-24) already had the asked shape and RLS, so the migration extends its name list instead of making a second table.
- **Stones show the spelling, never IPA**: the old split put IPA on the stones of 43 library words (compensation "kɑːmpen · seɪʃn"). The stones now use the spelling split to match the IPA (syllabic n/l, diphthongs, silent e in compounds, two vowels said apart); a word that still doesn't match gets no stones and is listed below.
- **P4 v2 stones on long words**: the board puts each stone in a fixed slot (334 / n). When the text is wider than its stone (5+ syllables), the text shrinks to fit (the 2026-10-18 rule grew the stone instead, which the slots can't).
- **SoundButton on P3** gets loading / playing looks the P3 board doesn't draw (same behaviour everywhere).
- **Phrases are blocked**: the scorer scores a take as one word, so "flat tyre" etc. get no stones.

## Library words with no syllable data (blocked)

From `npm run pron-backfill -- --library --dry-run` on UAT (424 library words): 12 blocked.

- Phrases (9): boarding pass, double room, main course, guided tour, flat tyre, lost property, living room, board game, ice cream.
- Spelling and IPA disagree (3): colleague, milestone, recipe.

All words (531): 19 blocked, the 12 above plus catastrophe, proactive, hello world, lady fringer, long beans, french beans, food court, lady finger (not library words). compensation and sunny now have stones (com · pen · SA · tion, SUN · ny).

Query to re-check on any database:

```sql
select normalized_word from public.master_lexicon ml
 where (syllables_us is null or jsonb_array_length(syllables_us) = 0)
   and (syllables_uk is null or jsonb_array_length(syllables_uk) = 0)
   and exists (select 1 from public.topic_words tw join public.topics t on t.id = tw.topic_id
               join public.groups g on g.id = t.group_id where tw.lexicon_id = ml.id and g.is_public)
 order by 1;
```

## UAT (run 2026-10-25, Dylan: "Please do that by yourself")

All on this Mac, 2026-10-25 (times local):

1. **Backup** (16:13): `docker exec dygo_supabase_db pg_dump -U postgres -d postgres -Fc` → `database/backups/dygo-20261025-161300-pre-pron-v2.dump` in the UAT folder (1.1 MB, checked with `pg_restore -l`).
2. **Migrations**: UAT already had every earlier migration (through `20261025_word_phrases`), so only these two were pending. Each was applied in one transaction with its row in `dygo_meta.applied_migrations`: `20261025_pron_events`, `20261025_word_pron_data`. The running backend (old code) doesn't read the new columns; no errors in its log afterwards.
3. **Backfill** (worktree code, UAT database and storage):
   - `npm run pron-backfill -- --library --dry-run` → 424 words, 12 without stones (listed above).
   - `npm run pron-backfill -- --dry-run` → 500 words, 19 without stones.
   - `npm run pron-backfill -- --library` → made 424 of 424, no failures.
   - `npm run pron-backfill` → made 120 of 120 (the other words, and the blocked ones again at no TTS cost).
   - Result: of 531 words, 510 have US stones, 511 UK stones and a tip; 531 have both slow clips; every stone has a span. Google TTS today: 198,051 of 300,000 characters.
   - A dry run after it lists 21 words: the 20 without stones, and one with UK stones only (the app uses the other accent's).
4. **Speech server**: image built from this branch's `docker/speech` and tagged as both compose images (old ones kept as `:pre-pron-v2`).
   - `docker compose up -d --no-build --no-deps speech` → `dygo_speech` recreated, healthy. A check on it returns the same top-level and word fields as before, plus `start_ms`, `end_ms` and `heard` on each phone (backward compatible).
   - `speech-2`: first refused by my session's permission check; run at Dylan's request (08:28Z): `docker compose up -d --no-build --no-deps speech-2` → `dygo_speech_2` recreated on the same image as `dygo_speech`, healthy, `/health` ok, a check returns `start_ms`, `end_ms`, `heard` on each phone.
5. Not done (as agreed): `deploy/request.md`, the app deploy, the UAT folder's branch.

## Still for Dylan

- Review and merge `pron-v2/step-a`; then deploy (the backend reads the new columns; they're already on UAT).
- Rollback if needed: `pg_restore` the backup below; speech images tagged `comdygoacademyenglish-speech:pre-pron-v2` and `comdygoacademyenglish-speech-2:pre-pron-v2`.
