# Phase 13 · Speaking: record

What was decided and checked in Phase 13, moved here on 2026-10-06 from `docs/phase13-notes.md` and `docs/phase13-schedule.md` (both deleted then; the full files, including day-one discovery and answered questions, are in git history, last version in commit `0e47e01`). What to build is in `PHASE-13-SPEAKING-PLAN.md` (the handover) and `phase13-speaking-design/`; the plan and status are in `phase 13 implementation plan.md` (repo root). Section numbers like "§16" in older commits and the Change Log refer to the deleted notes; their content is below under the same titles.

## Status (2026-10-06, 23:00)

**Built and live on UAT:** The Pond at `/sounds` (v2 recording flow: 3 · 2 · 1, beep, stops on a pause; works with the silent switch on and in noise), **server checking through a queue** (queue v1, §22: `POST /speaking/check` answers at once, the app polls; two self-hosted scorers on the Mac, ~50 checks a minute; busy → the phone's quick result), scoring calibrated (M4) and checked with a Vietnamese speaker, spend caps (S13 in the app, G5 in Google Cloud). The entry points ("Say this one?", the Sound Garden card) were removed on 2026-10-06 for a redesign (§21); the new ones (SE1 / SE2 / SE5 / SE6) are *For approval* in `docs/design/garden/CHANGELOG.md`, with questions in `docs/design/QUESTIONS.md`.

**Open:** Dylan: approve SE1–SE6 and add their `Entry*.dc.html`, answer D-3 to D-5 and Q-1 to Q-11, fix `SPEECH_SCORER_URL` (8000 → 8100) in `env-profiles/prod.env`, the Cloudflare media rules (later), Vietnamese / Chinese text reviews, the Playwright run. Claude (when asked): two-step results (phone first, then server marks), UAT database backups, stop storing the `.wav` copy, build the approved entry points.

## Decisions D1–D7 (outcomes)

- **D1** native audio + word timings: **Google Cloud TTS** (Neural2, SSML `<mark>` timepoints), made offline by `scripts/speaking-generate.ts`.
- **D2** recordings: never stored. Handover v2: sent, checked, dropped (`POST /speaking/check` keeps it in memory only); no audio or transcript in `speaking_attempts`.
- **D3** scoring: on the phone first (envelope scorer), since 2026-10-05 the **self-hosted speech scorer** (G6); the phone still screens silent recordings and judges target-word stress.
- **D4** entry points: Missions card + "Say this one?" (2026-10-04), **both removed 2026-10-06** for a redesign; `/sounds` stays.
- **D5** garden effect: visual only; attempts saved; no SRS change, no mission.
- **D6** zh-CN: drafted by Claude, flagged for a native review.
- **D7** CORS on the media host: `media.dygoacademy.com` sends `Access-Control-Allow-Origin` for www; the Cloudflare response-header rule is on the to-do list.

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

## 15b. Media host: option 2 built (2026-10-04)

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
| Beep at the end of the count (`/garden/_speaking` → 3) | ✅ beep tests | 📱 silent switch **off**: hear it. **On** (10-05): ❌ before the fix the meter read only zeros → "not heard" after 8 s; fixed (Audio Session `play-and-record` + dead-meter safety net); ✅ re-check 10-05 with the switch on: stopped by **silence**, meter live (floor −84, gate −41, loudest −11 dBFS), 11.48 s / 262.3 KB, beep not in the clip | 📱 | 📱 | 📱 | 📱 |
| Vibration at the beep | ✅ called where supported | — (iOS Safari has none) | — | 📱 | — | — |
| Beep not in the recording (dev page → 3 → "beep in clip") | ✅ `toneRms` + FlowCheck leak test | ✅ 10-05 Dylan: **no** (880 Hz in the first 200 ms −153 dBFS, whole clip −106 dBFS) | 📱 | 📱 | 📱 | 📱 |
| Stops by itself 2 s after you finish; "not heard" after 8 s of nothing; 30 s cap | ✅ `voiceEnded` / `notHeard` tests; Playwright auto-stop | ✅ 10-05 Dylan: stopped by **silence**; recording 6.46 s, `audio/mp4; codecs=mp4a.40.2`, 60.6 KB, decoded 6.45 s at 16 kHz. ✅ 10-05 noisy place: stopped by **silence** after 2.0 s quiet (6.28 s, 138.3 KB; floor −83 dBFS thanks to iOS noise suppression, gate −40, loudest −10); two earlier noisy runs ended by tap before 2 s | — | 📱 | 📱 | — |
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

**Spike M1** (Mac M2, 16 GB; Docker Desktop 8 CPUs / 9.5 GB, CPU only, no GPU in Docker on macOS). Nine test clips made with macOS voices, as AAC `.m4a` like an iPhone (30–48 KB for 4–6 s): good US / UK, the fixture clip, "the" left out, "mitigate" → "migrate", "effects" → "affects", Vietnamese voice (Linh), Chinese voice (Tingting), 2 s of noise before speaking. Spike code (`Dockerfile`, `gop.py`) was in `docs/phase13-speech-spike/`, deleted 2026-10-06 (in git history; replaced by `docker/speech/`).

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

### M4 · Calibration (2026-10-05)

Set: `docker/speech/calibration/` (7 real sentences from `speaking_items` incl. the fixture × good US / UK / AU, fast, slow, Vietnamese and Chinese macOS voices, a skipped non-target word, a near-miss target word such as "category" for "catastrophe"), 63 clips as AAC m4a; `calibrate.py` reports per kind.

| | Before M4 | After M4 |
| --- | --- | --- |
| Good speech: fruit | 23/35 (plain mean) | 33/35 (min 89) |
| Good speech: a word wrongly flagged | 15/35 (once marks counted) | 2/35 |
| Skipped word caught as missing | 5/7 | 6/7 (the 7th flagged as unclear) |
| Wrong target word caught | 7/7, but 4 still fruit | 7/7, all 69 (sprout) |

- **M4-a (total):** target word 3×, unclear ≤ 50, any mistake ≤ 89, wrong / missing target ≤ 69, ok function words count 100. The backend now sends `target_index`.
- **M4-b (marks):** function words judged by Whisper ("a" scored 8–22 on sound in good speech); sounds ≥ 85 overrule a Whisper mishearing ("months" → "onts", "for" → "from"); UK / US spellings match ("criticised").
- Accents: the macOS Vietnamese / Chinese voices score 18–99 (mean ~62): synthetic, so judge on real speakers.
- ✅ **Real speakers (2026-10-06):** Dylan tried The Pond with a Vietnamese speaker on UAT (server checking, M4 rules): working, marks judged fair. Real recordings can still go through `calibrate.py` (hand-written `manifest.json`) if a rule needs tuning later.

## 21. Speaking entry points removed for a redesign (Dylan, 2026-10-06)

Dylan plans to redesign where speaking is started from. Removed from the app:
- **"Say this one?"** on the flipped review card (T9-a, S11): `ReviewCard`'s `speakOffer` prop and button (the card markup is back to exactly what it was before S11), `ReviewLive`'s offer wiring, `SayThisSheet`, `useSpeakOffers`, `lib/speaking/offers.ts` and their tests, `SPEAK_OFFERS_PER_SESSION`.
- **The Sound Garden card** on the Missions tab (S10): `WeeklyHarvestScreen` and `HarvestLive` restored to the pre-S10 files, its test, `SOUND_GARDEN_MIN_ITEMS`.
- The Playwright "Entry points" tests.

Kept, for the redesign to use: The Pond at `/sounds` (open the URL directly), `SpeakFlow` with its `single` mode (one sentence, as the sheet used it), the backend `GET /speaking/words` and `/speaking/words/:topicWordId` (now not called), the `screens.speak.sayThis.*` / `soundGarden.*` strings (`soundGarden.title` is still the `/sounds` page title), server checking, the scorer.

## 22. Speech-check queue v1 (2026-10-06)

Dylan: the app may wait a few seconds, but the backend must never be blocked; keep the scorer on the MacBook; Cloudflare later. Asked "queue in the speech service or the backend?": **backend** (BullMQ already runs enrichment; it knows the user, item and limits; works for any scorer behind `SpeechChecker`; remote scorers need only an HTTP address, Redis stays private; scorers stay stateless).

- `POST /speaking/check` → 202 `{ check_id, position, eta_s }`; `GET /speaking/check/:id` → queued / checking / done (+ result) / failed (+ reason), owner only.
- `speech-check-queue` job = ids + sentence + target index, **never audio**: the recording waits in `SpeechCheckStore` (API memory; 60 s for audio, 10 min for results), because Redis saves to disk. One API process (UAT); several would need a non-persistent shared store.
- `SpeechCheckProcessor`: concurrency = number of scorers (`SPEECH_SCORER_URLS`), one check per scorer (`ScorerPool`), never throws (no retry; the app shows "Couldn't check").
- Busy: estimated wait (`(ahead + 1) / scorers × 2.5 s`) over `SPEECH_BUSY_ETA_SECONDS` (15) → 503 → the app shows the phone's own result as a **quick check** (new `screens.speak.quickCheck`, en / vi / zh) and saves its marks as in local mode. The app polls every 0.8 s and gives up after 30 s.
- Scorers: `speech` (8100) and new `speech-2` (8101), `MODEL_THREADS` 4 → 2. Measured with the real queue, store, worker and scorers (6 recordings at once): 1 scorer × 4 threads 9.7 s, 1 × 2 threads 7.9 s, **2 × 2 threads 7.2 s** (~0.8 checks/s, ~50 a minute): enough for ~100 learners at once. A second scorer on the same Mac adds little (CPU-bound); growth = a faster model or another machine.
- Incident: while adding `quickCheck`, a script truncated `messages/en-US.json` (which held others' uncommitted edits) before an insert check failed. Restored the same minute from the last deploy's build (`.next/server/chunks/…`, built from the working tree at 06:58): 983 keys, 335 differing from git, as measured before, so nothing lost (formatting normalised to 2-space JSON). Scripts now build the full new text before opening a file for writing.

## 23. New speaking entry points SE1 / SE2 / SE5 / SE6 (2026-10-06)

Dylan approved the four entry points from the design changelog and asked Claude Code to draw the boards (`docs/design/garden/source/Entry*.dc.html`, EN + VI; references `SE*-entry-*`), then build them. Decisions: D-3 Fruit at 90%+, review dates unchanged (D5 stands); D-4 Echo shows totals only; D-5 they replace A1 / A7 / GR3.

- **SE1 Home speaking mission** "Say 3 ripe words": a new mission type `SPEAK` (migration `20261006_speaking_entry_points.sql`). On odd days (days since 1970-01-01 of the local date) it takes QUIZ's place as the 3rd mission, when the learner has 3+ words with a speaking item; the day's first attempt at each sentence counts. Light clay row on A1 linking to The Pond; next mission on A3.
- **SE2 Topic bed Speak**: "Speak · N sentences from this bed" under Water / Quiz / + opens `/sounds?topic=…&back=<bed>` (hidden when no word in the bed has an item).
- **SE5 Ready to harvest**: ripe (Flower) words with a speaking item, each with a mic → `/sounds?word=…&harvest=1&back=<bed>` (one sentence, single mode). `POST /speaking/attempts` with `harvest: true` and 90%+ stores a `speaking_harvests` row (once per word); that word shows "Picked · 94%" as Fruit for the day. No SRS change.
- **SE6 Echo challenge** on GR3 (admins): `GET /groups/:id/echo` → the most-missed word of the last 7 days that has an item, "3 of 5 gardeners done" (SECURITY DEFINER `group_echo_challenge`, ADMIN only, no user ids); Say it → `/sounds?word=…&back=<tend>`; tricky list trimmed to 2 rows.
- `/sounds` gains `word`, `harvest` and `back` (app paths only) parameters.
- Tests: backend 374, frontend 590 (HEAD + this change), RLS suite + 16 new checks. `garden:diff` for SE1/SE2/SE5/SE6 runs against UAT after the deploy.

## Session log (from `docs/phase13-schedule.md`)

One line per session: date · session · result · next.

- 2026-10-04 · T0–T2 (+ option 2 media, deploy) · done, see notes §9, §13, §15b · next: S0 / S1
- 2026-10-04 · S0 · done (f2b159f): multi-word targets, 12 new clips, 144 words with audio (only `analyse` left), plan file synced (uncommitted) · next: S1
- 2026-10-04 · S1 · done: `src/lib/speaking/audio.ts` + 19 tests · next: S2
- 2026-10-04 · S2 · done (8624b2a): `useLiveLevels`, `usePlayer`, dev page `/garden/_speaking`; **deployed 13:41**, www + API 200 · next: S3 (G1 iPhone check by Dylan doesn't block)
- 2026-10-04 · S3 · done: envelope scorer + constants, 10 tests, 2.9 ms / 5 s clip; DTW step penalty added (S3-a); scores lenient, check at G3 · next: S4
- 2026-10-04 · S4 · done: Waveform / LiveWaveform / CompareWaveform + gallery section, 8 tests; visual check vs design waits for the S8 deploy · next: S5
- 2026-10-04 · S5 · done: WordMarks, StageScore, SpeakingPlant + gallery, 7 tests · next: S6 (G2 handled by staging only the new keys)
- 2026-10-04 · S6 · done: 90 `screens.speak` keys × 3 locales, only the new keys staged (others' edits untouched) · next: S7
- 2026-10-04 · S7 · done: `/sounds` The Pond, SpeakLive state machine, SP1 + SP2 screens, fixtures, 17 tests · next: S8 (SP3, SP4, attempts, reference pages, deploy)
- 2026-10-04 · S8 · done (e03aac9): SP3 Compare + SP4 Done, attempts saved, SpeakLive flow test; `garden:diff` not run (no SP reference PNGs, needs `next dev`, S8-f); **deployed 14:07**, www + API 200 · next: S9 (G3 iPhone check by Dylan doesn't block)
- 2026-10-04 · S9 · done: SpeakNotice + all six states in SpeakLive, `/sounds?state=` dev toggle, 11 tests · next: S10
- 2026-10-04 · S10 · done: Sound Garden card on Missions (≥ 5 items) → `/sounds`; fresh session per visit · next: S11
- 2026-10-04 · S11 · done (f7190b1 + this commit): lookup endpoint, `pickSpeakOffers`, "Say this one?" button + sheet (SpeakFlow single mode); deploy left to S12 per run rules · next: S12
- 2026-10-04 · S12 · done (4439c70): Playwright spec for `/sounds` (written, not run: S12-a), QA matrix + open issues in notes §16; **deployed 14:22**, www + API 200 · next: Dylan's device checks (G1, G3) and beta (G4); all sessions S0–S12 done
- 2026-10-04 · G1 (Dylan, iPhone Safari) · done: record 8.01 s → decode 8.02 s at 16 kHz; `.m4a` vs `.wav` offset **0 ms** on both clips, so the scorer needs no AAC correction · later the same day: envelope shows, Play me 1× / 0.75× loud enough and plays with the silent switch on, desktop Chrome offset 0 ms too · next: G3, G5, S13
- 2026-10-04 · G3 (Dylan, iPhone) · first Pond session: recording screen too fast to read, and a 1–2 s late start scored far too low · fixed the same day (notes §17): scorer ignores the wait, tap click and room noise (G3-a); one tap → 3 · 2 · 1 → records → stops by itself 1.5 s after the voice (G3-b); deployed for Dylan to try again · next: G3 again on the iPhone, then S13, G5
- 2026-10-04 · canvas rule for speaking (Dylan) · SP screens follow `docs/design/garden/README.md`: S14b exports 14 references, S18 adds fixture pages, S18b pixel-diffs them on UAT (≤ 0.5%); deploy after S18b too · next: S13
- 2026-10-04 · handover v2 (Dylan, 18:21) · server checking, SP2 countdown + beep, SP3 checking / done / failed; D3 = compare first; sessions S14–S20 and gates G6 (blocking), G7 added; the unattended run's stop rule fixed so S13 runs (it stopped after S12) · next: S13
- 2026-10-04 · S14b · done by another session (1082d47): 14 SP references, sources, render jobs, README rows; row not ticked there · next: S13
- 2026-10-04 · SP2 / SP3 v2 UI (interactive, Dylan asked; **uncommitted**, not deployed) · covers most of **S15** (countdown 0.9 s + tap to skip, beep + vibration, record 150 ms after the beep, auto-stop 2 s, not heard 8 s, 30 s cap; WAV upload encoder and the dev-page update not done), **S16** (handover §8 keys in 3 locales; vi from the canvas, zh drafted) and the UI half of **S18** (new SP2, SP3 checking / done / failed, missing / heard marks, amber bands, "Also keep…" tip, play buttons with accent and initial; check through `localCheck` with an 8 s timeout, no `local` / `server` switch yet; fixture pages for SP2 ×2 and SP3 ×3). Not done: S13, S14, S17, S18's switch, S18b diff (needs a deploy), SP1 / SP4 fixture pages. Notes §19 · next: Dylan reviews, commit, deploy, then S18b diff
- 2026-10-04 19:45 · status (Dylan asked) · S14b ticked (1082d47). `garden:diff` on UAT after the 19:24 deploy (which built the uncommitted SP2 / SP3 v2 work): en SP2 countdown 0.06 % ✅, SP2 recording 0.40 % ✅, SP3 checking 0.53 %, done 1.08 %, failed 1.39 % ❌; vi all ❌ (SP2 countdown 1.6 %, recording 2.4 %, SP3 2.8–5.1 %; the countdown hint wraps to 2 lines, header topic and stress tip differ). SP1 / SP4 not diffed (no fixture pages yet). New to-do: stop storing the `.wav` copy, M4A only (notes *To do later*, a856bce). Scheduled task is off · next: commit the v2 work, fix the vi / SP3 diffs (S18b), finish S15 (WAV upload encoder, dev page), then S13, S14, S17
- 2026-10-04 19:50 · S15 · done (Dylan): countdown 0.9 s + tap to skip, beep + vibration, record 150 ms after the beep, auto-stop 2 s, not heard 8 s, 30 s cap, tests (uncommitted with the rest of the v2 work, on UAT since 19:24). **Decision S15-a (Dylan): no WAV on the phone**: the WAV upload converter is dropped, the recording is sent as recorded (M4A / WebM); S14 must check each service accepts those, S17 takes them, S20 converts on the backend only if the chosen service needs it. Dev-page run moved to S19 · next: commit the v2 work, then S18b diffs
- 2026-10-04 20:00 · S16 · done (uncommitted): §8 keys in 3 locales, 7 old keys removed, screen-reader labels matched to the canvas (vi + `micButton`, `waveLabel.overlay`, `done.gardenLabel`), decisions S16-a (not heard = `quiet.*`) and S16-b (mic explainer changes in S20), zh drafts listed for review (notes S16). Tests: speaking + i18n 133/133, full Vitest the same 66 known failures. Must be committed with the v2 code (removed keys are used by the committed v1 screens) · next: commit the v2 work, S18b
- 2026-10-04 20:10 · commit (Dylan asked) · v2 work committed: a14c1d1 (S15 flow, S16 strings, S18 UI; only `screens.speak` of the message files and one CSS token, others' edits left unstaged) + this schedule / notes commit; git now matches UAT for speaking · next: S18b (vi boards and SP3), S18's `local` / `server` switch, then S13, S14, S17
- 2026-10-04 20:35 · Vietnamese font (Dylan) · Dylan's 10-03 Be Vietnam Pro body font committed (20e41d9), the missed speaking animations too (845f4d0); all 47 `-vi` references re-exported with the same body font (d503b1d, README *Languages*). `garden:diff` on UAT, every screen: **speaking** en SP2 countdown 0.06 % / recording 0.40 % ✅, vi 0.12 % / 0.46 % ✅; SP3 checking / done / failed ❌ in both (en 0.53 / 1.08 / 1.39 %, vi 0.57 / 1.06 / 1.42 %). **Not Phase 13:** most other garden boards fail in English too (A3–A5 9–19 %, GR1/GR3/GR7 5–10 %, AU2–AU4 5–8 %, home v2 ~12 %), so they have drifted on UAT since the 09-26 pass, not because of the font; needs its own pass · next: S18b (SP3 en + vi, SP1 / SP4 fixtures), deploy
- 2026-10-04 20:50 · S18b · **closed by Dylan as is** (don't spend more time on it): SP2 countdown / recording pass in en + vi (0.06 / 0.40 %, 0.12 / 0.46 %); accepted with known differences: SP3 checking / done / failed (en 0.53 / 1.08 / 1.39 %, vi 0.57 / 1.06 / 1.42 %: header topic "The Pond" vs canvas "Environment", bottom buttons a few px off, word-mark chip widths, failed-card height); SP1 / SP4 have no fixture pages (SP1 play-button label and the bold "MIT" stress tip not wired) · next: S18's `local` / `server` switch, S13, S14, S17
- 2026-10-04 21:00 · G7 · **done (Dylan)**: tried v2 on the iPhone. Tried with on-phone checking (`local`, the UAT default) since S20 isn't built; no feedback recorded yet. Still open: **G6** (Dylan said "Google TTS"; asked whether that means keep Google TTS for native audio, use Google Speech-to-Text for checking, or stay on-phone) · next: G6 answer, S18 switch, S13
- 2026-10-04 21:05 · G4 · **beta approved by Dylan** ("that is fine for me"), ahead of its listed dependencies: beta runs with on-phone checking (`local`; G6 open, S17 / S20 not built), **without the S13 spend caps and the G5 Google Cloud limits**, and UAT is still the 19:24 build (later commits, e.g. the S16 label fixes, not deployed) · next: deploy for beta when Dylan says so; S13 + G5 first is recommended
- 2026-10-04 21:45 · G6 / M1 · **G6 = self-hosted on the Mac, Docker + API** (Dylan: paid services cost too much). Spike M1 done (notes §20): Whisper `base.en` in Speaches 2.2–3.9 s, wav2vec2 phoneme scores 1.3–3.9 s on CPU; catches the missing word, "migrate", the Chinese voice's "mitigate", Vietnamese voice scores 39; late start not penalised. **Go**, with parallel calls to get under 4 s and calibration for "the" /ði/ · next: M2 scorer container, M3 = S17 adapter
- 2026-10-04 22:10 · M2 · done: `docker/speech` scorer (FastAPI, faster-whisper base.en + wav2vec2 phonemes, in parallel), service `speech` on 127.0.0.1:8100; all 9 test clips marked right (missing "the", heard "migrate", accents), "the" /ði/ false flag fixed; 1.7–3.3 s typical, 5.3 s worst; tests 6/6 (notes §20 M2) · next: M3 (S17 endpoint + MacSpeechChecker)
- 2026-10-04 · M3 = S17 · done: `POST /speaking/check` (multipart audio + item_id + accent) → `MacSpeechChecker` → speech scorer; 60/hour/user, 8 s timeout → 503, nothing stored; real end to end 1.3–2.1 s with correct marks (notes §20 M3). Not deployed; not saved as an attempt yet (`unclear` needs a migration, S18) · next: S18 `server` switch + attempts migration, M4 calibration (target word weighs more)
- 2026-10-05 06:24 · deploy (Dylan asked) · M3 `POST /speaking/check`, S16 labels, the Vietnamese font, speaking animations (7611bea + working tree). All 4 steps OK; www + API health 200; `POST /speaking/check` without a token → 401 (route live); scorer healthy. Signed-in check left to Dylan in Postman (minted tokens are local-only). The app still checks on the phone until the S18 switch · next: S18 switch + attempts migration, M4
- 2026-10-05 · S18 switch · done: `NEXT_PUBLIC_SPEECH_CHECK` (`local` default, `server` = upload to `/speaking/check` after the phone's quiet / short check, server marks + phone stress), `tip.unclear` in 3 locales, `unclear` saved (no `heard`), mic text per mode, migration 20261005 (comment only, applied). UAT still `local` · next: M4 calibration, then M5 (switch to `server`, deploy, iPhone try)
- 2026-10-05 06:49 · M5 (before M4, Dylan asked) · UAT switched to **server** checking: `NEXT_PUBLIC_SPEECH_CHECK=server` in `env-profiles/prod.env` (git-ignored, this Mac), deployed (all 4 steps OK); the deployed bundle's mode default is "server"; www / API 200, `/sounds` 307 to login signed out, scorer healthy. Thresholds not calibrated yet (a wrong target word can still reach fruit) · next: Dylan tries it on the iPhone, M4 calibration with his recordings. Rollback: set it back to `local` and redeploy
- 2026-10-05 06:55 · status (Dylan asked) · **S14** ticked: covered by notes §20 (paid options compared, G6 = self-hosted); **S20** ticked: done as M2–M5 (scorer container, `POST /speaking/check`, switch, UAT on `server` since 06:49). Open: **M4** calibration (needs Dylan's recordings), **S13** spend caps, **G5** Google limits, **S19** QA v2 · next: Dylan's iPhone try in server mode
- 2026-10-05 · S13 · done: `api_usage_daily` + `UsageCapService` (Gemini 1000 calls/day; capped words fail at once, no retries; quiz explanations skipped), `speaking-generate` `--max-usd` (default $2) / `--yes` + daily TTS cap 300000 chars; migration applied; Jest 357/357. Not deployed yet · next: deploy, G5 (Dylan), M4 calibration, S19
- 2026-10-05 07:18 · deploy · S13 spend caps live (708fa15): all 4 steps OK, www + API 200, backend started with no errors; the app still checks speech on the server · next: G5 (Dylan), M4 calibration, S19
- 2026-10-05 · S19 · done: dev page section 3 (v2 flow run, stop reason, beep-leak check via `toneRms`), Playwright `sounds.spec.ts` on v2 (envelope bug fixed, `/speaking/check` stubbed, auto-stop, checking / failed tests; type-checks, not run: signs in to the live site, Dylan runs it), QA matrix v2 rows (notes §16, §20 S19). Vitest 516 passed, same 66 known failures · next: deploy; Dylan: iPhone + dev page + Playwright run, G5, M4 recordings
- 2026-10-05 07:24 · deploy · S19 dev-page flow check live (1cdea22): all 4 steps OK, www + API 200, `/garden/_speaking` 307 to login signed out, section 3 in the deployed bundle
- 2026-10-05 · iPhone check (Dylan, dev page section 3) · auto-stop by silence ✅, AAC m4a 6.46 s / 60.6 KB (well under the 1 MB upload limit) ✅, decoded 6.45 s at 16 kHz ✅, beep not in the clip ✅ (−153 dBFS in the first 200 ms). Still to try: silent switch on, a noisy place. (An earlier "getUserMedia is not available" came from how the page was opened, not the app; fine in Safari.)
- 2026-10-05 · dev page auto-stop diagnostics: Dylan's two noisy-room runs both ended by tap (150.1 KB / 6.50 s, 96.9 KB / 4.38 s; no beep leak). Section 3 now shows live quiet time vs 2 s, floor, gate, loudest, and the longest quiet after speaking, to see whether noise blocks the auto-stop (suspect: one loud bar resets the quiet time) · next: Dylan re-runs in the noisy place
- 2026-10-05 · noisy-place re-check (Dylan, dev page diagnostics) · auto-stop works: stopped by silence after 2.0 s quiet; floor −83 dBFS (iOS noise suppression), gate −40, loudest −10; beep not in the clip. The earlier taps came before 2 s. No change to the auto-stop rule (the single-blip reset wasn't seen) · still to try: silent switch on
- 2026-10-05 · silent-switch bug (Dylan's iPhone): with the switch on the live meter read only zeros, so SP2 ended with "We couldn't hear you" although the voice was recorded. Fixed: iOS Audio Session `play-and-record` while recording (back to `auto` after), and a dead meter never triggers "not heard" (tap / 30 s cap instead) · next: deploy, Dylan re-checks with the switch on
- 2026-10-05 · silent switch re-check (Dylan, after 5e5852c) · ✅ meter live with the switch on (floor −84, gate −41, loudest −11 dBFS), stopped by silence, 11.48 s / 262.3 KB, beep not in the clip: the Audio Session fix works on his iOS (the dead-meter net wasn't needed) · next: one Pond sentence with the switch on; M4 recordings; G5
- 2026-10-05 · G5 · done (Dylan): Google Cloud budget alerts / quotas / key restrictions set in the console (details not recorded here) · next: M4 calibration recordings; one Pond sentence with the silent switch on
- 2026-10-05 · M4 · calibrated on 63 synthetic clips (notes §20 M4): rules M4-a (target 3×, caps 69 / 89) and M4-b (function words by Whisper, trust sounds ≥ 85, UK/US spellings); good 33/35 fruit with 2/35 false flags (was 15/35), wrong target 7/7 sprout (was 4/7 fruit). Scorer live; backend sends `target_index` (deploy). Real recordings still to run through `calibrate.py`
- 2026-10-05 · deploy · M4 live (81dd0ff): backend sends `target_index`, scorer on the M4 rules; www + API 200
- 2026-10-06 · M4 · **done**: Dylan tried The Pond with a Vietnamese speaker on UAT (server checking, M4 rules): working. Phase 13 build work complete; open: Vietnamese / Chinese text reviews, the optional Playwright run, one Pond sentence with the silent switch on
- 2026-10-06 · entry points removed (Dylan, redesign) · "Say this one?" on review cards and the Sound Garden card on Missions taken out (notes §21); `/sounds`, the speaking API and the scorer stay. Vitest 514 passed with the same 66 known failures · next: deploy; the redesign
- 2026-10-06 06:58 · deploy · entry points removed on UAT (0e47e01): all 4 steps OK; www + API 200; `/sounds` still served (307 to login signed out); neither entry point's code is in the deployed bundle
- 2026-10-06 22:50 · deploy · speech-check queue v1 live (bc73d75): all 4 steps OK; www + API 200; `POST /speaking/check` and `GET /speaking/check/:id` mapped (401 without a token); the worker is attached to `speech-check-queue` in Redis; both scorers healthy; the frontend bundle polls and has the quick-check text; no backend errors since the restart
