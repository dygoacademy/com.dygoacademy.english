# Phase 13 · Session plan (sized for Claude usage limits)

Written 2026-10-04. Covers everything left after T0–T2 (done, deployed). Source of truth for *what* to build: `phase/phase 13/PHASE-13-SPEAKING-PLAN.md` + `docs/phase13-notes.md` (decisions, entry points §14, T9-a flashcard rule, option 2 media §15).

## How the sessions work

A **session** = one fresh Claude conversation that fits in one usage window. Sizing rules used below:

- **One task slice per session**, about 5–12 files touched, ending in **one or two commits**. Nothing that needs the whole repo in context.
- **Start cold, cheaply:** read only `CLAUDE.md`, this file, the notes sections named in the row, and the files listed. Don't re-read the handover or design files beyond the screens named.
- **Commit after each sub-step** (master rules: Change Log entry, exact paths, `phase13: Sx …`). If the limit hits mid-session, the work so far is safe.
- **End every session** by ticking the row here and adding one line to the *Session log* below: what's done, what's next, anything blocked. The next session starts from that line.
- **Never** run `next dev` in `com.dygoacademy.frontend`, never touch auth/billing/SRS scheduling. Deploy only via `deploy/request.md` where a row says **Deploy**.
- **Gates (G)** need Dylan (a device check or a decision). The session before a gate stops there.

Start prompt for each session (copy, fill in Sx):

```
Phase 13, session Sx. Read CLAUDE.md, docs/phase13-schedule.md (row Sx and the
Session log) and the notes sections it names. Do only Sx, commit after each
sub-step, then update the Session log and tick the row. Stop at the end of Sx.
```

## Compressed run: Sun 10-04 → Mon 10-05 (Dylan, 2026-10-04)

Dylan asked to finish the sessions today and tomorrow. A scheduled task (`phase13-sessions`, every 2 hours at :30, Sun 13:30 → Mon 23:30 local) runs **the next unticked session(s) in order**, as many as the usage window allows, then stops. Rules for these unattended runs:

- **Lock:** `/Users/dylan/.claude/scheduled-tasks/phase13-sessions/run.lock`. A run that finds a lock younger than 4 hours exits at once, so two runs never edit at the same time.
- **Order wins over dates:** the dates in the table are the original plan; in this compressed run a session starts as soon as the one before it is ticked. A session cut short by the usage limit is continued by the next run (Session log says where).
- **Deploys (Dylan's choice: checkpoints, if green):** only after **S2**, **S8** and **S12**, only when backend `tsc` + Jest and frontend `tsc` + `next lint` (changed files) + Vitest (no new failures versus the 66 known `messages/*.json` ones) all pass, and only between **08:00 and 22:00** local. Otherwise the deploy waits for the next run in that window. Deploy = write `deploy/request.md`, wait for `deploy/log.md`, verify www/API 200. If a deploy fails: record it, don't retry, stop deploying.
- **Gates without Dylan:** G1 and G3 (iPhone checks) don't block; Dylan checks after the S2 / S8 deploys and the findings go into the next run. **G2** (others' uncommitted `messages/*.json`) is handled, not waited on: S6 stages **only the new `speak.*` keys** (index blob = HEAD JSON + the new keys, like the CLAUDE.md one-line commit on 2026-10-04); the working files keep everyone's edits.
- **Defaults for open questions** (Dylan can change them later): Sound Garden card shows at ≥ 5 items; a Pond session counts for no mission; multi-word entries (S0): match the phrase's tokens, target = its first token, syllables from the first word of the IPA; nightly speaking generation stays manual (README command). **Sound patch is not in this run.**

## Sessions

Size: **S** ≈ half a usage window, **M** ≈ one full window. Dates are proposals (weekdays, one session a day, slack before gates).

| # | Date | Task | Scope (files) | Done when | Size | Needs |
| --- | --- | --- | --- | --- | --- | --- |
| ✅ **S0** | Mon 10-05 AM | Housekeeping | `phase 13 implementation plan.md` → match notes (entry points, option 2, D1 = B, T2 done; file stays uncommitted); multi-word targets in `speaking-timings.ts` (first-token rule, see defaults) + spec + regenerate the 4 skipped words | Plan matches reality; 142/143 words have speaking audio | S | — |
| ✅ **S1** | Mon 10-05 | T3a · Audio core (pure) | `src/lib/speaking/audio.ts`: mic permission helper, recorder (MediaRecorder mime pick, PCM fallback), decode, resample to 16 kHz, RMS envelope 100 fps; unit tests | Envelope/resample tests pass | M | — |
| ✅ **S2** | Tue 10-06 | T3b · Hooks + dev page | `useLiveLevels`, `usePlayer` (one player, 0.75×), dev page under the garden dev prefix (record → replay → show envelope + decoded `.m4a` offset vs `.wav`); **Deploy** | Dev page live on UAT | M | — |
| **G1** | Tue–Wed | **Dylan: iPhone check** | Record + replay on iPhone Safari; note the AAC offset the page shows (Chrome + Safari) | Works on a real iPhone | — | Dylan |
| **S3** | Wed 10-07 | T4 · Scorer | `src/lib/speaking/envelopeScorer.ts`, `constants.ts` (handover §3 exactly), 4 synthetic tests, run-time log | 4 tests pass; < 150 ms for 5 s | M | G1 (only if the offset needs a correction) |
| **S4** | Thu 10-08 | T5a · Waveforms | `components/garden/speaking/Waveform.tsx`, `LiveWaveform.tsx`, `CompareWaveform.tsx` + gallery entries; tokens from the design files | Gallery shows them; matches `SpeakCompare.dc.html` waveform look | M | — |
| **S5** | Fri 10-09 | T5b · Marks + stage | `WordMarks.tsx`, `StageScore.tsx` + gallery; component tests | Gallery + tests | S | — |
| **G2** | before S6 | **Messages files clean** | The uncommitted `messages/*.json` edits (someone else's) committed or dropped | `git status messages/` clean | — | Dylan |
| **S6** | Mon 10-12 | T8 · Strings | Handover §8 keys in `en-US.json`, `vi-VN.json`, `zh-CN.json` (zh drafted, flagged), mic-explainer copy drafted | All keys in 3 locales; i18n tests pass | S | G2 |
| **S7** | Tue 10-13 | T6a · Pond flow, SP1 + SP2 | `/sounds` route (`routes.ts`, `GARDEN_ROUTES`), `live/SpeakLive.tsx` (state machine, `GET /speaking/session`, prefetch 5 clips), `SpeakListenScreen`, `SpeakRecordingScreen` + fixtures | SP1 → SP2 works with fixture data; tests | M | S1–S6 |
| **S8** | Wed 10-14 | T6b · SP3 + SP4 | `SpeakCompareScreen` (scorer, marks, Try again / Next, `POST /speaking/attempts`), `SpeakDoneScreen`; fixtures; `garden:diff` en + vi; **Deploy** | Full Pond session on UAT | M | S7 |
| **G3** | Wed–Thu | **Dylan: try the Pond** | Full 5-sentence session on iPhone, own voice + a Vietnamese speaker; "were the marks fair?" | Feedback noted | — | Dylan |
| **S9** | Thu 10-15 | T7 · Extra states | Mic explainer, denied, too quiet, too short, no support, audio failed; dev toggle; component tests | Each state reachable + tested | M | S8 (G3 feedback may adjust thresholds) |
| **S10** | Fri 10-16 | T9a · Sound Garden card | Missions tab card → `/sounds` (shown at ≥ 5 items, Q2 default) | Card on UAT | S | S8 |
| **S11** | Mon 10-19 | T9b · "Say this one?" | Backend `GET /speaking/words?topic_word_ids=…` (+ spec), `pickSpeakOffers` (T9-a rule) + tests, sheet on the review card running SP1–SP3; **Deploy** | ≤ 3 offers per review on UAT | M | S10 |
| **S12** | Tue 10-20 | T10 · QA | Playwright spec for `/sounds` (mic stubbed), QA matrix in the notes, fixes for anything small; **Deploy** | Checklist done, open issues listed | M | S11 |
| **G4** | Wed 10-21 | **Beta (G13)** | Dylan deploys/approves; beta week starts | — | — | Dylan |

**Not scheduled (needs a decision first):** Sound patch (12 sound drills, `/sounds` second card): not in the design files; if it's in Phase 13 it adds about 3 sessions (content + audio, drill screen, results) after S12. The Cloudflare items in the notes' *To do later* list are Dylan's dashboard work, any time.

**Slack:** one session of slack is built in each week (the gates). If a session runs out of usage before its "Done when", the next date simply continues it; the dates after it shift by one day.

## Session log

One line per session: date · session · result · next.

- 2026-10-04 · T0–T2 (+ option 2 media, deploy) · done, see notes §9, §13, §15b · next: S0 / S1
- 2026-10-04 · S0 · done (f2b159f): multi-word targets, 12 new clips, 144 words with audio (only `analyse` left), plan file synced (uncommitted) · next: S1
- 2026-10-04 · S1 · done: `src/lib/speaking/audio.ts` + 19 tests · next: S2
- 2026-10-04 · S2 · done (8624b2a): `useLiveLevels`, `usePlayer`, dev page `/garden/_speaking`; **deployed 13:41**, www + API 200 · next: S3 (G1 iPhone check by Dylan doesn't block)
