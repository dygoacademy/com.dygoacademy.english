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

## Sessions

Size: **S** ≈ half a usage window, **M** ≈ one full window. Dates are proposals (weekdays, one session a day, slack before gates).

| # | Date | Task | Scope (files) | Done when | Size | Needs |
| --- | --- | --- | --- | --- | --- | --- |
| **S0** | Mon 10-05 AM | Housekeeping | `phase 13 implementation plan.md` → match notes (entry points, option 2, D1 = B, T2 done); multi-word targets in `speaking-timings.ts` (`target_length` or first-word rule) + regenerate the 4 skipped words; optional nightly `speaking-generate` in the maintenance cron | Plan matches reality; 142/143 words have speaking audio | S | Dylan's answers to Q4 (phrases) and Q5 (nightly) — defaults: first word of the phrase, nightly on |
| **S1** | Mon 10-05 | T3a · Audio core (pure) | `src/lib/speaking/audio.ts`: mic permission helper, recorder (MediaRecorder mime pick, PCM fallback), decode, resample to 16 kHz, RMS envelope 100 fps; unit tests | Envelope/resample tests pass | M | — |
| **S2** | Tue 10-06 | T3b · Hooks + dev page | `useLiveLevels`, `usePlayer` (one player, 0.75×), dev page under the garden dev prefix (record → replay → show envelope + decoded `.m4a` offset vs `.wav`); **Deploy** | Dev page live on UAT | M | — |
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
