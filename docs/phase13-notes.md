# Phase 13 (Adult Speaking): working notes

Started 2026-10-04 by an unattended run (T0 + T1); T2 the same day after Dylan picked D1 = B. Source of truth: the handover `phase/phase 13/PHASE-13-SPEAKING-PLAN.md`; companion: `phase 13 implementation plan.md` v2.0. Where the repo differs from the handover, the repo's patterns win (CLAUDE.md master rules) and the difference is listed here.

Nothing in this file has been deployed. Nothing on UAT, pm2 or the running servers was touched or probed.

---

## To do later

Open items Dylan has parked, newest first. Tick them off here (and add a Change Log entry) when done.

- [ ] **Stop storing the `.wav` copy; M4A only** (Dylan, 2026-10-04). Generated audio stays AAC `.m4a` (the only format the app links). The `.wav` copy was kept to check the AAC start offset, and G1 measured 0 ms on iPhone Safari and desktop Chrome, so it's no longer needed.
  - Backend: `KEEP_WAV_COPY = false` in `src/storage/audio-encode.ts` (then drop the switch and the WAV branch in `storage.service.ts`; `.wav` only as the no-ffmpeg fallback, or make ffmpeg required); `scripts/speaking-generate.ts` and `scripts/media-migrate.ts` stop uploading the copy; update their specs.
  - Frontend: remove "Measure offset" from the `/garden/_speaking` dev page and `estimateOffsetMs` in `src/lib/speaking/audio.ts` (+ tests); check `SpeakingGallery.tsx`, `constants/garden.ts` and `media-cache.test.ts` for `.wav` references.
  - README: the audio storage section and the Cloudflare cache note (`.wav` lines).
  - Existing `.wav` objects on `media.dygoacademy.com`: delete only after Dylan confirms (nothing links them).
  - Not affected: the 16 kHz mono WAV the phone will upload to the speech service in v2 (S15 / S20); that's a recording format, not stored audio.
- [ ] **Cloudflare Cache Rule for `media.dygoacademy.com`** (added 2026-10-04). Until it's on, every audio play is served by the Mac (`cf-cache-status: DYNAMIC`) instead of Cloudflare's edge, so audio is slower far from Singapore and the Mac's upload carries all the traffic.
  - Where: Cloudflare dashboard → dygoacademy.com → **Caching → Cache Rules → Create rule**.
  - Rule: name `Media cache`; custom filter: Hostname equals `media.dygoacademy.com`; **Eligible for cache**; Edge TTL: *Use cache-control header if present, use default Cloudflare caching behavior if not*; Browser TTL: *Respect origin*; **Deploy**.
  - Also turn on **Caching → Tiered Cache → Smart Tiered Caching** (free), so other Cloudflare cities fetch from Cloudflare, not the Mac.
  - Check (run twice; the second run should show `HIT`):
    `curl -sI https://media.dygoacademy.com/test/fixture-mitigate-us.wav | grep -iE "^HTTP|cf-cache-status"`
- [ ] **Cloudflare response-header rule** `Access-Control-Allow-Origin: *` for `media.dygoacademy.com` (Rules → Transform Rules → Modify Response Header). The phone audio cache needs it for files Cloudflare has cached; do it together with the Cache Rule.
- [ ] **Cloudflare WAF rule**: block anything but GET/HEAD/OPTIONS on `media.dygoacademy.com` (Security → WAF → Custom rules). RustFS already refuses unsigned writes, this stops them earlier.
- [ ] **Cloudflare "Add visitor location headers"** managed transform, so the audio load-time log records cities, not just countries.
- [ ] **Real-iPhone check** after the Cache Rule: play a word twice in Review (second play instant), then in airplane mode (still plays).

Exact settings for all four Cloudflare rules: README → "Cloudflare dashboard rules". Done already: the bare-domain → www redirect (live, 301).

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
- Suggestion for Dylan, not done: connect a custom domain on the `dygoacademy.com` zone to the bucket (e.g. `audio.dygoacademy.com`). Audio then goes through the same Cloudflare zone as the app (if the app loads in China, so does the audio), it gets edge caching, and CORS (D7) is set on the bucket. Because `speaking_items` stores object **keys**, not URLs (T1), changing the domain later means changing one env var. Existing `master_lexicon.audio_url` rows would need a one-off URL rewrite.

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
| Speak button on the topic bed (A7), `/speak/[topicId]` | **Changed by Dylan 2026-10-04 (§14):** no topic-bed entry. Speaking starts from the Missions tab (Sound Garden → The Pond) and from a flashcard ("Say this one?"); quiz has none | Items are per word; routes and screens follow §14 |
| `lib/speaking/*` | Frontend code lives under `src/` | `src/lib/speaking/{audio,envelopeScorer,constants}.ts` |
| Native wrapper may exist | None | Skip `NSMicrophoneUsageDescription`; plain Safari permission prompt |
| Accent values `UK`/`US` | `profiles.english_variety` uses `en-GB`/`en-US` | Kept `UK`/`US` in the speaking tables as the handover says; the API maps `en-GB → UK`, `en-US → US` to pick the default chip |

## 6. Decisions D1–D7: what the code tells us

**D1 · Native audio + word timings: decided 2026-10-04 by Dylan = B, Google Cloud TTS** (pricing and effort compared in §12). Gemini TTS returns only PCM, no word boundaries. Generation is an offline script, so only the *files* need to reach China, not the provider. Options:

| Option | Timings | UK + US voices | Cost / effort | China note |
| --- | --- | --- | --- | --- |
| A. Azure AI Speech TTS | `WordBoundary` events with offset + duration per word (built in) | Yes, many en-GB and en-US neural voices | Pay per character; a new key and SDK in the backend | Generation offline, so not an issue. Azure also runs Speech in its China cloud (21Vianet), which matters only if D3 later picks Azure Pronunciation Assessment |
| B. Google Cloud TTS | SSML `<mark>` timepoints (`enableTimePointing`, v1beta1): put a mark before every word | Yes, en-GB and en-US voices (not every voice family supports SSML marks; check the chosen voice) | Pay per character; new GCP key | Google is blocked in China, but generation is offline |
| C. Amazon Polly | "Speech marks" (word start offsets) from a second request with the same text | Yes, en-GB and en-US neural voices | Pay per character; AWS key; two calls per clip | AWS has China regions; not needed offline |
| D. ElevenLabs | `with-timestamps` endpoint gives per-character times (group into words) | Yes, British and American voices | Pricier per character | Not needed offline |
| E. Forced alignment on Gemini audio | Run an aligner on the clip + known sentence: Montreal Forced Aligner, or WhisperX / wav2vec2 alignment | Kore is US only. A UK voice needs a second provider, or prompting Gemini for a British accent (not reliable) | No new paid provider; adds a Python tool to the Mac; ~20–50 ms word accuracy on clean TTS is plenty for v1 | All local |

Whichever is chosen, syllable boundaries for the target word come from the IPA (`ˈ` and `.` in `ipa_uk` / `ipa_us`), split evenly inside the word's time range (handover §2.1).

**D2 · Store recordings?** Default no. T1 has no audio column on `speaking_attempts`, only numbers.

**D3 · Scoring source.** Default: the on-device envelope scorer (T4). Nothing in the repo constrains it.

**D4 · Entry point: decided by Dylan 2026-10-04, see §14.** Missions tab → "Sound Garden" card → `/sounds` (The Pond + Sound patch); flashcard → "Say this one?" sheet (≤ 3 cards); quiz → nothing. Not a Speak button on the topic bed.

**D5 · Garden effect.** Default: visual only on SP4, attempts saved, no SRS change, no mission. `daily_missions.type`'s check constraint would block a SPEAK mission without a migration anyway.

**D6 · zh-CN strings.** Master rule 5 requires them. Default: draft from English, flag for native review (T8).

**D7 · R2 CORS.** Nothing in the repo sets bucket CORS (no `PutBucketCors`, no Cloudflare config file), and the docs don't mention it. Today's `<audio>` playback doesn't need CORS, so it may never have been set. **Treat it as not set.** The waveform's `fetch` + `decodeAudioData` needs `Access-Control-Allow-Origin` for `https://www.dygoacademy.com`, the stg origin `http://100.104.108.36:3000` (`env-profiles/stg.env`) and `http://localhost:3000`. Set this in the Cloudflare dashboard (Dylan), or serve speaking audio through a same-origin proxy (costs bandwidth on the Mac). Not checked against the live bucket (no server probing in this run).

## 7. Files T1–T10 will touch

| Task | Files |
| --- | --- |
| T1 (done) | `database/migrations/20261004_speaking.sql`, `database/tests/rls_speaking_test.sql`, `database/apply-migrations.sh`, `dygo_academy_database_dictionary.md` |
| T2 (done, see §13) | `com.dygoacademy.backend/scripts/speaking-generate.ts`, `src/modules/speaking/**`, `src/storage/storage.service.ts`, `src/app.module.ts`, `package.json` (scripts), `dygo_academy_api_surface.md`; frontend `src/types/speaking.ts`, `src/types/index.ts`, `public/audio/speaking-fixture/` |
| T3 | `src/lib/speaking/audio.ts`, `src/hooks/useLiveLevels.ts`, `src/hooks/usePlayer.ts` (or under `lib/speaking/`), tests, a dev page under the garden dev prefixes |
| T4 | `src/lib/speaking/envelopeScorer.ts`, `src/lib/speaking/constants.ts`, tests |
| T5 | `src/components/garden/speaking/{Waveform,LiveWaveform,CompareWaveform,WordMarks,StageScore}.tsx`, gallery page `src/app/(garden)/garden/_gallery/page.tsx` |
| T6 | `/sounds` (The Pond) per §14 instead of `/speak/[topicId]`: `src/app/(garden)/sounds/**`, `components/garden/screens/Speak{Listen,Recording,Compare,Done}Screen.tsx`, `components/garden/live/SpeakLive.tsx`, fixtures, `src/constants/routes.ts`, `src/constants/garden.ts` |
| T7 | the screens above + tests |
| T8 | `messages/en-US.json`, `vi-VN.json`, `zh-CN.json` |
| T9 | Sound Garden card on the Missions tab, and "Say this one?" on the review card (`ReviewCard.tsx` / `ReviewScreen.tsx`, `live/ReviewLive.tsx`) instead of `TopicBedScreen.tsx` |
| T10 | this file, a Playwright spec under `com.dygoacademy.automationtesting/ui` |

## 8. Risks

| Risk | Note |
| --- | --- |
| No Google key yet | Real clips wait for `GOOGLE_TTS_API_KEY`; T3–T5 use the fixture (`public/audio/speaking-fixture/`) |
| Google gives word **starts** only | Word ends = next start pulled back over silence on the PCM; fine for v1 envelope scoring, worth eyeballing on the first real clips |
| Audio from China | `r2.dev` URL is the weakest link (§3); the existing word audio has the same problem today |
| R2 CORS (D7) | Without it the native waveform can't be drawn; playback alone still works |
| Pond scope = Review's new-card scope | Every READY word the learner can read, which includes other people's **public** topics (same as `SrsService.findDue`). If The Pond should only use words already in their garden, it's a one-line change |
| `deteriorate` missing | The handover's 5 Environment words aren't all in one seeded bed |
| iOS Safari recording quirks | `audio/mp4` from MediaRecorder, AudioContext must start in a tap, mic indicator must be released; test on a real iPhone at T3 |
| No local dev server | `next dev` is banned in the frontend folder; device checks happen on UAT after Dylan deploys, or in a separate copy of the folder |
| Uncommitted work in the tree | `messages/*.json`, `QuizScreen.tsx` etc. have someone else's uncommitted edits (and the automationtesting deletions). T8 will touch the same message files: commit or stash them first |

## 9. T1 · Database (2026-10-04)

- Migration `database/migrations/20261004_speaking.sql`: `speaking_items` and `speaking_attempts` with the handover's columns mapped to the repo (§5), check constraints, RLS, grants, and indexes `speaking_items(topic_id)` (+ `lexicon_id` for the FK) and `speaking_attempts(user_id, item_id, created_at desc)`.
- RLS: `speaking_items`: select for any signed-in user (`using (true)`, like `master_lexicon`), no write grants for learners; writes only by `service_role`. `speaking_attempts`: select and insert only where `user_id = auth.uid()`; no update or delete (no grant, no policy). Nothing for `anon`.
- Test `database/tests/rls_speaking_test.sql`, wired into `apply-migrations.sh --test` after the retention test. **Result: passed** (`./database/apply-migrations.sh --test`, exit 0, "Phase 13 T1 speaking RLS assertions: all passed."; 30 assertions: shape, item constraints, anon, items readable by learners in two tenants, no learner or teacher can insert/update/delete items, owner insert with defaulted `user_id`, attempt constraints, Priya / Sarah (teacher) / Dana can't read Alex's attempts, Priya can't insert for Alex, nobody can update or delete attempts).
- Also checked: the whole chain (stub + schema + every file in `migrations/`) applies cleanly in a separate throwaway DB, dropped afterwards. The real database was not touched; the migration is **not applied** to it (Dylan runs `./database/apply-migrations.sh --migrations` when ready).
- Bug caught by the test: the first version of the timings shape check let `{"words": []}` (no `duration`) through, because `jsonb_typeof(null) = 'number'` is NULL and a NULL check passes. Fixed with `is not distinct from`.
- Types: no generated types in this repo. The frontend type file `src/types/speaking.ts` is written by hand in T2 with the API, snake_case, mirroring the response (not the raw table: the API returns URLs, not R2 keys).

## 10. Decisions taken with defaults

| # | Decision | Default taken | Why / how to change |
| --- | --- | --- | --- |
| T1-a | ~~One item per word per bed~~ → **one item per word** | `unique (lexicon_id)`, no `topic_id` (`20261004_speaking_per_word.sql`) | Dylan's answer to Q2 (§14). Duplicates merged into the oldest item, attempts moved, nothing lost |
| T1-b | ~~Deleting a bed cascades to its items~~ | Gone with `topic_id`; items live as long as the word | — |
| T1-c | Deleting a word | `on delete restrict`, like `topic_words.lexicon_id` | Lexicon rows are never deleted in practice |
| T1-d | Audio columns | Store R2 object **keys**, not URLs | Host can change (§3) without rewriting rows |
| T1-e | Accents | Each accent optional, but path and timings come together, and at least one accent per item | D1 might give one voice first. Make both `not null` later if wanted |
| T1-f | Timings check | Object with numeric `duration` and array `words`; full schema checked in T2 (`validateTimings`, see T2-c) | Keeps the DB check simple |
| T1-g | Attempts are history | No update / delete for learners | Same as retention tables; Try again = new row |
| T1-h | `user_id` | References `profiles(id)`, default `auth.uid()` | Repo pattern |
| T1-i | Accent values | `'UK'` / `'US'` (handover), not `en-GB` / `en-US` | API maps from `profiles.english_variety` |
| T1-j | Teacher / group views of attempts | None (owner only) | Handover: admin/group views out of scope |
| T1-k | `score`, `target_index` | `smallint` | Ranges are tiny |
| T2-a | Google voices | `en-GB-Neural2-C`, `en-US-Neural2-F` (both female, like today's Kore), overridable with `SPEAKING_VOICE_UK` / `SPEAKING_VOICE_US` | Neural2 supports SSML `<mark>`; Chirp 3 HD doesn't take SSML, Studio is 10× the price. Listen to both and swap if you prefer others |
| T2-b | Clip format | 24 kHz 16-bit mono WAV (`LINEAR16`) | No MP3 encoder delay shifting the timings; same `.wav` as word audio; ~140 KB per 3 s clip |
| T2-c | Timings validation | Hand-written `validateTimings` instead of zod | The backend has no zod; adding a dependency for one shape wasn't worth it. Easy to swap |
| T2-d | Script language | TypeScript run with `ts-node --transpile-only` (other scripts are plain `.js`) | It reuses `speaking-timings.ts` and `StorageService.speakingAudioKeyFor` from `src/` instead of copying them; no `nest build` needed (`dist/` is what pm2 runs) |
| T2-e | Reuse after a DB reset | Timings JSON stored next to each clip in R2 (`.json`) | Rebuilding `speaking_items` costs no TTS |
| T2-f | API auth | Google API key (REST), not a service account | Simplest for an offline script; restrict the key to the Text-to-Speech API |
| T2-g | Sentence | The word's first `example_sentences` entry | Handover §2.1 |
| T2-h | Session order | Due/new (no SRS row, `New`, or due now) first, then `next_due_at`, then item age | Handover T6 "due/new first" |
| T2-i | Fixture | macOS `say` (Samantha US, Daniel UK), one word at a time, so word timings are exact | Robotic and slow (~6 s); only for building T3–T5 |
| S0-a | Multi-word entries | Tokens matched in a row (last one may be inflected), target = the phrase's first token, syllables from the first word of the IPA; if that word has no primary stress its secondary stress (else its first syllable) is promoted | Compressed-run default (schedule). A later `target_length` could highlight the whole phrase |
| S1-a | Recorder format order | `audio/mp4` first, then WebM/Opus, WebM, Ogg/Opus (`RECORDER_MIME_CANDIDATES`) | iOS Safari records mp4; putting it first keeps newer Safari from picking WebM, whose decoding is newer there. Chrome will also pick mp4 where it supports it; the S2 dev page shows whether it decodes. One array to reorder |
| S1-b | Resampler | Box-filter average when downsampling, linear interpolation when upsampling; no FIR filter | Enough for a 100 fps energy envelope; keeps the code small and fast |
| S1-c | PCM fallback | `ScriptProcessorNode` (deprecated but everywhere) wrapped as 16-bit WAV, not an `AudioWorklet` | A worklet needs a separate module file served by Next; only used where `MediaRecorder` is missing |
| S2-a | Dev page copy | `/garden/_speaking` labels are English only, in a `DEV_COPY` constant, not in `messages/*.json` | A dev tool for Dylan, not learner UI (like the `_tokens` test strings); keeps S2 off the message files until S6 |
| S2-b | Dev page access | Signed-in only (under `/garden`, not added to `PUBLIC_GARDEN_DEV_PREFIXES`) | Avoids touching the auth path list; Dylan is signed in on his iPhone. It reads `GET /speaking/session` for a real clip |
| S2-c | Player | One module-level `HTMLAudioElement` shared by every `usePlayer()` (`useSyncExternalStore`), not Web Audio | Plays `.m4a` URLs and recording `blob:` URLs the same way, streams, and keeps one clip at a time |
| S3-a | DTW step penalty | Non-diagonal DTW steps cost `DTW_STEP_PENALTY` = 0.5 extra when choosing the path; similarity still = 1 − mean \|a − b\| along it | Not in the handover. Without it a left-out word was squeezed onto one frame of its neighbour: marked `rushed`, never `missing` (score 98). Set it to 0 to get the plain §3 DTW |
| S3-b | Trim | Gate −45 dBFS with the 150 ms hang on **both** sides, and the same trim on the native clip (timings shifted) | Leading silence in either clip would otherwise count as a timing difference |
| S3-c | Pace curve | Full points at 0.85–1.2×, falling linearly to 0 at 0.4× and 2.0× | The handover gives only the best range |
| S3-d | Stress score | `clamp(user ratio ÷ native ratio, 0, 1)`; full points when the target has one syllable; 0 when the target is missing | The handover gives only the `stress_soft` threshold |
| S3-e | Tip params | `speak.tip.stress` → `{ word, syllable }` (index of the stressed syllable; the screen turns it into text from the IPA), `missing` → `{ words }`, `rushed` / `slow` → `{ word }`, `flowed` → none | Copy keys added in S6 |
| S4-a | Waveform colours | Existing CSS variables, no new tokens: native `--stage-tree-canopy` (#7FA487), pale `--stage-sprout` (#B7D6AE), learner `--color-primary` (#B4552E), SP3 band `--color-gold-light` (#F2D28B), SP1 band `--color-on-forest-muted` (#DDE7DA), line `--color-border`, head `--color-text` (`WAVE_COLORS` in `waveformBars.ts`) | Every handover colour already exists; `globals.css` also has someone else's uncommitted edits. The app has no dark theme yet, so nothing to map there |
| S4-b | Gallery labels | The speaking gallery section's labels are English constants until S6 | Keeps S4 off the message files (G2) |
| S4-c | Playing sweep | CSS keyframes in a `<style>` inside the SVG, run once over the clip's length; hidden with `prefers-reduced-motion` | No `globals.css` change; the design's 2.2 s loop becomes the real clip length |
| S4-d | Live bars | One learner bar per 1/72 of the native clip (mean of the 20/s live levels), full height at RMS 0.2, capped at 72 bars | Puts the learner's voice on the native timeline as SP2 shows; a slower learner runs to the end |
| S5-a | Stage plants | `SpeakingPlant` draws fruit / bloom / sprout exactly as the SP4 garden in `SpeakDone.dc.html`; the seed (not in the design) is a seed on a small mound in `--stage-seed`. The stage score shows it on the 60 px forest circle | One drawing for SP3 and SP4; the garden's `PlantGlyph` has different stages (flower, tree, wilting) |
| S5-b | Segments | Stage score fills segments up to and including the reached stage (bloom = 3 of 4), as the design shows | — |
| S6-a | Namespace | `screens.speak.*` instead of the handover's `speak.*` | Repo convention: every screen's copy lives under `screens.<name>` |
| S6-b | Pond wording | Header "Speaking · The Pond" (no topic: the Pond mixes the learner's words), SP4 sub "Your voice watered your garden" | The handover's `{topic}` came from the dropped topic-bed entry |
| S6-c | Staging with others' edits | Index = HEAD JSON + `screens.speak` (written with `git hash-object` / `update-index`); the working `en-US` / `vi-VN` files keep everyone's uncommitted edits plus the same keys | Compressed-run rule for G2 |
| S6-d | Extra keys | Added now so later sessions don't touch the message files: T7 states (`mic`, `denied`, `quiet`, `short`, `unsupported`, `audioFailed`), tips beyond the stress one, mark reasons, waveform labels, Sound Garden card (`soundGarden`), "Say this one?" (`sayThis`) | — |
| S7-a | `/sounds` | Goes straight into The Pond (no hub page): the Sound patch, the hub's other half, isn't in this run. Close → Missions tab | When the Sound patch is built, `/sounds` becomes the hub and The Pond moves under it |
| S7-b | SP2 timer | "0:02 / 0:05": the part after the slash is the native clip × 1.5, rounded up, at most 8 s; recording still auto-stops at 8 s | The design shows 0:05 for a 3.3 s sentence |
| S7-c | SP2 stress tip | Plain text (`stressTip` has arguments, not tags), with the stressed syllable in IPA ("push on mɪt") | Turning IPA into spelling ("MIT") isn't reliable; next-intl can't bold an argument without a tag |
| S7-d | Follow-along | Words dark up to the one the native speaker would have reached at the elapsed time | No speech recognition in v1 |
| S7-e | Mic errors on SP1 | For now one line above the mic (denied / unsupported / failed); the full T7 states come in S9 | — |
| S8-a | Play button colours | SP3's Play Native / Play You backgrounds (#F1F6EF, #FBEFE9) and the clay border (#EBC7B6) stay as arbitrary values; the green border uses `--color-sprout-border` | No tokens for them yet, and `globals.css` has others' uncommitted edits |
| S8-b | SP4 score pill | Green at ≥ 80 %, gold below (`DONE_GREEN_FROM`) | Matches the design (82 / 88 / 94 green, 58 / 71 gold) |
| S8-c | SP4 pattern | The tip that came up most across the session's best attempts (ties by the handover's priority), shown as "Pattern to watch:" + that tip's title; none when all flowed | No separate pattern copy in §8 |
| S8-d | Attempt saving | Fire-and-forget `POST /speaking/attempts` after each score (Try again = another row); a failed save isn't retried or shown | Attempts are history for the beta numbers; the learner's flow shouldn't stop for them |
| S8-e | SP4 mini waveforms | The native envelope of each sentence | The design draws them green (native colour) |
| S8-f | `garden:diff` | **Not run.** It needs `next dev` (not allowed in this folder) or production reference pages, and reference PNGs for SP1–SP4 that don't exist (the design is `.dc.html`; making PNGs means rendering them in Chrome) | Dylan: decide whether to add SP1–SP4 references; otherwise compare on the iPhone at G3 |
| S9-a | Too quiet / too short | Shown on SP1 above the mic (one tap to try again), not on SP2 as the plan says; the attempt isn't scored on screen or saved. Quiet = no voice or every word `missing`; short = under 0.8 s of voice (`MIN_VOICE_MS`) | SP2 is the live recording screen; an idle SP2 would need a second layout. A recording that can't be decoded counts as quiet |
| S9-b | Mic explainer | Shown on the first mic tap when the browser doesn't already report the mic as granted and it wasn't accepted before (`localStorage` `dygo:speak-mic-explained`); Allow asks for the mic inside that tap | Safari has no permission query on older iOS, so "unknown" also shows it once |
| S9-c | Mic errors | `denied` and `no-device` / `failed` show the denied card (how to turn it on, Try again, Skip speaking → Missions); `unsupported` the no-support card | One card for "the mic isn't working" keeps the copy short |
| S9-d | Audio failed | When the native clip can't be loaded or decoded: Retry (fetch again) or Next word (skip this sentence; SP4 lists only spoken ones); the mic is hidden because the attempt couldn't be scored | — |
| S9-e | Dev toggle | `/sounds?state=mic\|denied\|quiet\|short\|unsupported\|audioFailed` opens SP1 showing that state (works on UAT, changes nothing else) | Screenshots for the notes: take them on the iPhone after the next deploy (none taken here: no browser on a dev server) |
| S10-a | Card place and look | Between the week header and the harvest card on the Missions tab, in the existing card style, with a lotus mark, "Sound Garden", the body line and "The Pond · N sentences ready"; the whole card links to `/sounds`. Not on the canvas reference page (prop left out) | No design for the card exists; keeps A4's pixel diff unchanged |
| S10-b | Fresh Pond per visit | `GET /speaking/session` is refetched on every mount (the Missions card and `/sounds` share it); The Pond takes its five sentences only from this visit's fetch | Otherwise a second Pond in the same visit would repeat the first five |
| S11-a | Offer button | A small "Say this one?" pill (mic icon) left of the audio button, only after the flip, on the up-to-3 picked cards; rating and keyboard shortcuts unaffected (shortcuts pause while the sheet is open) | No design for it; T9-a point 3 |
| S11-b | The sheet | A full-screen layer over the review (SP1–SP3 for that sentence, `SpeakFlow` in single mode); Close, Escape or "Back to the card" return to the same card; the attempt is saved like The Pond's | The SP screens are phone-height layouts; a half sheet would crop them |
| S11-c | When offers are off | No offers when the browser can't record, the mic permission reads `denied`, or the learner tapped "Skip speaking" in the sheet (rest of the session) | T9-a point 5 |
| S11-d | S11 deploy | Not deployed after S11 although the row says so: the compressed run deploys only after S2, S8 and S12 | Run rules win |
| S12-a | Playwright spec not run | `ui/tests/sounds.spec.ts` is written and type-checked, not run: its global setup signs the fixture user in on the live site, and this unattended run doesn't enter passwords on a non-local host | Dylan runs it (command in §16) |
| S12-b | Master schedule line | Not added: `dygo_academy_master_project_schedule.md` has someone else's uncommitted edits | Add the Phase 13 line when that file is committed |

## 11. Questions for Dylan

1. ~~D1~~ decided: B, Google Cloud TTS. **Next step for you:** create a Google Cloud API key with the Text-to-Speech API enabled (billing on), add `GOOGLE_TTS_API_KEY=` to the root `.env`, then run `npm run speaking-generate -- --topic <id> --dry-run` and without `--dry-run` (§13).
2. ~~Items per bed or per word?~~ **Answered 2026-10-04:** entry from the Missions tab and flashcards (§14), so items are **per word**. Done in `20261004_speaking_per_word.sql`.
3. ~~Which topic is the Environment bed?~~ No longer needed: items are per word. Run the script with `--topic <id>` for one bed's words, or `--all` for every word without an item.
4. **Audio host for China:** custom domain: benefits explained to Dylan 2026-10-04 (§15), his decision pending. **Testing from Vietnam and China: yes** (Dylan, 2026-10-04); checklist in §15.
5. **D7 CORS:** can you add CORS rules on the R2 bucket for `https://www.dygoacademy.com`, `http://100.104.108.36:3000` and `http://localhost:3000` (GET, HEAD)? Or do you prefer a same-origin proxy?
6. **TTS budget:** a rough monthly cap for UK + US sentence audio (2 clips per word)?
7. The uncommitted `messages/*.json` edits in the working tree: whose are they, and should they be committed before T8 touches the same files?

## 12. D1 options compared: pricing and effort (2026-10-04)

List prices checked on the web on 2026-10-04 (third-party summaries where the vendor page didn't render); confirm in each console before paying.

**Volume.** Two clips per word (UK + US), made once and cached in R2 (deterministic keys), so the bill is one-off per word, not per learner. A sentence is ~70 characters. Google bills the SSML input, and with a `<mark>` before every word that's up to ~270 characters per clip (upper bound; if marks aren't billed it's ~70).

| | A. Azure TTS | D. ElevenLabs | **B. Google Cloud TTS (chosen)** |
| --- | --- | --- | --- |
| List price | Neural $16 / 1M chars; HD $22 / 1M | Flash/Turbo $0.04 / 1K chars ($40 / 1M); Multilingual v2 / v3 $0.08 / 1K ($80 / 1M); plans from $6/month (Starter) and $22/month (Creator) | Neural2 $16 / 1M chars; Standard/WaveNet $4 / 1M (no Neural quality); Chirp 3 HD $30 / 1M (no SSML, so no marks) |
| Free each month | 0.5M chars | small free tier, not for commercial use | 1M chars on Neural2 |
| Environment bed (20 words, 40 clips) | free | ≈ $0.11–0.22 | free (≈ 11K chars) |
| 1,000 words (2,000 clips) | ≈ 140K chars → free | ≈ $6–11, or a $6–22 plan | ≈ 140K–540K chars → free |
| 10,000 words (20,000 clips) | ≈ 1.4M chars → ≈ $14 | ≈ $56–112 | ≈ 1.4M–5.4M chars → ≈ $6–70 (after the free 1M) |
| Word timings | `WordBoundary` events: start **and duration** per word (most exact) | `with-timestamps`: start/end per **character** (group into words) | `<mark>` timepoints: word **starts** only; ends estimated from silence (done) |
| UK + US voices | many en-GB / en-US neural voices | British and American voices in the library; accent consistency varies by voice | Neural2 en-GB and en-US |
| Voice quality | very good | best, most natural | good (Neural2) |
| What's needed | Azure account, Speech resource (key + region), `microsoft-cognitiveservices-speech-sdk` | ElevenLabs account + key; REST only | Google Cloud project, billing, API key; REST only |
| Effort from here | ~0.5–1 day: swap `synthesizeGoogle` for an Azure synthesizer; map boundary events (it also emits punctuation) to tokens | ~0.5–1 day: swap the synthesizer; group character times by token; ask for `pcm_24000` and wrap it as WAV | **Built** (§13). Missing: an API key |
| Later fit | Same vendor as Azure Pronunciation Assessment (D3 / backlog B-0), which also runs in Azure China | none for scoring | Google is blocked in China, but generation is offline, so it doesn't matter |

Only the synthesizer function in `scripts/speaking-generate.ts` is provider-specific: timings, validation, R2 keys, upsert and API are shared, so switching to A or D later costs about a day and doesn't change the database or the frontend.

## 13. T2 · Content pipeline and API (2026-10-04)

- **Script** `com.dygoacademy.backend/scripts/speaking-generate.ts` (`npm run speaking-generate`, `:prod`): for each READY word in `--topic`, takes the first example sentence, finds the target word (inflections OK: *contaminated*, *ecosystems*), asks Google Cloud TTS (`v1beta1 text:synthesize`, `LINEAR16`, `enableTimePointing: SSML_MARK`) for UK and US with a `<mark>` before every word, builds and validates the timings, uploads `speaking/en/<uk|us>/<md5(voice|sentence)>.wav` + `.json` to R2, and upserts `speaking_items` as `service_role`. `--dry-run` (lists clips and the cost, writes nothing), `--force` (otherwise never overwrites: an accent already in the DB is skipped, and clips already in R2 are reused with their stored timings), `--accents`, `--limit`.
- **Timings** `src/modules/speaking/speaking-timings.ts`: SSML with marks, timepoints → word starts, word ends = next start trimmed over silence (−40 dBFS, 10 ms frames), target syllables from the IPA split evenly with primary stress (`ˈ`) marked, `validateTimings`, WAV read/write. 17 unit tests.
- **API** `src/modules/speaking/`: `GET /api/v1/speaking/session` (The Pond; optional `?topic_id=`), `GET /api/v1/speaking/words/:topicWordId` ("Say this one?") and `POST /api/v1/speaking/attempts` (documented in `dygo_academy_api_surface.md`). All queries run as the learner (`withUser`), so RLS decides access. 9 unit tests. The exact SQL the service sends (captured from it) was run as Alex against a throwaway database built from the schema, fixtures and every migration: due word first, then a new word, then the rest; Vietnamese meaning joined; the topic filter works; a word he can't read returns nothing; attempt insert takes `user_id` from `auth.uid()`.
- **Frontend types** `src/types/speaking.ts` (snake_case, mirrors the backend), exported from `src/types/index.ts`. No API calls yet (T6).
- **Fixture** `com.dygoacademy.frontend/public/audio/speaking-fixture/`: `fixture-mitigate-uk.wav`, `fixture-mitigate-us.wav` and `fixture-mitigate.json` (sentence, target index, IPA, timings), made with `npm run speaking-generate -- --fixture --out ../com.dygoacademy.frontend/public/audio/speaking-fixture`.
- **Checks**: backend `tsc --noEmit` clean, Jest 321/321, eslint clean on the new files; frontend `tsc --noEmit` and `next lint` clean on the new types. The script's word query was run against the QA "Nature & Environment" bed in a throwaway database: 20 READY words, all with a sentence. Without a key, the script stops with "GOOGLE_TTS_API_KEY is not set… Nothing was generated."
- **Not done (blocked on the key)**: no real clips, no `speaking_items` rows. The migration isn't applied to the real database yet either. To finish T2:
  1. `./database/apply-migrations.sh --migrations` (applies `20261004_speaking.sql`).
  2. Add `GOOGLE_TTS_API_KEY=` to the root `.env`.
  3. `cd com.dygoacademy.backend && npm run speaking-generate -- --topic <Environment bed id> --dry-run`, then without `--dry-run`.
  4. Restart the backend so the new `/speaking` routes load (the API code isn't deployed).
- The QA seed's Environment bed has 20 words; the handover's 5 aren't all in it (`sustainable` is in another bed, `deteriorate` nowhere). The script makes items for every READY word in the bed (`--limit`), so the session picks 5 of them.

## 14. Entry points (Dylan, 2026-10-04, answer to Q2)

```
Missions tab ── "Sound Garden" card ─────► Sound Garden (/sounds)
                                             ├─ 🪷 The Pond: shadowing with the two waveforms
                                             └─ 🌱 Sound patch: the 12 sound drills
Flashcard ── "Say this one?" (≤ 3 cards) ─► shadow sheet over the card
Quiz ── nothing
```

This brings back v1.2's entry points (`phase 13 implementation plan.md` §14), replacing the handover's D4 (a Speak button on the topic bed, `/speak/[topicId]`). The Pond is the handover's SP1–SP4 flow; the "Say this one?" sheet runs SP1–SP3 for one card (v2.0 backlog B-10).

**Done now (data and API only, no UI):**
- `database/migrations/20261004_speaking_per_word.sql`: `speaking_items` loses `topic_id`; one item per word (`unique (lexicon_id)`). Duplicates are merged into the oldest item and their attempts moved onto it (tested: two items for one word, an attempt on each → one item, both attempts kept). RLS test updated (`--test` passes).
- API: `GET /speaking/session` (The Pond: the learner's words with items, due → new → rest, optional `?topic_id=`), `GET /speaking/words/:topicWordId` (the flashcard sheet; `topic_word_id` is what `DueCard` already has). The topic-scoped `GET /speaking/topics/:topicId/session` is removed.
- Script: items per word; `--topic` picks a bed's words, `--all` every READY word without an item. If a word's sentence changes, the other accent's old clip is dropped instead of kept with the wrong sentence (tested).

**Questions this raises (UI tasks, not built):**
1. **Sound patch (12 drills)** was backlog B-3 in v2.0 (`final-t-d`, `final-s-plural`, `final-ed`, `final-k-g`, `th-t`, `th-s`, `sh-s`, `s-z`, `l-r`, `n-l`, `v-w`, `long-short-i`). Is it in Phase 13 now? It needs minimal-pair content and audio (the same Google pipeline can make it) and screens that aren't in the design files yet.
2. **When does the Sound Garden card show?** Proposed default: when `item_count ≥ 5` (enough for one Pond session).
3. ~~Which 3 cards get "Say this one?"~~ **Dylan, 2026-10-04: "you can make it by yourself".** Decided, see T9-a below.
4. **Does a Pond session count for anything** (a mission, the streak)? Default stays D5: visual only, no SRS change, no mission.

### T9-a · Which flashcards offer "Say this one?" (decided by Claude, 2026-10-04)

At most **3 cards per review session**, chosen once when the session's cards load, so the offers don't depend on how the learner rates:

1. **Eligible:** the card's word has a speaking item, and the learner hasn't spoken that item today (no `speaking_attempts` row since local midnight), so the same word isn't offered again in a second session the same day.
2. **Order of preference:** new words first (`is_new`): the first meeting is the best moment to learn the sound. Then forgotten words (`state = 'Relearning'` or `lapses > 0`). Then everything else. Ties go by the card's place in the queue. Take the first 3.
3. **Where:** after the card is flipped (the learner has seen the meaning and heard the word), as a small optional button next to the audio button. It never blocks rating. Keyboard users can skip it.
4. **Counts as used** once it's shown, whether the learner taps it or not, so a session never has more than 3 offers.
5. **Not offered at all** when speaking isn't possible: no `MediaRecorder` / `getUserMedia`, or the microphone was denied earlier (the sheet's "Skip speaking" also hides the rest of the session's offers).
6. The sheet runs SP1 → SP2 → SP3 for that one sentence and saves an attempt like The Pond. Closing it returns to the same card. It never changes the card's SRS grade (D5).

Why these choices: new and forgotten words are where pronunciation help matters most; 3 per session keeps reviews quick (the backlog note for B-10 set the same cap); picking up front keeps it predictable and testable.

**Implementation (T9):** the review screen needs to know which of its cards have an item and were spoken today. Add one batch endpoint, `GET /api/v1/speaking/words?topic_word_ids=…` → `[{ topic_word_id, item_id, spoken_today }]`, rather than changing the SRS due-card query. The choice itself is a pure function (`pickSpeakOffers(cards, lookup) → topic_word_ids`) with unit tests. The constant `SPEAK_OFFERS_PER_SESSION = 3` lives in `src/lib/speaking/constants.ts`.

## 15. Audio host: custom domain, and the Vietnam / China test (2026-10-04)

**Why move the bucket behind `audio.dygoacademy.com`** (today: `https://pub-….r2.dev`):

| | `r2.dev` (today) | Custom domain |
| --- | --- | --- |
| Meant for | Development (Cloudflare's own wording); rate-limited | Production |
| Edge cache | None: every play goes to the bucket | Cloudflare cache, so a clip is served from the city nearest the learner after the first play. Our clips are already sent as `immutable` |
| Reachability | A shared `*.r2.dev` name; reported blocked or unreliable in mainland China | Same zone and network as `www.dygoacademy.com`: if the app loads, the audio loads |
| Control | Almost none | Cache rules, hotlink protection, analytics, WAF, like the rest of the zone |
| Name | Tied to a random bucket id | Ours; we can move storage later without changing URLs |
| Cost | Free (R2 has no egress fees) | Free too; the domain is already on Cloudflare (the tunnel uses it) |

What it does **not** fix: Cloudflare's normal network has no servers inside mainland China, so the app and the audio are both served from nearby regions (Hong Kong, Singapore, Tokyo). For fast, reliable China delivery the options are Cloudflare's China Network (Enterprise plan + an ICP licence) or a China CDN. The test below shows whether that's needed.

**Steps if Dylan says yes:** R2 → bucket → Settings → Custom Domains → add `audio.dygoacademy.com`; set `R2_PUBLIC_URL=https://audio.dygoacademy.com`; one SQL update to rewrite the host in existing `master_lexicon.audio_url` rows (speaking items store keys, so they need nothing); set the bucket CORS rules (D7); turn off the `r2.dev` URL once nothing uses it.

**Test checklist (testers in Vietnam and mainland China).** Each on a phone, once on Wi-Fi and once on mobile data, no VPN:

| # | Do | Note |
| --- | --- | --- |
| 1 | Open `https://www.dygoacademy.com` and sign in | Loads? Seconds to the garden? |
| 2 | Review → tap the speaker on 5 different words | Plays every time? "Audio unavailable" shown? Delay before sound |
| 3 | Open one word's audio URL directly (Dylan sends one `r2.dev` link from `master_lexicon.audio_url`) | Plays? Seconds to start |
| 4 | Open `https://www.dygoacademy.com/audio/speaking-fixture/fixture-mitigate-us.wav` (served by the app itself, after the next deploy) | Plays? Compare with 3: same origin as the app vs `r2.dev` |
| 5 | After the custom domain exists: the same clip on `https://audio.dygoacademy.com/…` | Plays? Seconds to start |

Report: city, network (Wi-Fi / which mobile carrier), pass / fail and seconds for each row, and a screenshot of any error. Read it as: if 1 passes and 3 fails, the custom domain fixes it; if 1 also fails or is slow in China, we need the China CDN option.

### 15a. Our own media host: `media.dygoacademy.com` (2026-10-04)

Dylan chose `media.dygoacademy.com` for the server copy (RustFS on this Mac, through the Cloudflare Tunnel). Live and checked from the internet: `https://media.dygoacademy.com/test/fixture-mitigate-us.wav` → 200 `audio/wav` in ~0.14 s, byte ranges supported, anonymous PUT / listing → 403. Same keys as R2, so the fallback URL is the R2 URL with the host swapped. Testers in Vietnam and China can use that test URL for row 5 of the checklist above (it's on our domain now, before R2 gets its custom domain).

Still to do in the Cloudflare dashboard (README "Cloudflare dashboard rules"): the bare-domain redirect (today `dygoacademy.com` returns HTTP 530), a Cache Rule for `media.*` (today `cf-cache-status: DYNAMIC`, so every play reaches the Mac), a response-header rule `Access-Control-Allow-Origin: *`, and a WAF rule allowing only GET/HEAD/OPTIONS. Not done yet: writing clips to RustFS as well as R2 (script + worker) and the fallback URLs in the API (§ "where do we save the audio").

### 15b. Option 2 built (2026-10-04)

- **Store:** app media is in RustFS (`STORAGE_PROVIDER=rustfs`, default), public at `https://media.dygoacademy.com/<key>`. Each clip is stored as AAC `.m4a` (linked, ~6–7× smaller) and the original `.wav` at the same key (`KEEP_WAV_COPY`, kept for the WAV support period, Dylan). Existing word audio was moved from R2 (124 files) and the 19 `master_lexicon.audio_url` values now point at `.m4a` on `media.dygoacademy.com`.
- **Phone:** the service worker caches media cache-first (range requests served from the cache for iOS Safari); Review prefetches the next 3 cards' audio. The speaking screens (T6) will prefetch their 5 clips the same way (`prefetchMedia`).
- **Measuring:** every play is logged (`media_load_events`: ms from tap to sound, cache hit, network type, Cloudflare country/city). Turn on Cloudflare's "Add visitor location headers" managed transform to get cities. Report:

```sql
-- Audio start time by place, last 7 days (run as postgres in the dygo_supabase_db container)
select coalesce(country, '?') as country, coalesce(city, '?') as city,
       count(*) as plays,
       percentile_disc(0.5) within group (order by ms) as p50_ms,
       percentile_disc(0.9) within group (order by ms) as p90_ms,
       round(100.0 * avg(from_cache::int)) as pct_from_phone,
       round(100.0 * avg((outcome = 'error')::int), 1) as pct_failed
  from public.media_load_events
 where created_at > now() - interval '7 days'
 group by 1, 2
 order by plays desc;
```

- **Needs Dylan:** deploy (backend: RustFS storage, AAC, telemetry endpoint; frontend: service worker, prefetch, logging); apply migrations `20261004_speaking*.sql` and `20261004_media_load_events.sql` (`./database/apply-migrations.sh --migrations`); after the deploy, `npm run media-migrate` once more for words added meanwhile; Cloudflare rules (README table) incl. the CORS header rule, which the phone cache relies on for files Cloudflare cached; real-iPhone check of playback from the cache.

**Applied and deployed 2026-10-04 (Dylan asked):** migrations `20261004_media_load_events`, `20261004_speaking`, `20261004_speaking_per_word` applied to the real database (28 → 31 tables, all with RLS; grants checked: `speaking_items` SELECT, `speaking_attempts` SELECT+INSERT, `media_load_events` INSERT only, nothing for anon). Deployed via `deploy/request.md` (all 4 steps OK; working tree incl. others' uncommitted edits). Live checks: www 200, API health 200, `/speaking/session` and `/telemetry/media` 401 signed out; as the `alex@dygo.test` fixture: session `{ item_count: 0 }` (no speaking audio yet), telemetry stored with Cloudflare country `SG` (test row deleted); `sw.js` serves the media cache; `media-migrate` re-run: nothing left on R2 URLs. Still open: Google TTS key (speaking audio), Cloudflare cache / CORS / WAF / visitor-location rules, real-iPhone check of cached playback.

**Speaking audio generated 2026-10-04** (Google Cloud TTS key in the root `.env`, Dygo project, key restricted to the Text-to-Speech API): first the Nature & Environment bed (40 clips, 19 s), then `--all`: **138 words × UK + US = 276 clips**, each stored as `.m4a` + `.wav` + `.json` in RustFS. 72,776 characters in total, inside the 1M free Neural2 characters a month (≈ $1.16 at list price). Checks: all 276 timings valid, every target word has a stressed syllable; clips 1.86–5.87 s (median 3.82 s); energy check on 12 random clips: all 123 word spans contain speech and the gaps between words are silent; `mitigate` US: 3 syllables, stress on the first. Live API as `alex@dygo.test`: `item_count` 38, a 5-item Pond session, due words first, `media.dygoacademy.com` URLs.

Skipped (5): `analyse` has no example sentence; `food court`, `french beans`, `long beans`, `hello world` are multi-word entries and `findTargetIndex` only matches one token. Follow-up: support a target that spans several tokens (e.g. `target_index` + `target_length`, or mark the phrase's first word), or give those words single-word sentences.

**S0 (2026-10-04):** multi-word entries supported (`findTargetIndex` matches the phrase, `targetIpaFor`; 2 new tests). `speaking-generate --all` then made 12 clips: `food court`, `french beans`, `long beans`, `hello world`, plus `compensation` and `dissatisfaction` (added since T2). 3,406 SSML chars (free tier). **144 words have speaking audio; only `analyse` (no example sentence) is left.** Spot check: `.m4a` 200 on `media.dygoacademy.com`, `food` / `french` targets with one stressed syllable.

**S3 scorer (2026-10-04):** `src/lib/speaking/envelopeScorer.ts` + `constants.ts`. Synthetic sentence (8 tone-burst words, target with 3 syllables, native 24 kHz, learner 48 kHz) scores: identical **100**, flattened target **89** (`stress_soft` + stress tip), ×1.15 slower **99**, one word left out **93** (`missing`), ×0.5 (twice as fast) **86**, ×1.6 **91**. Run time **2.9 ms** for a 5 s clip in Node/jsdom on the Mac (target < 150 ms on a mid-range phone; even 20× slower fits). **Watch at G3:** the §3 formula is lenient (50 points of envelope similarity stay high for anything with the same rhythm), so a dropped word or rushing still lands in bloom/fruit; if Dylan finds the marks too kind, scale the DTW cost (e.g. similarity = 1 − 2 × cost) in `constants.ts`.

**S6 strings (2026-10-04):** 90 keys under `screens.speak` in all three locales. **Dylan, please check:** (1) the Vietnamese strings that are *not* in handover §8 (drafted by Claude): `header`, `close`, `accent`, `micButton`, `stopButton`, `view.label`, `waveLabel.*`, `mark.missing/rushed/slow`, `tip.missing/rushed/slow/flowed`, `playNative`, `playYou`, `done.sub` (changed: no topic), `done.gardenLabel`, `mic.*`, `denied.*`, `quiet.*`, `short.*`, `unsupported.*`, `audioFailed.*`, `soundGarden.*` ("Vườn âm thanh", "Ao sen"), `sayThis.*`; (2) the mic explainer wording in English (`mic.*`, handover §5 "draft and flag"); (3) all zh-CN (the file is a draft for native review, D6).

## 16. QA matrix (S12, 2026-10-04)

What the unattended run could check is automated (Vitest, mocked mic/API); everything that needs a real phone is for Dylan. ✅ = checked here, 📱 = Dylan on the device, — = not applicable.

| Check | Automated | iPhone Safari (iOS 16+) | Home Screen app | Android Chrome | Desktop Chrome | Desktop Safari |
| --- | --- | --- | --- | --- | --- | --- |
| Record → replay, envelope (`/garden/_speaking`) | ✅ recorder / decode / envelope unit tests | ✅ G1 10-04: recorded 8.01 s (183 KB), decoded 8.02 s at 16 kHz; envelope shown; Play me 1× and 0.75× loud enough, plays with the silent switch on | 📱 | 📱 | 📱 | 📱 |
| `.m4a` vs `.wav` offset (dev page "Measure offset") | ✅ estimator test (±21 ms) | ✅ G1 10-04: **0 ms** (diligent 3176 ms, mitigate fixture 5565 ms, both 48 kHz, same length) | — | 📱 | ✅ G1 10-04: 0 ms | 📱 |
| Full Pond session, 5 sentences, Done | ✅ `SpeakLive` flow test; Playwright spec (not run, S12-a) | 📱 G3 | 📱 | 📱 | 📱 | 📱 |
| Marks fair? (own voice + a Vietnamese speaker) | ✅ synthetic scorer tests only | 📱 G3 | — | — | — | — |
| Mic explainer → Allow; Not now | ✅ | 📱 first visit | 📱 (Home Screen apps ask again) | 📱 | 📱 | 📱 |
| Mic denied → steps, Try again, Skip | ✅ | 📱 aA → Website Settings | 📱 | 📱 | 📱 | 📱 |
| Too quiet / too short | ✅ | 📱 whisper; say one word | — | 📱 | 📱 | — |
| No support (no MediaRecorder / mic) | ✅ | — | — | — | 📱 an old browser | — |
| Audio failed (airplane mode before opening) | ✅ Retry / Next word | 📱 airplane mode | 📱 | 📱 | — | — |
| Silent switch on: native clip still audible? | — | 📱 | 📱 | — | — | — |
| Playback volume right after recording (iOS can route to the earpiece) | — | 📱 | 📱 | — | — | — |
| Bluetooth mic / AirPods | — | 📱 | — | 📱 | — | — |
| 0.75× (pitch kept) | ✅ player rate test | 📱 | — | 📱 | 📱 | 📱 |
| Red mic indicator off after Stop / Cancel / leaving | ✅ release called | 📱 | 📱 | 📱 | — | — |
| VoiceOver: waveforms, buttons, marks read sensibly | ✅ labels in tests | 📱 | — | — | — | 📱 |
| Reduced motion: no pulsing ring / sweep | ✅ CSS `motion-safe` / media query | 📱 | — | — | 📱 | — |
| Long Vietnamese strings (vi-VN UI) fit | — | 📱 | — | — | 📱 | — |
| Sound Garden card on Missions (≥ 5 items) | ✅ | 📱 | — | — | 📱 | — |
| "Say this one?" ≤ 3 per review, after the flip; Back to the card | ✅ rule, hook, card, single-mode tests | 📱 | — | 📱 | 📱 | — |
| **v2 (S19, 2026-10-05)** | | | | | | |
| 3 · 2 · 1 (0.9 s a step), tap to skip, Cancel during the count | ✅ SpeakLive + FlowCheck tests; Playwright | 📱 | 📱 | 📱 | 📱 | 📱 |
| Beep at the end of the count (`/garden/_speaking` → 3) | ✅ beep tests | 📱 silent switch **off**: hear it; **on**: expect silence (the clay mic is the cue) | 📱 | 📱 | 📱 | 📱 |
| Vibration at the beep | ✅ called where supported | — (iOS Safari has none) | — | 📱 | — | — |
| Beep not in the recording (dev page → 3 → "beep in clip") | ✅ `toneRms` + FlowCheck leak test | 📱 should say "no" | 📱 | 📱 | 📱 | 📱 |
| Stops by itself 2 s after you finish; "not heard" after 8 s of nothing; 30 s cap | ✅ `voiceEnded` / `notHeard` tests; Playwright auto-stop | 📱 quiet room, then a noisy café | — | 📱 | 📱 | — |
| Server check: checking → done, marks missing / heard "…" (UAT `server`) | ✅ merge + SpeakLive server tests; Playwright (stubbed) | 📱 G7 + calibration recordings (M4) | 📱 | 📱 | 📱 | 📱 |
| Server check fails → "Couldn't check this one", Check again / Record again | ✅ SpeakLive + Playwright (503) | 📱 airplane mode after recording | 📱 | 📱 | — | — |
| Mic explainer says "checked, then deleted" in `server` mode | ✅ | 📱 first visit (or a private tab) | 📱 | 📱 | 📱 | 📱 |
| Check time (M4A upload + scorer) | ✅ 1.3–2.1 s end to end on the Mac (M3) | 📱 on 4G / Wi-Fi from Vietnam | — | 📱 | — | — |

**Run the Playwright spec** (v2 since S19; signed-in fixture user from `ui/.env.e2e`, Chrome's fake mic plays the fixture sentence once so the auto-stop fires, speaking API incl. `/speaking/check` stubbed in the `{ success, data }` envelope so nothing is written and the scorer isn't called; Dylan runs it, since it signs in to the live site):
`cd com.dygoacademy.automationtesting/ui && BASE_URL=https://www.dygoacademy.com npx playwright test tests/sounds.spec.ts --project=iphone-16`

**Open issues / watch list**
1. ~~Scores are lenient (S3 note)~~ Replaced by server checking (M5, 2026-10-05); still to calibrate (M4): a wrong target word can reach fruit.
2. ~~`garden:diff` for SP1–SP4 not run~~ References exported (S14b); SP2 passes, SP3 0.5–1.4 %, no SP1 / SP4 fixture pages; S18b closed as is.
3. The drafted Vietnamese strings and the mic explainer need Dylan's check (S6); zh-CN is a draft.
4. ~~iOS after-recording playback volume and the silent switch are unknowns until G1/G3.~~ Checked at G1 (10-04): loud enough at 1× and 0.75×, plays with the silent switch on.
5. The Sound patch (second half of the Sound Garden) isn't built (not in this run).
6. New words still need a manual `npm run speaking-generate -- --all` (README); `analyse` has no example sentence.

## 17. G3 · Recording flow "like PTE" and late starts (Dylan, 2026-10-04)

Dylan's first Pond session on the iPhone: the recording screen came too fast to read the sentence, and starting 1–2 s late pulled the score far down although the reading was good.

### G3-a · The scorer finds the learner's voice, not the first noise (decided with Dylan, 2026-10-04)

Cause: `loudRange` took the first 10 ms frame above −45 dBFS as the start of speech. The mic-tap click, a breath or plain room noise on an iPhone is above that, so a late start counted 1–2 s of waiting as speech: pace points lost, DTW (band 25 %) couldn't line the words up, words marked missing. The synthetic tests had silent leads, so they never showed it.

Fix (`speechRange`, learner's clip only; the native clip keeps `loudRange`): skip the first 150 ms; gate = highest of −45 dBFS, the clip's noise floor (5th percentile) + 10 dB, its peak (99th percentile) − 30 dB; voice starts and ends with ≥ 120 ms above the gate (clicks don't count). Constants `SPEECH_*` in `constants.ts`. Tests: 1 s and 2 s late with room noise (−38 dBFS) and two clicks score within 5 points of on time (were −6 and −14 on the synthetic sentence) and measure the same voice length; noise alone is still "nothing heard".

### G3-b · One tap, 3 · 2 · 1, stops by itself (decided with Dylan, 2026-10-04)

Dylan asked for a simple flow, like PTE Read Aloud (read, beep, record, stops after silence). Considered and dropped: press-and-hold to record (two ways to do one thing).

- Tap the mic once → SP2 shows the whole sentence (no fading) with **3 · 2 · 1** (`COUNTDOWN_SECONDS`); the mic is already open, the recorder starts when the count ends. No stop button during the count; Cancel works.
- Recording stops by itself 1.5 s after the voice ends (`voiceEnded`, same gate idea as G3-a on the live bars; never before any voice, so a late start just waits). Tap to stop still works. Hard cap 15 s (`MAX_RECORDING_MS`, was 8 s, handover §4).
- Follow-along highlight 1.5× slower than the native clip (`FOLLOW_ALONG_SLOWDOWN`); timer target native × 2 (`RECORDING_TARGET_FACTOR`, was × 1.5, S7-b).
- New strings `getReady`, `countdownLabel`, `readAfterCount`, `autoStop` in all three locales (vi and zh drafted by Claude).
- Differs from the design files (SP2 has no countdown state) and from handover §4 (8 s cap). The `/garden/_speaking` dev page keeps its plain Record button, now max 15 s.

## 19. SP2 / SP3 v2 UI (interactive session, 2026-10-04 evening)

Built from `SpeakRecording.dc.html` / `SpeakCompare.dc.html` (handover v2) at Dylan's request, ahead of S15 / S16 / S18. Uncommitted and not deployed at the time of writing. Choices made:

- **Check stays on the phone.** `lib/speaking/check.ts`: `localCheck` (the envelope scorer behind a `SpeechCheck` interface) with `withTimeout` (8 s → SP3 failed). The server check (S17 / S20) plugs in behind the same interface. Until then nothing is sent, so the mic explainer's "We don't save your recordings" stays true, and SP3's "Your recording is checked, then deleted." is true too (checked on the phone, dropped on leaving).
- **Rushed / slow marks hidden.** Handover v2 has no rushed / slow; `forDisplay` shows those words as fine and turns a rushed / slow tip into "flowed well". The saved attempt keeps the scorer's marks (backend types unchanged).
- **`unclear` + `heard` are display-only** (`ShownMark`) until the backend's word marks gain them in S17; the on-device check never produces them. The reference fixture uses them to match the canvas ("heard “affects”").
- **Stressed syllable in spelling** ("push on MIT", "Say MIT-i-gate", "MIT is too soft", SP4 "TER"): `spellingSegments` shares the word's letters out in proportion to the IPA syllable lengths (no spelling dictionary). Exact for *mitigate*; may split oddly for long words (*biodiversity*).
- **Waveform first.** SP3 draws both envelopes as soon as the clip decodes (`compareEnvelopes`, trimmed like the scorer), so nothing moves when the check returns.
- **SP3 geometry from the canvas:** 322×92 overlay (bars 4–86), side-by-side rows 42 tall 50 apart, bands at y −4 / 100 tall, target .32, other words .18.
- **Known canvas difference:** the header says "Speaking · The Pond" (D4: entry from Missions), the canvas "Speaking · Environment". Expect a small text diff on every SP reference.
- **"Next word" works while checking** (canvas); a result that arrives after moving on is dropped and not saved.
- New token `--color-speak-faded` (#9c8f78) for the checking sentence and missing words; keyframes `speak-pop` / `speak-shimmer` (still under reduced motion).

### S15-a · No WAV on the phone: upload the recording as recorded (Dylan, 2026-10-04)

The S15 row had a 16 kHz mono WAV encoder so the phone could upload what speech services "usually" take. Dropped: the phone sends the recording exactly as `MediaRecorder` made it, `audio/mp4` (AAC) on iPhone Safari and `audio/webm` (Opus) on Chrome; a 30 s AAC clip is a few hundred KB, under S17's 1 MB limit.

- **S14 / G6:** the D3 comparison must list each service's accepted input formats; one that takes AAC and WebM/Opus directly is preferred.
- **S17:** `POST /speaking/check` accepts `audio/mp4` and `audio/webm` (≤ 1 MB).
- **S20:** if the chosen service only takes WAV/PCM, the backend converts with ffmpeg in memory (already a backend dependency for the `.m4a` encoding), never written to disk.
- The PCM-to-WAV fallback recorder (browsers without `MediaRecorder`) stays; it already produces WAV.
- Also moved: the `/garden/_speaking` countdown → beep → auto-stop test run goes to S19 (QA). The real flow on `/sounds` already does it.
- Related, separate: the stored `.wav` copy of native clips is a to-do to remove (*To do later*).

### S16 · Strings v2 (2026-10-04 evening)

Handover §8 keys are in `screens.speak` in all three locales: `getReady`, `countdownHint`, `countdownButton` (aria), `startingSoon`, `pauseStops`, `checking`, `privacy`, `failed.title / body / checkAgain / recordAgain`, `mark.heard`, `mark.unclear`, `tip.also.both / missing / unclear`, `tip.stress.bodyShort`, `nativeAccent`, `playingShort`, `playNativeLabel`, `playYouLabel`. Removed (no longer used by the v2 screens): `timer`, `countdownLabel`, `readAfterCount`, `autoStop` (G3-b), `mark.rushed`, `mark.slow`, `playNative`. Kept: `tip.rushed` / `tip.slow`, because the on-phone scorer still gives them until S20.

- **S16-a · "Not heard" reuses `quiet.title` + `quiet.body`** (Dylan, 2026-10-04). The handover's `speak.notHeard` ("We couldn't hear you. Move closer and try again.") is the same words as the existing T7 card, split into title and body, in all three locales. No new key.
- **S16-b · Mic explainer stays "stays on this phone" until S20** (Dylan, 2026-10-04). `mic.private` ("We don't save your recordings. They stay on this phone…") is true while checking is on the phone (`local`). When S20 turns on `server`, the explainer shows `privacy` ("Your recording is checked, then deleted.") instead; no extra key needed.
- **Screen-reader labels matched to the canvas** (aria-labels from `reference/SP*.html`): `micButton` en "Start recording" / vi "Bắt đầu ghi âm" (was "Start speaking" / "Bắt đầu nói"); vi `waveLabel.listen`, `waveLabel.live`, `view.label`; en + vi `waveLabel.overlay` (ends with a full stop, vi "màu đất nung"); `done.gardenLabel` says "Five plants…" / "Năm cây…" for 5, as on SP4. Still open for S18: the SP1 play button's own label ("Play native speaker" / "Nghe người bản xứ") isn't wired yet.
- **Vietnamese visible text** on the canvas screens matches; the other Vietnamese lines are for states the canvas doesn't draw (mic, denied, quiet, short, unsupported, audio failed, Sound Garden, Say this one), drafted in S6 and still to be checked by Dylan.
- **zh-CN drafted by Claude, for native review (D6):** `countdownHint`, `countdownButton`, `startingSoon`, `pauseStops`, `checking`, `privacy`, `failed.*`, `mark.heard`, `mark.unclear`, `tip.also.*`, `tip.stress.bodyShort`, `nativeAccent`, `playingShort`, `playNativeLabel`, `playYouLabel`, and the changed `micButton`, `waveLabel.overlay`, `done.gardenLabel`.
- **Commit:** only the `screens.speak` part of each file (others' edits in `en-US.json` / `vi-VN.json` stay unstaged), and **together with the v2 code**, because the removed keys are still used by the committed v1 screens.

## 20. G6 · Self-hosted speech checking on the Mac (Docker + API), spike M1 (2026-10-04)

Dylan, 2026-10-04: paid services (Azure ≈ $1.80, SpeechSuper ≈ $6 per 1,000 checks) cost too much for now; Google can't score pronunciation and is blocked in mainland China. **G6 = self-hosted on the UAT Mac, in Docker, behind an API.** S17 (`POST /speaking/check` + `SpeechChecker`) stays; S20 becomes "Mac scorer" (steps M2–M5 below).

**Spike M1** (Mac M2, 16 GB; Docker Desktop 8 CPUs / 9.5 GB, CPU only, no GPU in Docker on macOS). Nine test clips made with macOS voices, as AAC `.m4a` like an iPhone (30–48 KB for 4–6 s): good US / UK, the fixture clip, "the" left out, "mitigate" → "migrate", "effects" → "affects", Vietnamese voice (Linh), Chinese voice (Tingting), 2 s of noise before speaking. Code: `docs/phase13-speech-spike/` (`Dockerfile`, `gop.py`).

1. **Words, Whisper** in `ghcr.io/speaches-ai/speaches:latest-cpu` (arm64, OpenAI-style `POST /v1/audio/transcriptions`, word timings), `127.0.0.1` only, int8, 6 threads, 3 GB.
   - `small.en`: right on every clip (missing "the", "migrate", accents misheard plausibly, late start found at 1.65 s) but **6–12 s** a clip: too slow.
   - `base.en`: same catches on the test set, **2.2–3.9 s** a clip. Speaches doesn't expose beam size; our own service can call faster-whisper with beam 1 to cut this further.
   - "affects" for "effects" isn't caught by words (they sound the same); the sound scores below see it a little.
2. **Sounds, wav2vec2 phoneme model** (`facebook/wav2vec2-lv-60-espeak-cv-ft`, 1.26 GB) + espeak en-us for the expected phonemes + forced alignment, score = how sure the model is the expected sound was said vs its best guess (GOP), 0–100 per word. **1.3–3.9 s** a clip on CPU; first start 61 s (download), later loads from the volume.

| Clip | Total | Low words (< 60) |
| --- | ---: | --- |
| good US / UK / fixture | 96 / 96 / 99 | "the" 51 on two (see below) |
| "the" left out | 92 | **the 27** |
| "migrate" for "mitigate" | 90 | **mitigate 43** |
| "affects" for "effects" | 94 | effects 83 (mild) |
| Vietnamese voice | **39** | 9 of 11 words |
| Chinese voice | 87 | **mitigate 58** |
| 2 s noise, then speech | 96 | (no penalty for the late start) |

**Verdict: go.** Both halves catch the right problems, late starts don't hurt, and it's free. To fix in M2–M4:
- **Speed:** words + sounds one after the other is 4–7 s, too close to SP3's 8 s timeout. Run Whisper and the phoneme model **in parallel**, Whisper with beam 1; target < 4 s. Fallback: a smaller phoneme model, or Whisper natively on the M2 GPU outside Docker.
- **"the" before a vowel** scores ~51 on good speech: espeak expects /ðə/, speakers say /ði/ before "effects". Accept common variants for function words (calibration, M4).
- **Thresholds** come from real recordings (Dylan + a Vietnamese speaker), not TTS voices (M4).
- **Memory:** ~1.5 GB (Whisper) + ~1.5 GB (phonemes) of Docker's 9.5 GB; Supabase etc. use ~2.2 GB today.

**Plan (replaces S20's paid service):** M2 scorer container (FastAPI `POST /check`: audio + sentence + target word → words ok / missing / unclear + heard, sound scores, stress, total; audio in memory only) next to Speaches in `docker-compose.yml`, `127.0.0.1` only, limits + health checks · M3 S17 with a `MacSpeechChecker` adapter · M4 calibration · M5 `NEXT_PUBLIC_SPEECH_CHECK=server`, deploy, iPhone try. Kept on the Mac for M2: images `speaches:latest-cpu`, `dygo-speech-spike-scorer`; volumes `dygo_speech_models` (Whisper, 634 MB), `dygo_speech_spike_hf` (phoneme model, 1.26 GB). Test containers stopped.

### M2 · Scorer container (2026-10-04)

`docker/speech/` (FastAPI `POST /check` + `GET /health`), service `speech` / `dygo_speech` in `docker-compose.yml` on `127.0.0.1:8100`, volume `speech_models`, `mem_limit` 4 GB, health check. Change from the spike: Whisper runs **inside** the scorer with faster-whisper (beam 1, int8) instead of the Speaches server, so one container and one API, and the fast mode Speaches doesn't expose. Spike images and volumes (`speaches`, `dygo-speech-spike-scorer`, `dygo_speech_models`, `dygo_speech_spike_hf`) are no longer needed.

| Clip | Total | Marks |
| --- | ---: | --- |
| good US / UK / fixture | 100 / 100 / 99 | all ok ("the" /ði/ now accepted) |
| "the" left out | 89 | the: missing |
| "migrate" for "mitigate" | 95 | mitigate: unclear, heard "migrate" |
| "affects" for "effects" | 98 | all ok (not caught; they sound the same) |
| Vietnamese voice | 40 | 7 words unclear, heard "me", "to", "get", "a", "giant" |
| Chinese voice | 91 | mitigate: unclear, heard "me" |
| 2 s noise first | 100 | all ok |

**Speed** (one check at a time, Mac under load 9–14 from other apps): 1.7–3.3 s typical, 5.3 s worst; under SP3's 8 s timeout. Phoneme model ≈ 2.5 s of it, Whisper ≈ 1.2 s, in parallel. Tried and dropped: int8 quantisation of the phoneme model (every word "unclear", 20–30 s); more threads (slower). Memory 0.8 GB idle. Unit tests (`tests/test_matching.py`) 6/6. Next: M3 = S17, the backend endpoint and `MacSpeechChecker`.

### M3 · `POST /speaking/check` (S17), backend → speech scorer (2026-10-04)

Dylan: the app calls the Dygo API, the API calls the scorer (option A). No Cloudflare change: `api.dygoacademy.com` is already tunnelled; the scorer stays on 127.0.0.1. Asked whether calling the scorer directly (B) would be faster or scale better: no, the extra hop is ~10–50 ms on the same Mac against 1.5–5 s of scoring, and A is where scaling happens later (several scorers behind `SPEECH_SCORER_URL`, a BullMQ queue, per-user limits, swapping the service without an app release).

- `SpeechChecker` interface + `MacSpeechChecker` (multipart to `{SPEECH_SCORER_URL}/check`, `AbortSignal.timeout(SPEECH_CHECK_TIMEOUT_MS)`, default 8 s; logs status / timing only), `SpeechCheckService` (item's sentence read as the learner, upload checks), mapper to `{ score, stage, word_marks: missing / unclear + heard, user_duration_ms, check_ms }`, `SpeechCheckRateLimitGuard` (60 an hour per user, in-process like the sprint guard; move to Redis if the API is scaled out). Upload via multer's default memory storage (no `dest`), so nothing touches disk.
- **Not saved here.** `speaking_attempts.word_marks` only allows `stress_soft / missing / rushed / slow`; saving `unclear` needs a migration (S18, with the `server` switch).
- **Scorer change:** each word's `index` is now its position in `sentence.split()` (the app's numbering), so a lone "—" can't shift the marks.
- Verified: backend Jest 352/352 (11 new), `tsc` + eslint clean; the real client + mapper against the running scorer: good 100 / fruit, "the" missing 89 / bloom, "migrate" 95 / fruit with mitigate unclear (heard "migrate"), Vietnamese voice 40 / sprout; garbage → 422, scorer down → 503; 1.3–2.1 s.
- **For M4:** a wrong target word still reaches 95 / fruit; the total should weigh the target word (and `unclear` words) more.

### S18 · The `local` / `server` switch (2026-10-05)

`NEXT_PUBLIC_SPEECH_CHECK` (`env-profiles/prod.env`, baked in at build; anything but `server` = `local`). UAT stays `local` until M5.

- **Flow in `server` mode:** the on-device check runs first (instant). A silent or too-short recording shows "We couldn't hear you" / "Say the whole sentence" and is **not uploaded**. Otherwise the recording, as recorded, goes to `POST /speaking/check`; SP3 shows the server's score, stage and marks (`missing`, `unclear` + "heard …"), plus the phone's stress verdict on the target word (`stress_soft`, the Mac scorer doesn't judge stress) unless the server already flagged that word. Waveforms stay the phone's. Timeout 10 s (`SERVER_CHECK_TIMEOUT_MS`: the backend's 8 s plus the upload); any failure → "Couldn't check this one", nothing saved.
- **Tip order** (handover v2 §3): target stress → missing → unclear → flowed well. New tip `tip.unclear` ("Say **mitigate** more clearly · We heard “migrate”. Listen to the native speaker again, then say it slowly.") in en / vi / zh; vi and zh drafted by Claude.
- **Saved attempt:** server score / stage / marks; `unclear` is now a valid reason (backend `SPEAKING_MARK_REASONS`; DB only checks for an array, migration `20261005_speaking_mark_unclear.sql` just updates the column comment). What the scorer `heard` is never saved. Local mode saves exactly as before.
- **Mic explainer (S16-b):** in `server` mode it says "Your recording is checked, then deleted." instead of "stays on this phone".
- Tests: frontend `check.test.ts` (merge, upload, mode) + 2 SpeakLive server-mode tests; Vitest 511 passed, the same 66 known failures; backend speaking 42/42; RLS suite passes.

### S13 · Spend caps (2026-10-05)

Table `api_usage_daily` (provider, UTC day, units; service_role only) and `UsageCapService.take()`: one statement adds the units only if the day stays within the cap, else `UsageCapExceededError` and no paid call.
- **Gemini** (all four calls go through `GeminiEnrichmentService.generate`): `GEMINI_DAILY_CALL_LIMIT`, default 1000 calls a day (≈ 330 new words: enrich + translate + word audio). Over the cap a new word is marked FAILED at once ("Daily gemini limit reached …", BullMQ `UnrecoverableError`, no retries) and quiz explanations are left out (already caught). Warns in the log once a day at 80 %.
- **Google Cloud TTS** (`speaking-generate`): stops before the run passes `--max-usd` (default $2, `--yes` lifts it) and when today's total would pass `GOOGLE_TTS_DAILY_CHAR_LIMIT` (default 300000 chars, always on); a stopped run keeps what it made.
- Verified: backend Jest 357/357 (5 new: cap SQL and errors, defaults, 80 % warning, capped enrichment job not retried); the cap SQL on the real database in a rolled-back transaction (2 calls pass, the 3rd over a cap of 2 is refused, an oversized first request is refused); the script with `--max-usd 0` stops before any TTS call and records nothing; dry run unchanged.
- Still Dylan's (G5): Google Cloud budget alerts and quotas, the hard stop outside the app.

### S19 · QA v2 (2026-10-05)

- **Dev page** `/garden/_speaking` → **3 · Recording flow v2** (`FlowCheck.tsx`, moved from S15): runs the SP2 flow on its own and shows why it stopped (silence / not heard / 30 s cap / tap), the recording's length, format and size, and **beep in clip** (880 Hz level in the first 200 ms vs the whole clip; `toneRms`, Goertzel). For checking a phone step by step.
- **Playwright** `ui/tests/sounds.spec.ts` brought to v2: the stubs now use the backend's `{ success, data }` envelope (the S12 version returned bare JSON, which the API client rejects, so it would have failed on its first run); `/speaking/check` stubbed (scorer never called); "Start recording"; the count tapped to skip; the fake mic plays once (`%noloop`) so the auto-stop is exercised; new tests for checking → marks (saved without `heard`) and for a 503 → "Couldn't check" → Check again. Type-checks; **not run here**: it signs in to the live site with the e2e account, which Claude doesn't do; Dylan runs the command above.
- **QA matrix** rows for v2 added (above).
