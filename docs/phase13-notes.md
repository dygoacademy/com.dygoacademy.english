# Phase 13 (Adult Speaking): working notes

Started 2026-10-04 by an unattended run (T0 + T1 only). Source of truth: the handover `phase/phase 13/PHASE-13-SPEAKING-PLAN.md`; companion: `phase 13 implementation plan.md` v2.0. Where the repo differs from the handover, the repo's patterns win (CLAUDE.md master rules) and the difference is listed here.

Nothing in this file has been deployed. Nothing on UAT, pm2 or the running servers was touched or probed.

---

## 1. Stack (checked in the code)

| Layer | What is there | Where |
| --- | --- | --- |
| Frontend | Next.js 15 App Router, React 19, `next-intl` ~4.4, Tailwind | `com.dygoacademy.frontend/` |
| Frontend routes | Route groups `(garden)`, `(auth)`, `(home)`…; paths in `src/constants/routes.ts` (protected prefixes) and `src/constants/garden.ts` (`GARDEN_ROUTES`, e.g. `quiz(topicId)`) | master rule 4 |
| Frontend data | All calls through `src/lib/api-client.ts`; hand-written snake_case types in `src/types/*.ts` mirroring the backend | master rule 3 |
| Garden screens | Presentational `components/garden/screens/*Screen.tsx` + data wrappers `components/garden/live/*Live.tsx` + fixtures for `garden:diff` | |
| i18n | `messages/en-US.json`, `vi-VN.json`, `zh-CN.json` (all three on every UI text change) | master rule 5 |
| Backend | NestJS (port 3001), BullMQ workers, `modules/<name>/{controller,service,module}.ts` (e.g. `modules/missions/`) | `com.dygoacademy.backend/` |
| Database | Postgres 17 (supabase/postgres image) + GoTrue auth. No browser Supabase client for data: the API runs each request through `DatabaseService.withUser` (sets the JWT per transaction) and RLS does access control | `database/`, master rule 1 |
| Storage | Cloudflare R2 via the S3 SDK, `storage/storage.service.ts`; key `audio/<lang>/us/<md5(word)>.wav`; public base `R2_PUBLIC_URL` | |
| Word audio | Gemini TTS `gemini-2.5-flash-preview-tts`, voice `Kore`, 24 kHz PCM wrapped as WAV, **US only**, one clip per word; generated in `workers/enrichment.processor.ts`, backfilled by `scripts/audio-backfill.js` | `ai/gemini-enrichment.service.ts` |
| Native wrapper | **None.** No Capacitor/Cordova config, no `ios/` or `android/`, no web app manifest. `public/sw.js` is only for Web Push. So no `NSMicrophoneUsageDescription` work; Phase 13 runs in mobile Safari / Chrome | |
| Hosting | One Mac under pm2, exposed by a Cloudflare Tunnel: `www.dygoacademy.com` → :3000, `api.dygoacademy.com` → :3001 (`cloudflared-config.yml`) | |

### Tests

| Suite | Command | Notes |
| --- | --- | --- |
| Backend unit | `cd com.dygoacademy.backend && npm test` (Jest 29, ts-jest) | specs next to the code |
| Frontend unit | `cd com.dygoacademy.frontend && npm test` (Vitest 5, jsdom; `src/**/*.test.{ts,tsx}`), `npm run typecheck:test`, `npm run lint` | never `next dev` in this folder (master rule 10) |
| RLS | `./database/apply-migrations.sh --test` | builds a throwaway DB `dygo_rls_scratch` in the `dygo_supabase_db` container from the stub + schema + core fixtures, then runs `rls_test.sql`, the retention migration + test, and (from T1) the speaking migration + test; drops it at exit |
| Visual | `npm run garden:diff -- --base <url> --locale en-US,vi-VN` | pass ≤ 0.5% |
| E2E | `com.dygoacademy.automationtesting/ui` (Playwright) | |

## 2. How the Review "Listen" button gets audio today

1. `modules/srs/srs.service.ts` selects `ml.audio_url` from `master_lexicon` into each due card (`audio_url: string | null`, mirrored in `src/types/srs.ts`).
2. `components/garden/live/ReviewLive.tsx` passes `card.audio_url` as `audioSrc` to `ReviewScreen` → `ReviewCard` → `components/garden/AudioButton.tsx`.
3. `AudioButton` plays it with a plain `new Audio(src)` (`playbackRate` prop supported). If loading fails it turns into an "Audio unavailable, tap to retry" pill (built for a blocked CDN).

`master_lexicon.audio_url` is a **full public URL** (`<R2_PUBLIC_URL>/audio/en/us/<md5>.wav`), so the host is baked into every row. The word clip is the word alone, not a sentence, and has no timings, so it can't be reused for speaking items. Only the R2 upload code (`StorageService.upload`, `hasObject`) can be reused.

## 3. Where audio is served from, and China

- `R2_PUBLIC_URL` in the backend `.env` is an **`https://pub-….r2.dev`** address: R2's public development URL, not a custom domain.
- Cloudflare documents `r2.dev` as meant for development: rate-limited and without caching/WAF features. It's widely reported to be unreliable or blocked from mainland China. **Not verified from China** (I can't test that here).
- The app itself is on `www.dygoacademy.com` through a Cloudflare Tunnel (Cloudflare's global network, not its China network), so its own reachability from China is also unverified.
- Generating audio is **not** a China question: T2 runs offline as a script on Dylan's Mac. Only *serving* the files matters for learners.
- Suggestion for Dylan, not done: connect a custom domain on the `dygoacademy.com` zone to the bucket (e.g. `audio.dygoacademy.com`). Audio then goes through the same Cloudflare zone as the app (if the app loads in China, so does the audio), it gets edge caching, and CORS (D7) is set on the bucket. If `speaking_items` stores object **keys**, not URLs (planned for T1), changing the domain later means changing one env var. Existing `master_lexicon.audio_url` rows would need a one-off URL rewrite.

## 4. Data facts (for T1/T2)

- Words: `master_lexicon` (global, unique `(normalized_word, language_code)`, `ipa_us`, `ipa_uk`, `cefr_level` enum, `part_of_speech`, `definition_en`, `audio_url`, `example_sentences` jsonb `[{sentence, level, translation_hint}]`). RLS: select for everyone signed in; writes by `service_role` only.
- Beds: `topics` (belongs to a `group`, private unless `is_public`). Words are placed in beds through `topic_words` (`topic_id`, `lexicon_id` nullable until enriched, `status`). **Every learner/class has its own topics**: there's no global "Environment bed".
- In the seeds, the QA tenant has a private topic **"Nature & Environment"** (`c0c0c0c0-0000-0000-0000-000000000005`, `seeds/04_qa_words.sql`) containing `drought`, `biodiversity` and `mitigate` (sentence "Planting more trees…", matching the handover). `sustainable` is in "Business & Professional English" (`…003`). **`deteriorate` isn't in any seed.** Each seeded word has one example sentence. I didn't query the production database, so which real topic is "the Environment bed" is unknown (question Q3).
- SRS state is per user in `user_word_srs` (`fsrs_state`: New/Learning/Review/Relearning); the API's due cards carry `is_new` and `state` (`src/types/srs.ts`), enough to pick "due/new first" in T6.
- Missions: `daily_missions.type` has a check constraint `('REVIEW_DUE','LEARN_NEW','QUIZ')`. A future SPEAK mission (backlog B-2) needs a migration. Not in v1 (D5).

## 5. Differences between the handover and the repo

| Handover assumes | Repo has | What we do |
| --- | --- | --- |
| Supabase Storage | Cloudflare R2 bucket via `StorageService`, public `r2.dev` URL | Native clips go to R2 under new deterministic keys (e.g. `speaking/en/<uk\|us>/<md5(sentence)>.<ext>`, decided in T2). `speaking_items` stores keys, the API builds URLs |
| TTS with word timings | Gemini TTS, no word timings, US voice only | D1 open, options in §6 |
| `en.json` / `vi.json` | `messages/en-US.json`, `vi-VN.json`, `zh-CN.json`; master rule 5 = all three | T8 adds the §8 keys to all three; zh-CN drafted and flagged (D6). T0–T1 add no strings |
| Generated Supabase types; browser reads tables | NestJS API + RLS via `withUser`; hand-written snake_case types | T2 adds `GET /speaking/topics/:topicId/session` and `POST /speaking/attempts` in a `modules/speaking/` module and `src/types/speaking.ts` (fields exactly as the columns: `audio_uk_url`, `timings_us`, `target_index`, `word_marks`, `user_duration_ms`…). No endpoints or types added in this run |
| `word_id` → words table | `master_lexicon` | Column is `lexicon_id`, same name as in `topic_words` |
| `user_id` → `auth.users` | Every per-user table references `public.profiles(id)` | `speaking_attempts.user_id` references `profiles(id)`, default `auth.uid()` |
| Topic bed "A7" with Quiz | `components/garden/screens/TopicBedScreen.tsx` gets a `quizHref` prop from `live/TopicBedLive.tsx`; route `/topics/[id]` | T9 adds `speakHref` the same way; `/speak` goes into `PROTECTED_PATH_PREFIXES` and `GARDEN_ROUTES.speak(topicId)` |
| `lib/speaking/*` | Frontend code lives under `src/` | `src/lib/speaking/{audio,envelopeScorer,constants}.ts` |
| Native wrapper may exist | None | Skip `NSMicrophoneUsageDescription`; plain Safari permission prompt |
| Accent values `UK`/`US` | `profiles.english_variety` uses `en-GB`/`en-US` | Kept `UK`/`US` in the speaking tables as the handover says; the API maps `en-GB → UK`, `en-US → US` to pick the default chip |

## 6. Decisions D1–D7: what the code tells us

**D1 · Native audio + word timings (open, for Dylan).** Gemini TTS returns only PCM, no word boundaries. Generation is an offline script, so only the *files* need to reach China, not the provider. Options:

| Option | Timings | UK + US voices | Cost / effort | China note |
| --- | --- | --- | --- | --- |
| A. Azure AI Speech TTS | `WordBoundary` events with offset + duration per word (built in) | Yes, many en-GB and en-US neural voices | Pay per character; a new key and SDK in the backend | Generation offline, so not an issue. Azure also runs Speech in its China cloud (21Vianet), which matters only if D3 later picks Azure Pronunciation Assessment |
| B. Google Cloud TTS | SSML `<mark>` timepoints (`enableTimePointing`, v1beta1): put a mark before every word | Yes, en-GB and en-US voices (not every voice family supports SSML marks; check the chosen voice) | Pay per character; new GCP key | Google is blocked in China, but generation is offline |
| C. Amazon Polly | "Speech marks" (word start offsets) from a second request with the same text | Yes, en-GB and en-US neural voices | Pay per character; AWS key; two calls per clip | AWS has China regions; not needed offline |
| D. ElevenLabs | `with-timestamps` endpoint gives per-character times (group into words) | Yes, British and American voices | Pricier per character | Not needed offline |
| E. Forced alignment on Gemini audio | Run an aligner on the clip + known sentence: Montreal Forced Aligner, or WhisperX / wav2vec2 alignment | Kore is US only. A UK voice needs a second provider, or prompting Gemini for a British accent (not reliable) | No new paid provider; adds a Python tool to the Mac; ~20–50 ms word accuracy on clean TTS is plenty for v1 | All local |

Whichever is chosen, syllable boundaries for the target word come from the IPA (`ˈ` and `.` in `ipa_uk` / `ipa_us`), split evenly inside the word's time range (handover §2.1).

**D2 · Store recordings?** Default no. T1 will add no audio column on `speaking_attempts`, only numbers.

**D3 · Scoring source.** Default: the on-device envelope scorer (T4). Nothing in the repo constrains it.

**D4 · Entry point.** `TopicBedScreen` already has a Quiz button driven by `quizHref`, so a Speak button next to it fits. The "≥ 5 items" check needs a count from the API (T2's session endpoint can return it, or the topic payload gets `speaking_item_count`).

**D5 · Garden effect.** Default: visual only on SP4, attempts saved, no SRS change, no mission. `daily_missions.type`'s check constraint would block a SPEAK mission without a migration anyway.

**D6 · zh-CN strings.** Master rule 5 requires them. Default: draft from English, flag for native review (T8).

**D7 · R2 CORS.** Nothing in the repo sets bucket CORS (no `PutBucketCors`, no Cloudflare config file), and the docs don't mention it. Today's `<audio>` playback doesn't need CORS, so it may never have been set. **Treat it as not set.** The waveform's `fetch` + `decodeAudioData` needs `Access-Control-Allow-Origin` for `https://www.dygoacademy.com`, the stg origin `http://100.104.108.36:3000` (`env-profiles/stg.env`) and `http://localhost:3000`. Set this in the Cloudflare dashboard (Dylan), or serve speaking audio through a same-origin proxy (costs bandwidth on the Mac). Not checked against the live bucket (no server probing in this run).

## 7. Files T1–T10 will touch

| Task | Files |
| --- | --- |
| T1 | `database/migrations/20261004_speaking.sql`, `database/tests/rls_speaking_test.sql`, `database/apply-migrations.sh`, `dygo_academy_database_dictionary.md` |
| T2 | `com.dygoacademy.backend/scripts/speaking-generate.js` (backend scripts are plain `.js`, like `audio-backfill.js`), `src/modules/speaking/{speaking.module,speaking.controller,speaking.service}.ts` + specs, `src/storage/storage.service.ts` (a key builder for sentence clips), `app.module.ts`, `dygo_academy_api_surface.md`; frontend `src/types/speaking.ts`, `src/lib/api-client.ts` |
| T3 | `src/lib/speaking/audio.ts`, `src/hooks/useLiveLevels.ts`, `src/hooks/usePlayer.ts` (or under `lib/speaking/`), tests, a dev page under the garden dev prefixes |
| T4 | `src/lib/speaking/envelopeScorer.ts`, `src/lib/speaking/constants.ts`, tests |
| T5 | `src/components/garden/speaking/{Waveform,LiveWaveform,CompareWaveform,WordMarks,StageScore}.tsx`, gallery page `src/app/(garden)/garden/_gallery/page.tsx` |
| T6 | `src/app/(garden)/speak/[topicId]/page.tsx`, `components/garden/screens/Speak{Listen,Recording,Compare,Done}Screen.tsx`, `components/garden/live/SpeakLive.tsx`, fixtures, `src/constants/routes.ts`, `src/constants/garden.ts` |
| T7 | the screens above + tests |
| T8 | `messages/en-US.json`, `vi-VN.json`, `zh-CN.json` |
| T9 | `components/garden/screens/TopicBedScreen.tsx`, `components/garden/live/TopicBedLive.tsx` |
| T10 | this file, a Playwright spec under `com.dygoacademy.automationtesting/ui` |

## 8. Risks

| Risk | Note |
| --- | --- |
| D1 undecided | T2 and everything that needs real timings waits; T3–T5 can use a fixture item |
| Audio from China | `r2.dev` URL is the weakest link (§3); the existing word audio has the same problem today |
| R2 CORS (D7) | Without it the native waveform can't be drawn; playback alone still works |
| Items are per topic, topics are per class | A learner's own "Environment" bed won't have items unless T2 seeds that exact topic (see Q2) |
| `deteriorate` missing | The handover's 5 Environment words aren't all in one seeded bed |
| iOS Safari recording quirks | `audio/mp4` from MediaRecorder, AudioContext must start in a tap, mic indicator must be released; test on a real iPhone at T3 |
| No local dev server | `next dev` is banned in the frontend folder; device checks happen on UAT after Dylan deploys, or in a separate copy of the folder |
| Uncommitted work in the tree | `messages/*.json`, `QuizScreen.tsx` etc. have someone else's uncommitted edits (and the automationtesting deletions). T8 will touch the same message files: commit or stash them first |

## 9. T1 · Database

Not started yet (next task in this run).

## 10. Decisions taken with defaults

None yet: T0 takes no product decisions. D1–D7 stay as listed in §6.

## 11. Questions for Dylan

1. **D1:** which source for native audio + word timings (§6, options A–E)? Needed before T2.
2. **Items per bed or per word?** Topics belong to classes, so "the Environment bed" is one specific topic. Should speaking items instead be per word (`lexicon_id` + sentence, shared by every bed that contains the word), so any learner's bed with those words gets Speak? That needs `topic_id` to become optional (a one-line migration) and a different "≥ 5 items" count. T1 will follow the handover (per bed).
3. **Which topic is the Environment bed** to seed in T2 (UAT DB topic id)? In the seeds it's the QA "Nature & Environment" bed, which has drought, biodiversity and mitigate but not sustainable or deteriorate.
4. **Audio host for China:** OK to move the R2 bucket behind a custom domain on `dygoacademy.com` (e.g. `audio.dygoacademy.com`)? Can someone test audio loading from Vietnam and mainland China?
5. **D7 CORS:** can you add CORS rules on the R2 bucket for `https://www.dygoacademy.com`, `http://100.104.108.36:3000` and `http://localhost:3000` (GET, HEAD)? Or do you prefer a same-origin proxy?
6. **TTS budget:** a rough monthly cap for UK + US sentence audio (2 clips per word)?
7. The uncommitted `messages/*.json` edits in the working tree: whose are they, and should they be committed before T8 touches the same files?
