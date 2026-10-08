# 🎤 Phase 13 Implementation Plan: Adult Speaking (phone)

**Document Version**: 2.4 (2026-10-05: G6 = self-hosted speech scorer on the Mac, server checking live on UAT; status refreshed. 2.3, 2026-10-04 18:50: Claude Design handover v2: server speech checking (D2 send → check → delete, D3 open), SP2 countdown + beep + auto-stop, SP3 checking / done / failed; new sessions S14–S20 and gates G6, G7. 2.2: status updated. T3–T10 built and deployed (sessions S0–S12), G1 passed, G3 fixes deployed; left: G3 re-check, S13 spend guards, G5 billing limits, beta. 2.1 matched to `phase/phase 13/PHASE-13-RECORD.md`: entry points from the Missions tab and the flashcard, items per word, D1 = B Google Cloud TTS, option 2 media host, T0–T2 done. 2.0 rewrote the plan to the Claude Design handover. See §14.)
**Date**: 2026-10-04
**Owner**: Dylan (product). Builder: Claude Code.
**Status** (2026-10-06, 23:00): **all Phase 13 build work is live on UAT** (details, decisions and history: `phase/phase 13/PHASE-13-RECORD.md`). The Pond at `/sounds` with the v2 recording flow; server checking through a backend queue (BullMQ, two self-hosted scorers on the Mac, ~50 checks a minute, busy → the phone's quick result); scoring calibrated (M4) and checked with a Vietnamese speaker; spend caps (S13 + G5). Entry points removed 2026-10-06 for a redesign; new ones (SE1 / SE2 / SE5 / SE6) await approval in the design changelog.
* Open (Dylan): approve and supply the entry-point designs, answer the design questions, Cloudflare media rules, text reviews.
* Next (Claude, when asked): two-step results, UAT backups, M4A-only storage, the approved entry points.

**Source of truth**: the Claude Design handover. If this plan and the handover disagree on *what* to build, the handover wins. If the handover and the repo disagree on *how* to build it, `CLAUDE.md` master rules win, and the difference goes in `phase/phase 13/PHASE-13-RECORD.md`.
* `phase/phase 13/PHASE-13-SPEAKING-PLAN.md`: the handover (screens, data, scoring algorithm, tasks T0–T10, copy keys)
* `phase/phase 13/phase13-speaking-design/`: the 8 phone screens (`SpeakListen`, `SpeakRecording`, `SpeakCompare`, `SpeakDone`, each en + `Vi`), the "Adult · Speaking" page of the canvas
* `phase/phase 13/PHASE-13-RECORD.md`: decisions (D1–D7 outcomes, the decisions table, G3 / S15 / S16 / G6 / M4 / entry points), the QA matrix, the speech-scorer and calibration notes, the to-do list and the session log. Moved there on 2026-10-06 from `phase/phase 13/PHASE-13-RECORD.md` and the record's session log (deleted; in git history)
* `dygo_academy_api_surface.md`, `dygo_academy_database_dictionary.md`: updated in the same commit as each backend step

---

## 1. Summary

**The weakness.** Dygo teaches a word through its meaning, IPA, audio and example sentences, but the learner never speaks. They can recognise *mitigate* on a card and still put the stress in the wrong place, or drop the final /t/ from *right*. Speaking is the skill learners in Vietnam and China say they lack most, and the one parents ask about first.

**The fix.** A **speaking session** (The Pond): 5 sentences from the learner's words, each with one target word. The learner hears a native speaker, says the sentence, and sees their voice next to the native one as two waveforms. Each word gets a mark, and the sentence gets a score shown as a garden stage (Seed · Sprout · Bloom · Fruit).

**Scope**: phone only (iPhone first; also works on Android and desktop web). The UI is designed in English and Vietnamese.
**Out of scope**: iPad layouts (designed, built later), kids' mode, reviewed Chinese UI (see D6).

| Task | Name | Size | Status | Gate |
| --- | --- | --- | --- | --- |
| T0 | Discovery: `phase/phase 13/PHASE-13-RECORD.md` (no product code) | S | ✅ 10-04 | — |
| T1 | Database: `speaking_items`, `speaking_attempts`, RLS + test (items per word since `20261004_speaking_per_word.sql`) | S | ✅ 10-04, applied | — |
| T2 | Content pipeline: UK + US native audio with word timings (Google Cloud TTS), speaking API | M | ✅ 10-04, deployed; 144 words have audio (S0 added multi-word entries) | — |
| T3 | Audio core: mic, recorder, decoder, envelope, live levels, player | S | ✅ 10-04 (S1–S2), deployed; dev page `/garden/_speaking` | ✅ **G1** passed 10-04 |
| T4 | Scorer: on-device envelope scorer | S | ✅ 10-04 (S3): 10 tests, 2.9 ms per 5 s clip; late-start fix G3-a | ✅ tests pass |
| T5 | Waveform components | S | ✅ 10-04 (S4–S5): waveforms, word marks, stage score, plants + gallery | visual check on UAT (no reference PNGs yet) |
| T6 | Screens SP1–SP4 + The Pond flow at `/sounds` | M | ✅ 10-04 (S7–S8), deployed; 3 · 2 · 1 countdown + auto-stop added (G3-b) | 🔄 **G3**: Dylan's second try on the iPhone |
| T7 | Extra states (permission, too quiet, offline…) | S | ✅ 10-04 (S9); `/sounds?state=` dev toggle | — |
| T8 | Strings in en-US / vi-VN / zh-CN | S | ✅ 10-04 (S6): `screens.speak` keys × 3 locales (vi + zh drafted) | Dylan checks vi; zh needs a native review (D6) |
| T9 | Sound Garden card on the Missions tab + "Say this one?" on the flashcard (≤ 3 per review) | S | ✅ 10-04 (S10–S11), deployed | —; **removed 10-06 for a redesign** (record §21) |
| T10 | QA pass on real devices | S | ✅ 10-04 (S12): QA matrix in the record §16, Playwright spec written (not run), deployed | 📱 device checks in record §16 for Dylan |
| T3c | Recording flow v2: countdown (tap to skip), beep + vibration, start 150 ms after the beep, auto-stop 2 s silence, not heard after 8 s, 30 s cap (S15); recording uploaded as recorded, no WAV on the phone (S15-a) | S | ✅ 10-04, committed a14c1d1, live | — |
| T4a | Check endpoint `POST /speaking/check`: `SpeechChecker` + `MacSpeechChecker`, mapper, 60 checks/hour, 8 s, audio never stored (S17 / M3) | S | ✅ 10-05, deployed | — |
| T4b | Speech scorer behind `SpeechChecker`: self-hosted on the Mac (G6; M1 spike, M2 `docker/speech`), UAT switched to `server` (M5 = S20) | S | ✅ 10-05 06:49, live | ✅ **G6** self-hosted |
| T6c | SP2 v2 + SP3 checking / done / failed, new marks, `local` / `server` switch (S18) | M | ✅ 10-05 (pixel match closed as is, S18b) | ✅ **G7** |
| T8b | New copy keys from handover §8 in 3 locales (S16) | S | ✅ 10-04, committed a14c1d1 (not heard = `quiet.*`; mic text follows the check mode) | — |
| T10b | QA matrix and Playwright for the v2 flow + dev-page run (S19); calibration with real recordings (M4) | S | ✅ S19 10-05; ✅ M4 10-06 (Vietnamese speaker on UAT) | — |
| T11 | Spend guards: daily caps for Gemini (1000 calls) and Google Cloud TTS (300000 chars, `--max-usd`) in the app (S13) + Dylan sets budget alerts, API quotas and key restrictions (G5); the speech scorer is free (self-hosted) | S | ✅ S13 10-05; ✅ G5 10-05 | before G13 beta |
| G13 | Beta week (schedule G4) | — | ✅ approved by Dylan 10-04 (before S13 / G5) | Dylan approves |

Sizes as in Phase 12: S = 2–3 days, M = about a week, for one developer working with Claude.

## 2. What the learner experiences

One session = 5 sentences from the learner's words (due and new words first), started from the Missions tab → Sound Garden → The Pond. The flashcard's "Say this one?" sheet runs SP1–SP3 for one card. The design files are exact; this table is a summary.

| Screen | Design file | What happens |
| --- | --- | --- |
| **SP1 · Listen** | `SpeakListen(.Vi).dc.html` | Compact word card (word, IPA with the stressed syllable in amber, level/part-of-speech tags, meaning). "Say this sentence" card with the target word highlighted. Native-speaker card: sentence waveform (target word band tinted), Play/Playing, **UK/US** and **1× / 0.75×** chips (picking a chip also plays). Big clay mic button → SP2. |
| **SP2 · Recording** | `SpeakRecording(.Vi).dc.html` | The sentence "follows along" (spoken words dark, the rest faded). A live clay waveform grows over the pale native one. Pulsing "Recording" dot, timer `0:02 / 0:05`. Stress tip (`mitigate /ˈmɪt.ɪ.ɡeɪt/: push on MIT`). Stop (pulsing ring) → SP3; Cancel → SP1. |
| **SP3 · Compare** | `SpeakCompare(.Vi).dc.html` | "Your sentence" + durations. Overlay / Side by side control. Native (green) vs you (clay), target-word band amber. Every word is marked: green underline = fine, amber box + short reason = needs work. Score as a garden stage ("In bloom · 82% match"). One plain-words tip. Play Native / Play You. Try again (→ SP2) / Next word (→ next SP1, or SP4 after the 5th). |
| **SP4 · Done** | `SpeakDone(.Vi).dc.html` | "You said 5 words out loud", a small garden with one plant per sentence (stage from best score), each word with a mini waveform and best %, one "Pattern to watch", Back to garden. |

**Vietnamese UI**: same layout. The sentence, the target word and the word marks stay English (that's what the learner speaks). The word card shows the Vietnamese meaning first and the English definition under it.

**States not in the canvas yet** (T7, built with existing styles; listed in the record, `phase/phase 13/PHASE-13-RECORD.md`):

| State | Where | Behaviour |
| --- | --- | --- |
| Mic permission explainer | before the first `getUserMedia` | Why Dygo needs the mic, "We don't save your recordings", "Allow microphone" |
| Permission denied | SP1 | How to enable it (iOS Safari: aA → Website Settings → Microphone), Skip speaking |
| Too quiet / nothing heard | after Stop | "We couldn't hear you. Move closer and try again." Stay on SP2 |
| Too short | after Stop | < 0.8 s of voice: "Say the whole sentence" |
| No audio support | SP1 | Hide the mic; "Speaking isn't available on this browser" |
| Offline / audio failed | SP1 | Retry; other words still work |

## 3. What exists today (checked in the code 2026-10-03/04)

| Fact | Where | What it means for Phase 13 |
| --- | --- | --- |
| Stack: NestJS API + BullMQ workers, Next.js App Router, Postgres with RLS (the API sets the user's JWT per transaction, `DatabaseService.withUser`) | `CLAUDE.md` | Not Supabase-client-from-the-browser as the handover assumes. Data goes through API endpoints; RLS does access control (master rule 1) |
| Word audio: one clip per word, Gemini TTS (`gemini-2.5-flash-preview-tts`, voice `Kore`, **US only**), saved in `master_lexicon.audio_url`. Since option 2 (record §15b) all app media lives in RustFS on the Mac at `https://media.dygoacademy.com/<key>` as AAC `.m4a` + a `.wav` copy; R2 is the fallback | `ai/gemini-enrichment.service.ts`, `storage/storage.service.ts`, `workers/enrichment.processor.ts` | Native sentence audio goes to the same store. **Gemini TTS returns no word timings**, so D1 = Google Cloud TTS |
| Example sentences: `master_lexicon.example_sentences` jsonb `[{ sentence, level, translation_hint }]`, no audio | `database/schema/02_tables.sql` | T2 takes the first example sentence for each word |
| `AudioButton` uses an `<audio>` element (no CORS needed) | `components/garden/AudioButton.tsx` | Drawing a waveform needs `fetch` + `decodeAudioData`, so **`media.dygoacademy.com` must send CORS headers** (Cloudflare header rule, notes "To do later") |
| Messages: `messages/en-US.json`, `vi-VN.json`, `zh-CN.json`; master rule 5 = all three on every UI text change | frontend | The handover's `en.json`/`vi.json` keys go into these three files (T8, D6) |
| Paths live in `src/constants/routes.ts` (protected prefixes + `GARDEN_ROUTES`) | frontend | `/sounds` is added there (master rule 4) |
| Frontend types mirror the backend, snake_case (master rule 3); API calls go through `src/lib/api-client.ts` | frontend | No generated Supabase types; hand-written types in `src/types/speaking.ts` |
| `DueCard` has `is_new` and `state` (`New`, `Learning`, `Review`, `Relearning`) | `types/srs.ts` | Picks the 5 session words (due/new first) |
| Missions tab and review card | Missions screen, `ReviewCard.tsx` / `live/ReviewLive.tsx` | Get the Sound Garden card and "Say this one?" (T9, D4) |
| RLS tests run with `./database/apply-migrations.sh --test` in a throwaway database | `database/tests/` | T1 adds `rls_speaking_test.sql` |
| No native wrapper is known (web app under pm2) | — | T0 confirms; if there is one, add `NSMicrophoneUsageDescription` (en + vi) |

## 4. Data

### 4.1 Native audio and timings (T2)

The waveform and the word marks need **real audio files plus word and syllable timings**. Browser `speechSynthesis` can't be used, because it gives no access to the samples.

`speaking_items` (final names follow the repo; T1 maps them to the real tables):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `lexicon_id` | fk → `master_lexicon` | the target word |
| `sentence` | text | the word's first example sentence |
| `target_index` | int | index of the target word in the sentence tokens |
| `audio_uk_path`, `audio_us_path` | text | storage object keys (`speaking/en/<uk\|us>/<md5(voice\|sentence)>.m4a`), the API builds URLs |
| `timings_uk`, `timings_us` | jsonb | shape below |
| `created_at` | timestamptz | |

```json
{ "duration": 3.31,
  "words": [ { "text": "Planting", "start": 0.05, "end": 0.39,
               "syllables": [ { "start": 0.05, "end": 0.22, "stressed": true },
                              { "start": 0.22, "end": 0.39, "stressed": false } ] } ] }
```

Syllables are needed only for the target word. Stress comes from the word's IPA (`ˈ`); in v1, syllable boundaries are split evenly inside the word's time range. One item per word (`unique (lexicon_id)`). A multi-word entry ("food court") targets its first word, with syllables from the first word of the IPA. Generated for every READY word with an example sentence (`npm run speaking-generate -- --all`, run by hand for new words).

### 4.2 Attempts (T1, saved in T6)

`speaking_attempts`: `id`, `user_id` (default `auth.uid()`), `item_id` → `speaking_items`, `accent` (`UK` | `US`), `score` (0–100), `stage` (`seed` | `sprout` | `bloom` | `fruit`), `word_marks` jsonb `[{ index, ok, reason: 'stress_soft' | 'missing' | 'rushed' | 'slow' | null }]`, `user_duration_ms`, `created_at`.

RLS: `speaking_items` is readable by anyone signed in, with no learner writes. `speaking_attempts` rows can be inserted and selected only by their owner. Indexes: `speaking_items(lexicon_id)` (unique), `speaking_attempts(user_id, item_id, created_at desc)`. Migration: `database/migrations/20261004_speaking.sql`; test: `database/tests/rls_speaking_test.sql`.

**Privacy (D2)**: the learner's recording is **never uploaded or stored** in v1. It stays in memory for replay and is dropped when they leave the screen. Only the numbers above are saved.

## 5. Scoring

> **Handover v2 (2026-10-04):** scoring moves to a **server speech service** that checks the recording against the reference sentence (like PTE), so silence before or after speaking doesn't matter. Flow: phone records → `POST /speaking/check` (audio + `item_id` + `accent`, signed in, 60 checks/hour) → `SpeechChecker` → provider → mapper → `SpeakingResult`; the audio is never stored or logged. Marks: `missing`, `unclear` (word accuracy < 60, with `heard`), `stress_soft` (target word, from the service or the client fallback below), `extra` (logged only); `rushed` / `slow` are dropped. Same stage thresholds and one constants file. Until the service is chosen (D3, G6), the frontend's `SpeechCheck` client runs the on-device scorer below in `local` mode. After S20 the on-device code only draws waveforms and gives the fallback stress check.

### 5.1 On-device envelope scorer (v1, built in T4; `local` mode until S20)

It works offline and in China. It measures **rhythm, stress, timing and missing words**, not individual sounds. It sits behind a `PronunciationScorer` interface so a pronunciation API can replace it later (D3). The exact algorithm is in handover §3; in short:

1. Decode both clips to mono 16 kHz; trim silence on the learner's clip (~-45 dBFS gate, 150 ms hang).
2. RMS envelopes at 100 frames/s, each normalised to its 95th percentile.
3. DTW between the envelopes (Sakoe-Chiba band ±25%) maps each native word onto the learner's timeline.
4. Word marks: `missing` (energy < 25% of native), `rushed` / `slow` (duration ratio < 0.55 or > 1.8, content words), `stress_soft` (target word's stressed-syllable peak ratio < 0.75 × native).
5. Score = 50% envelope similarity + 20% pace (best at 0.85–1.2×) + 15% word coverage + 15% target stress, clamped 0–100.
6. Stages: < 40 seed · 40–69 sprout · 70–89 bloom · ≥ 90 fruit (one constants file).
7. Tip priority: target `stress_soft` → missing words → rushed → slow → "flowed well".

Synthetic tests: identical clip ≈ 100; silence = seed with every word `missing`; flattened target syllable → `stress_soft`; ×1.15 time-stretch still ≥ 85. Target run time < 150 ms for a 5 s clip on a mid-range phone.

Files: `src/lib/speaking/envelopeScorer.ts`, `src/lib/speaking/constants.ts`.

## 6. Audio on iPhone (T3)

- `getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })` only after a tap (the SP1 mic button). Create or resume the `AudioContext` inside that tap handler.
- Mime type via `MediaRecorder.isTypeSupported` (iOS Safari gives `audio/mp4`, Chrome `webm/opus`), decoded with `decodeAudioData`. Fallback to `AudioWorklet` PCM capture if `MediaRecorder` is missing.
- SP2 live waveform: `AnalyserNode` → RMS per frame → append a bar; auto-stop at 8 s.
- One shared player; only one clip plays at a time. 0.75× uses `playbackRate`.
- Release the mic tracks on stop and on leaving (so the iOS red mic indicator goes away).
- Touch targets ≥ 44 pt, safe areas respected; `prefers-reduced-motion` turns off the pulsing ring and the moving bars.

Files: `src/lib/speaking/audio.ts`, hooks `useLiveLevels()`, `usePlayer()`.

## 7. Entry point and the garden

- **D4 Entry point** (Dylan, 2026-10-04; **both entry points removed 2026-10-06** for a redesign, record §21): Missions tab → **Sound Garden** card (shown at ≥ 5 items) → `/sounds` → The Pond; flashcard → **"Say this one?"** (≤ 3 cards per review, rule T9-a); quiz → nothing. The Sound patch drills are not in this phase's run.
- **D5 Garden effect**: SP4's small garden uses the best stage per word from this session (visual only). Attempts are saved. **No change to SRS due dates and no new daily mission** in v1.

## 8. Tasks (one commit each)

Rules for every task:
- Do tasks in order; the commit message is `phase13: <task id> <summary>` and ends with the Co-Authored-By line.
- Every commit includes a `Change Log.md` entry (master rule 8). Stage exact paths only; never stage unrelated changes in the working tree.
- Lint, typecheck and unit tests pass before committing.
- **Never deploy** (Dylan deploys to UAT via `deploy/request.md`). Never run `next dev` in `com.dygoacademy.frontend` while UAT is up (master rule 10).
- Never change auth, billing or SRS scheduling.
- When a decision below is still open, use its default, keep it behind a constant, and list it under "Decisions taken with defaults" in `phase/phase 13/PHASE-13-RECORD.md`.
- If a task is blocked, write what blocked it in the notes and only continue with tasks that don't depend on it.

| Task | What | Files (expected) | Done when |
| --- | --- | --- | --- |
| **T0** | Discovery: stack, how Review "Listen" gets audio, where audio is served (China?), native wrapper or not, test setup, words/topics tables, differences from the handover (§3), D1 options, risks | `phase/phase 13/PHASE-13-RECORD.md` | Notes committed; no other changes |
| **T1** | Migration for both tables + RLS + indexes; `rls_speaking_test.sql` wired into `apply-migrations.sh --test`; DB dictionary | `database/migrations/20261004_speaking.sql`, `database/tests/rls_speaking_test.sql`, `database/apply-migrations.sh`, `dygo_academy_database_dictionary.md` | `--test` passes: user A can't read user B's attempts; nobody can write items |
| **T2** | `scripts/speaking/generate` (backend scripts folder, repo style): for each word in a bed, take the first example sentence, get UK + US audio **with word timings** (D1), upload to R2 with deterministic keys, build timings (target syllables from IPA), upsert `speaking_items`. `--dry-run`; no overwrite without `--force`. Zod/schema check of timings. Seed Environment. API: `GET /speaking/topics/:topicId/session` (5 items, due/new first) + `POST /speaking/attempts`; API doc; `src/types/speaking.ts` | script, `modules/speaking/**` (backend), docs, types | 5 Environment items with playable UK/US audio and valid timings. With no TTS credentials: script + schema + one fixture item with a local test clip, then stop and log it |
| **T3** | Audio core (§6) + a dev-only page that records and replays, reached only by Dylan on UAT after deploy (no local `next dev`) | `src/lib/speaking/audio.ts`, hooks, dev page | Unit tests for envelope/resample pass; Dylan confirms record + replay on iPhone Safari |
| **T4** | Scorer (§5) | `src/lib/speaking/envelopeScorer.ts`, `constants.ts`, tests | The four synthetic tests pass; run time logged |
| **T5** | `Waveform`, `LiveWaveform`, `CompareWaveform` (overlay / stacked, amber target band, playhead), `WordMarks`, `StageScore`; colours and fonts from the design files mapped to design-system tokens (light + dark); ~72 bars per sentence; gallery entries | `components/garden/speaking/*.tsx`, gallery | Gallery shows each component matching the design files |
| **T6** | `/sounds` The Pond (added to `routes.ts` / `GARDEN_ROUTES`, session from `GET /speaking/session`), state machine `listen → recording → compare → (next \| done)`, SP1–SP4 per the design files, follow-along sentence, timer, Try again / Next word, SP4 summary; one `speaking_attempts` row per Compare; close → Missions tab; progress vine n/5; fixture pages + `garden:diff` en + vi ≤ 0.5% | `src/app/(garden)/sounds/**`, `screens/Speak*.tsx`, `live/SpeakLive.tsx`, fixtures | Full session works on iPhone Safari; attempts saved; Try again replaces the attempt on screen and both are stored |
| **T7** | States from §2, each reachable via a dev toggle | screens, tests | Each state has a component test; screenshots in the notes |
| **T8** | Handover §8 copy keys into en-US / vi-VN (handover strings) and zh-CN (drafted, flagged for review, D6) | `messages/*.json` | Switching locale flips every speaking string; sentence and word marks stay English |
| **T9** | Sound Garden card on the Missions tab (≥ 5 items) → `/sounds`; "Say this one?" on the flashcard after the flip, ≤ 3 per review (T9-a), via `GET /speaking/words?topic_word_ids=…` + `pickSpeakOffers` | Missions screen, `ReviewCard.tsx`, `live/ReviewLive.tsx`, backend speaking module | Card shows with ≥ 5 items; ≤ 3 offers per review |
| **T10** | QA matrix: iPhone Safari (iOS 16+), Home Screen app, Android Chrome, desktop Chrome/Safari. Permission flows, airplane mode, silent switch, Bluetooth mic, 0.75×, VoiceOver labels, reduced motion, long Vietnamese strings. Playwright for `/sounds` (mic stubbed). Master schedule changelog line | `phase/phase 13/PHASE-13-RECORD.md`, Playwright spec | Checklist complete, open issues listed; Dylan deploys to UAT (G13) |

**Actual dates**: the original plan ran 10-04 → 10-21. Dylan compressed it (schedule "Compressed run"): T0–T10 were all built and deployed on Sun 10-04 (deploys 13:41, 14:07, 14:22, plus the G3 fixes). S13 runs in the unattended `phase13-sessions` task (every 2 hours until Mon 10-05 23:30). The beta starts once G3, S13 and G5 are done.

## 9. Design reference

`phase/phase 13/phase13-speaking-design/` has the 8 phone screens exactly as on the canvas. They're HTML templates: read the markup for spacing, sizes, colours and copy. Values to copy as-is: card radius 20–26 px, page padding 16 px, button height 48–58 px, mic button 76–88 px, clay button shadow `0 4px 0 #7E3719`. Colours from the handover: native `#7FA487` / `#B7D6AE`, user `#B4552E`, needs-work `#F2D28B` / `#E0B04A`, card border `#E3DDD0`, page `#F4F1EA`, forest `#24463A`; fonts Fraunces (word, sentence, headings), DM Sans + Be Vietnam Pro (UI). Map them to existing design-system tokens where they match; add tokens where they don't. The demo waveforms in the files are made-up shapes; real ones come from the audio envelopes.

## 10. Decisions

| # | Decision | Needed by | Default in use |
| --- | --- | --- | --- |
| D1 | Where native audio + word timings come from | T2 | **Decided (Dylan, 10-04): B, Google Cloud TTS** Neural2 with SSML `<mark>` timepoints; `en-GB-Neural2-C`, `en-US-Neural2-F`; offline script |
| D2 | Store learners' recordings? | T1 | **Changed by handover v2 (2026-10-04):** send → check → delete. The recording goes to the speech service through the backend and is never written to disk, the database or logs; a local copy stays in memory for Play You and is dropped on leaving the sentence. Until S20 nothing is sent (`local` mode) |
| D3 | Which speech service checks pronunciation | G6 | **Open. Dylan chose "compare first" (2026-10-04):** S14 compares 2–3 services (e.g. Azure Pronunciation Assessment, SpeechSuper, Tencent Cloud oral evaluation) on cost per 1,000 checks, Vietnam + mainland China reachability, data retention, detail and latency, in record §18; no Google services. Dylan picks at G6. Until then the on-device scorer runs (`local`) |
| D4 | Where speaking starts | T9 | **Decided (Dylan, 10-04):** Missions tab → Sound Garden → `/sounds`; flashcard "Say this one?" |
| D5 | Does speaking affect the garden? | T6 | Visual only on SP4; attempts saved; no SRS change, no new mission |
| D6 | Chinese UI strings (master rule 5 requires zh-CN) | T8 | Add zh-CN keys drafted from English, flagged for native review; a reviewed Chinese UI stays out of scope |
| D7 | CORS on the media host (waveform needs `fetch`) | T3 | Cloudflare response-header rule `Access-Control-Allow-Origin: *` on `media.dygoacademy.com` (Dylan, notes "To do later") |

## 11. How we'll know it worked (beta, G13)

- **Use:** share of beta users who finish one full session (target ≥ 50%); sessions per active learner in the week.
- **Learning:** score on the same item, first attempt vs best attempt (target +15 points); share of `stress_soft` marks on target words falling over the week.
- **Ask the beta users** (5 questions, en/vi): did you use the mic, where did it feel awkward (public places), were the word marks fair, was the tip clear, would you pay for sound-by-sound feedback.

## 12. Risks

| Risk | Effect | Mitigation |
| --- | --- | --- |
| ~~No TTS with word timings agreed (D1)~~ | — | Closed: D1 = Google Cloud TTS, audio generated for 144 words |
| iOS Safari recording quirks (mime type, mic left open, Home Screen permissions, `AudioContext` must start in a tap) | Recording fails on the main device | §6 rules; Dylan checks record + replay on a real iPhone at T3, before the screens. **G1 passed 10-04** |
| The envelope scorer feels unfair (marks a good attempt "needs work") | Learners stop trusting the score | Thresholds in one constants file; Dylan tries it with his own voice and a Vietnamese speaker at T6; the beta question "were the marks fair". G3 found late starts scored too low: fixed (G3-a). Scores are still lenient on synthetic input; tune `constants.ts` after the G3 re-check |
| Audio unreachable from China | Chinese learners can't use it | T0 checks where R2 is served from; keep audio on the same CDN as the app if needed |
| R2 has no CORS for `fetch` (D7) | Native waveform can't be drawn | Checked in T0; fix the bucket's CORS rules |
| Learners don't want to speak in public | Low use | Session is optional; Skip speaking on permission denied; headphone tip in the mic explainer |
| TTS / Gemini cost | Bill spike | Deterministic keys, no overwrite without `--force`; S13 adds daily caps in the backend and a `--max-usd` check on `speaking-generate`; G5 sets Google Cloud budgets, quotas and key restrictions |
| Recording learners' voices | Privacy | From S20 the recording is sent for checking (D2 v2): backend keeps it in memory only, never logs it; the chosen service's data retention is part of the D3 comparison; the mic explainer and SP3 say "Your recording is checked, then deleted." |
| Speech service unreachable from China or slow | Checks fail for Chinese learners | Part of the D3 comparison; SP3 failed state (Check again / Record again) after 8 s; `local` mode stays as a fallback switch |
| Per-check cost | Bill grows with use | 60 checks/hour per user; S13 daily caps extended to the service in S20; service quota at G6 |

## 13. Backlog (not this phase)

| # | What | Notes |
| --- | --- | --- |
| B-0 | Phoneme-level pronunciation scoring | Behind `PronunciationScorer` (D3): Azure Pronunciation Assessment, or Whisper + wav2vec2 on the backend. Needs audio upload (revisit D2) |
| B-1 | iPad layouts | Already designed on the canvas |
| B-2 | Say it to unlock + `SPEAK` mission | A word's first review asks for one speaking attempt; Golden Bloom stays 3 missions (decide which) |
| B-3 | Sound traps (minimal pairs for Vietnamese / Chinese speakers) | v1 content kept: `final-t-d`, `final-s-plural`, `final-ed`, `final-k-g`, `th-t`, `th-s`, `sh-s`, `s-z`, `l-r`, `n-l`, `v-w`, `long-short-i`; hear-and-pick then say-it rounds |
| B-4 | Echo Monster (kids) | Phaser game; voice activity only, no score |
| B-5 | Slow-mo mouth | Mouth/tongue animation per hard sound |
| B-6 | Stress beats | Rhythm game for word and sentence stress |
| B-7 | AI role-play with your words, IELTS Speaking Part 1/2 | Needs B-0 |
| B-8 | Voice journal (Day 1 vs Day 30) | Needs stored audio (revisit D2), privacy note, delete-my-recordings |
| B-9 | Parrot pal (kids' shadowing) | Parrot repeats the child's recording in a squeaky voice (`playbackRate` ≈ 1.5, `preservesPitch = false`); no score, no waveforms |
| ~~B-10~~ | ~~"Say this one?" shortcut on the review card~~ | Built in Phase 13 as T9 (S11) |
| B-11 | Sound patch (second card in the Sound Garden) | Not in the design files; about 3 sessions (content + audio, drill screen, results). Needs Dylan's go-ahead |
| B-12 | Nightly speaking generation for new words | Today a manual `npm run speaking-generate -- --all` (README) |

## 14. Change history

- **2.3 (2026-10-04 18:50)**: Claude Design handover v2: server speech checking (D2 changed to send → check → delete, D3 = which service, compare first), SP2 countdown + beep + auto-stop, SP3 checking / done / failed and new marks; tasks T3c, T4a, T4b, T6c, T8b, T10b (sessions S14–S20), gates G6 and G7; the unattended run's stop rule fixed so S13 runs.
- **2.2 (2026-10-04 evening)**: status updated from `docs/phase13-schedule.md` and notes §16–17. T3–T10 done and deployed (S0–S12); G1 passed; G3 fixes (late-start scorer, 3 · 2 · 1 countdown, auto-stop, 15 s cap) deployed and waiting for Dylan's re-check; S13, G5 and the beta left. B-10 built; B-11 Sound patch and B-12 nightly generation added.
- **2.1 (2026-10-04)**: matched to the notes: entry points from the Missions tab (Sound Garden → The Pond at `/sounds`) and the flashcard ("Say this one?"), items per word, D1 = B (Google Cloud TTS), media on `media.dygoacademy.com` (option 2), T0–T2 done; remaining work in `docs/phase13-schedule.md`.
- **2.0 (2026-10-04)**: rewritten to match the Claude Design handover (`phase/phase 13/PHASE-13-SPEAKING-PLAN.md`). Dropped from v1.x: the Sound Garden hub, The Pond, the no-scoring rule, Sound traps as a Phase 13 feature (now B-3), sentence audio by Gemini only, and the review-card shortcut (now B-10). The quiz still gets no speaking.
- **1.2 (2026-10-03)**: Sound Garden hub with The Pond and Sound patch; review shortcut; no quiz shortcut.
- **1.1 (2026-10-03)**: two-waveform compare; Parrot pal as B-9.
- **1.0 (2026-10-03)**: shadowing (self-check) + Sound traps.
