# Voice donation quality plan

2026-10-12 · Dylan · Living version: https://claude.ai/code/artifact/6267034a-b1cb-470b-b59a-97ab4e7e8082

## Why

Keep fewer, better recordings: filter when a recording is saved, then clean again before labelling, so the bucket only holds clips worth a teacher's time.

Today every check from every consenting learner is stored. GOPT doesn't learn from volume; it learns from clips a teacher has marked. Silent clips, the fifth retry of the same word and easy passes cost storage and teacher time, and they add privacy risk for no gain. Keeping less is also closer to the consent promise: we only hold what we use.

Targets:

- At least 50% fewer recordings stored per day, with no fewer useful clips.
- Under 10% of stored clips rejected by the export (today's first export rejected 6 of 14).
- At least 60% of stored clips in the useful groups: the scorer was unsure, a word was flagged, or the clip contains a Vietnamese problem sound.

## How recordings are kept today

- `speech-check.processor.ts` finishes each check, calls `store.done(...)`, then fires `donations.keep(userId, audio, meta)` without waiting. `meta` holds the kind (word or sentence), prompt text, target IPA, accent, device and the scorer's raw reply.
- `voice-donation.service.ts` `keep()` checks the learner has an active consent, encrypts audio and metadata (AES-256-GCM, `DYV1` layout), puts both objects in the private `voice-donations` bucket, and inserts a `voice_donations` row. It never throws, so a failure never breaks the check.
- Nothing is filtered: every attempt from a consenting learner is stored, including silent clips, retries and clips the scorer marked "not heard".
- All filtering happens later, in `dataset/run.sh export` on the Mac (`FILTERS` in `common.py`).

The scorer's reply already has what a capture-time decision needs:

| Kind | Fields |
| --- | --- |
| Sentence | `total`, `gopt.accuracy`, `gopt.total`, `gopt.aligned`, `heard_text`, `duration_ms`, `voiced_ms`, `words[]` with `score` and `status` |
| Word | `status` (`not_heard`, `other_word`, `ok`), `total`, `heard_text`, `duration_ms`, `syllables[]` with `score` and `wobbly` |

## Part 1: decide at capture time

A new `decide(userId, meta)` step runs inside `keep()` before anything is encrypted or uploaded. It returns either `{ keep: false, reason }` or `{ keep: true, keptReason }`. Rules run in this order, and the first one that matches wins.

### 1. Quality gate (never keep)

| Rule | Drop when |
| --- | --- |
| `not_heard` | word check `status` is `not_heard` |
| `too_quiet` | `voiced_ms` under 500 ms (or `heard_text` empty) |
| `too_short` / `too_long` | `duration_ms` under 500 ms or over 20 s |
| `wrong_prompt` | sentence: over 70% of prompt words missing from `heard_text`; word: `status` is `other_word` |
| `too_many_phones` | sentence longer than GOPT's 50-phone limit (unless we decide to split, see Decisions) |

These match the export's filters, so a clip that would be thrown away on the Mac is never stored.

### 2. Caps (stop repeats)

- **Attempt cap:** at most 2 kept recordings per donor per prompt, ever. Counted from `voice_donations` by `donor_code` and a normalised prompt text.
- **Daily cap:** at most 20 kept recordings per donor per day (Vietnam time). A learner who practises for an hour still donates a fair share, and no single voice dominates the set.

### 3. Smart sampling (keep the useful ones)

Always keep, and record why:

| `kept_reason` | When |
| --- | --- |
| `uncertain` | total score between 40 and 85: the scorer isn't sure, so a teacher's mark teaches the most |
| `flagged` | any word `status` other than ok, or any syllable marked `wobbly` |
| `disagree` | GOPT and the old scorer differ by 20 points or more |
| `hard_sound` | the prompt contains a Vietnamese problem sound: /θ ð ʃ ʒ r/, final consonants, consonant clusters |

Everything else (clear passes and clear fails) is kept 1 time in 5 at random, as `sample`. The model still needs some easy clips, just not most of them.

### 4. Coverage quotas

Once a prompt has 30 kept recordings from a region, stop keeping that prompt from that region unless the clip is `flagged` or `disagree`. This spreads recordings across many prompts and keeps north, central and south balanced.

All numbers are config values with these defaults, so they can be tuned without a release. A dropped clip is never uploaded; only a daily count of drop reasons is logged (no audio, no text).

## Part 2: clean up before labelling

The export already drops silent, clipped, noisy, wrong-prompt, unknown-word and over-long clips, caps attempts and speakers, and orders clips by priority. Three additions:

### Near-duplicate detection

Two attempts by the same donor at the same prompt that sound almost the same add nothing. The export compares their wav2vec2 phone posteriors (already computed for GOPT) and keeps only the higher-priority one when they are closer than a threshold. Left out as `near_duplicate`.

### Triage mode in the labelling page

`dataset/run.sh label --triage` shows one clip at a time with three keys: **K** keep, **D** drop (noise, wrong text, not a learner), **Space** replay. No sound-by-sound marking, so a teacher can sort around 300 clips an hour. Dropped clips are written to `triage/dropped.jsonl` and never reach full labelling. Teachers only spend real labelling time on clips that passed triage.

### Cleanup command (dry run first)

`dataset/run.sh cleanup` deletes recordings we will never use from the bucket and the database, so we stop holding voices for nothing:

- Candidates: everything in `rejected.jsonl` and `triage/dropped.jsonl`, plus any recording older than 90 days that is neither labelled nor in the label queue.
- By default it only prints what it would delete: counts by reason, donor count, total size. Nothing changes.
- `dataset/run.sh cleanup --apply` deletes the encrypted objects, deletes the `voice_donations` rows, and writes one line per deletion (key and reason, no audio) to `cleanup-log.jsonl`.
- **Deletion can't be undone.** Run the dry run, read it, and only then apply. Never run `--apply` on prod without Dylan's go-ahead.

Run order before each labelling round: `export` → `label --triage` → `cleanup` (dry run) → `cleanup --apply` → `label`.

## Implementation steps

Each step is small and shippable on its own. Steps 1 to 4 are backend (com.dygoacademy.backend); steps 5 to 7 are the dataset tools (com.dydoacademy.gopt/dataset).

| # | Step | Files | Tests |
| --- | --- | --- | --- |
| 1 | Migration: add `text_norm`, `region`, `kept_reason` to `voice_donations`, plus an index on (`donor_code`, `text_norm`) | new migration in `com.dygoacademy.english` | migration runs up and down on a copy of UAT |
| 2 | `decide()`: quality gate, caps, sampling, quotas as a pure function plus two count queries | `voice-donation/donation-policy.ts` (new), `voice-donation.service.ts` | `donation-policy.spec.ts`: one case per rule, sampling rate with a fixed seed, caps at the boundary |
| 3 | Call `decide()` in `keep()` before encrypting; store `kept_reason`; log daily drop counts | `voice-donation.service.ts`, `speech-check.processor.ts` (pass `gopt` and `voiced_ms` through) | `voice-donation.spec.ts`: dropped clip uploads nothing and inserts no row |
| 4 | Config: `VOICE_DONATION_MAX_PER_PROMPT=2`, `_MAX_PER_DAY=20`, `_SAMPLE_RATE=0.2`, `_PROMPT_REGION_QUOTA=30` | `.env.example`, env profiles, config module | config defaults test |
| 5 | Export: `near_duplicate` filter; read `kept_reason` into the manifest and summary | `common.py`, `export_donations.py` | `test_common.py` cases |
| 6 | Triage mode | `label_server.py`, `label.html`, `run.sh` | manual check in Playwright on synthetic clips |
| 7 | Cleanup command with dry run and `--apply` | `cleanup_donations.py` (new), `run.sh`, `README.md` | dry run on synthetic data changes nothing; apply deletes exactly the listed keys |

Rollout: ship 1 to 4 to UAT with the flag already on there, watch the daily counts for a week, tune the numbers, then prod. Steps 5 to 7 can go in any time; cleanup `--apply` on prod waits for Dylan.

## Measuring success

- **Stored per day**, before and after (from `voice_donations.created_at`): target at least 50% fewer.
- **Export rejection rate** in `summary.txt`: target under 10%.
- **Useful share**: `kept_reason` other than `sample`, target at least 60%.
- **Mistake rate in labels**: 20 to 30% of words marked with a real mistake. Much lower means we are still keeping too many easy clips.
- **Region balance**: no region above 50% of kept clips.

## Risks

| Risk | Mitigation |
| --- | --- |
| Sampling by the scorer's score biases the set toward what the old scorer finds hard | The 1-in-5 random `sample` keeps a fair slice of everything; scores pick clips, never label them |
| Caps cut out heavy users who are our best donors | 20 a day still adds up to hundreds per donor; the export's 150-per-speaker cap is the real limit |
| A bug in `decide()` drops everything | Daily drop counts by reason; alert if kept falls to 0 for a day |
| Cleanup deletes clips we wanted | Dry run by default, a log of every deletion, and prod `--apply` only with Dylan's go-ahead |

## Decisions for Dylan

1. **Long sentences:** drop clips over 50 phones (simple), or split them at word boundaries so they're kept (recommended once sentences grow)?
2. **Numbers:** keep the defaults (2 per prompt, 20 per day, 1 in 5 easy clips, 30 per prompt per region), or change any?
3. **Existing recordings:** run the new rules over what's already stored and clean up the rest after a dry run (recommended), or leave them?
