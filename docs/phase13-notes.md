# Phase 13 (Adult Speaking): working notes

Started 2026-10-04 by an unattended run (T0 + T1); T2 the same day after Dylan picked D1 = B. Source of truth: the handover `phase/phase 13/PHASE-13-SPEAKING-PLAN.md`; companion: `phase 13 implementation plan.md` v2.0. Where the repo differs from the handover, the repo's patterns win (CLAUDE.md master rules) and the difference is listed here.

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

