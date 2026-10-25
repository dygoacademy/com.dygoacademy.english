# Pronunciation honeycomb: Phase 0 findings (2026-10-25)

Plan: `docs/specs/Pronunciation-honeycomb-implementation-plan.md`. No app code changed in this phase.

## Where the work happens

- New branch `pron-honeycomb` off `seeds-harvest/phase-2` (383ce14, what UAT runs), in the worktree
  `/Users/dylan/dygo/com.dygoacademy.english-honeycomb`. The UAT folder stays on its branch.
- `git status` in the UAT folder: 4 untracked items that aren't mine and aren't part of this work
  (`database/content/library_inventory_2026-10-23.md`, `docs/design/garden/_incoming/`,
  `docs/plans/A7 Add word button plan.md`, `docs/plans/This week and Garden Journal implementation plan.md`). Left alone.
- `pron-v2/scoring-tune` (afc9d3b, "WIP: pronunciation scoring tune") isn't merged. This redesign doesn't touch the scorer, so it stays separate.
- `P4-honeycomb-result-implementation-plan.md` isn't in the repo or the project files, so there was nothing to delete.
- Latest context: `Change Log.md` 2026-10-25, `docs/reports/pron-v2 step A/B/C PR.md` (the v2 stones build and its UAT run).
- The honeycomb boards are on the Design canvas ("Dygo Word Garden", `project/PronStones*.dc.html`, English). They aren't in `docs/design/garden/source/` yet. Phase 3 copies them in and makes the `-vi` references.

## Current code (frontend, `com.dygoacademy.frontend/src`)

| Part | Files |
| --- | --- |
| Route | `app/(garden)/sounds/word/page.tsx` → `components/garden/live/PronounceLive.tsx` (controller: phases, mic, take, check, events) |
| Screens | `components/garden/pronounce/PronounceScreen.tsx` (P1, P2, P3, P2b on phone and iPad; iP4 on iPad), `PronResult.tsx` (P4 v2, phone), `SpeakMicScreen.tsx` (SP0, unchanged) |
| Stones | `pronounce/PondStones.tsx`, `pronounce/ResultStones.tsx`; layout maths in `lib/speaking/pronounce.ts` |
| Rules | `lib/speaking/pron-config.ts` (numbers), `lib/speaking/pron-result.ts` (stoneView, p4Buttons, autoStop, tooQuiet) |
| Scoring call + types | `lib/speaking/pronounce.ts` `wordCheck()` → `POST /speaking/check-pronunciation`, poll `GET /speaking/check/:id`; `types/speaking.ts` `SpeakingWordCheckResult`, `SpeakingSessionItem` |
| Audio | `hooks/usePlayer.ts` (one shared audio element with tags, iOS fixes), `components/garden/SoundButton.tsx`, `lib/speaking/slow-clip.ts` (WSOLA slow copy), `hooks/useLiveLevels.ts` (AnalyserNode RMS, 20 bars/s), `hooks/useNativeEnvelope.ts` (decode + RMS envelope, cached by URL), `hooks/useTake.ts` (take in memory only), `lib/speaking/audio.ts`, `beep.ts` |
| Bee | `components/garden/Bee.tsx` |
| i18n | next-intl, `messages/{en-US,vi-VN,zh-CN}.json` under `screens.pronounce`; a key-parity test requires every key in all three files, so "ZH falls back to EN" means writing the EN text into zh-CN.json |
| Tokens | `src/app/globals.css` CSS variables + `tailwind.config.ts`; the iPad layout uses the app's `ipad:` variant (600px+, only under GardenRoot's iPad flag) |
| Preview page | `app/(dev)/dev/pron/PronGallery.tsx` (`/dev/pron`): the honeycomb modes and screens go here |

## Mapping to §4 (no backend change needed for the data)

| Plan field | Comes from |
| --- | --- |
| `word` | `item.word` |
| `syllables[].text / stressed` | the stored stones `item.syllables` (`syllables_us/_uk`, `{text, stressed, start_ms, end_ms}`), matched to the check by position |
| `syllables[].score` | `result.syllables[i].score` (per syllable, from the GOPT scorer) |
| `syllables[].targetIpa` | `result.syllables[i].ipa` |
| `syllables[].heardIpa` | `result.syllables[i].heard_ipa` (null = "Cut short") |
| `syllables[].startMs / endMs` | the learner's take: `result.syllables[i].start_ms/end_ms`; the native clip: the stored stone spans |
| `overallScore` | `result.total` |
| `nativeAudioUrl` | `nativeWord()` (the word clip in the accent, else the sentence clip's span) |
| `slowAudioUrl` | none since 383ce14: Slowly is the word clip slowed in the browser |
| `learnerAudioUrl` | the take's blob URL from `useTake` (in memory only) |
| `round` | `PronounceLive`'s word list (index, total, next word) |

Every field the plan needs is already returned, so the mock adapter isn't needed for data. I'll still add it behind
`NEXT_PUBLIC_PRON_MOCK=1` with the §4 table, because the real scorer rarely reaches retry/almost (Step C finding) and the
screenshots need those states.

## Gaps and conflicts

1. **The pass rule (needs Dylan).** The plan says one syllable under 80 makes the word a retry. The server sets
   `passed` (and pollinates the word) when the overall score is 80+. On the board's own retry example, mitigate
   95 / 56 / 94 has an overall of 82, so the server pollinates it while P4 says "Say it once more to pollinate".
   The fix is two lines in `speech-check.mapper.ts` (+ backend `pron-config.ts` and tests), but it changes the
   backend scoring contract.
2. **Slow rate.** The plan says 0.75; today it's 0.7 through the WSOLA slowed copy. 0.75 is one of the player's
   native rates, and that path is the one that went silent on iPhone (37de5bd). I'll keep the WSOLA copy and change the rate to 0.75.
3. **`useExclusiveAudio`.** I'll build it as a thin hook over the existing shared player (`usePlayer`) rather than a new
   audio element, so the iOS audio fixes keep working. One sound at a time and stopping on unmount already work there.
4. **The P1 tip.** It'll come from the syllables (`p1.tip`). The stored `pron_tip` (still the old "Hop across the
   stones" text) stops being read. Removing the column and its backfill is a backend/data change, so I'll leave it for now.
5. **The real scorer barely moves.** Step C found GOPT syllable scores stay at 95–98 for a wrong vowel. The honeycomb shows
   the scores honestly, but retry will stay rare with real voices until the scorer is tuned (`pron-v2/scoring-tune`, out of scope).
6. **The iPad breakpoint.** The plan says 768px+. The app's iPad layouts all switch at 600px (`ipad:`), so I'll match them.
7. **VI glossary.** Existing copy uses "Về luống" (Back to the bed), "Ong tiếp theo", "thụ phấn". I'll reuse those where the drafts differ.
8. **Events.** `pron_chip_played` stops firing because cells no longer play audio. The event name stays allowed in the database.

## What gets deleted (Phase 3)

- `components/garden/pronounce/PondStones.tsx`, `ResultStones.tsx`, the P4 chips in `PronResult.tsx` (rebuilt as the honeycomb P4).
- In `lib/speaking/pronounce.ts`: `POND`, `layoutStones`, `stoneTextWidth` (+ its letter-width tables), `layoutResultStones`,
  `RESULT_POND`, `hopParts`, and the syllable audio slicing `nativeSyllable` / `takeSyllable`.
- `stoneView` in `pron-result.ts` (replaced by `syllableStatus` / `resultKind`).
- In `PronounceScreen.tsx`: `VoiceBars`, the compare waveform, and the "Whole word" pills.
- Stone copy in `screens.pronounce` (`bigStone`, `hop*`, `pond`, `result.chip*`, `result.stones*`, …), replaced by the §5 keys.
- Their tests, rewritten for the honeycomb.

Kept: `litStones` (becomes the slot-based live fill), `stoneShares` (places the weak zone), the recorder, auto-stop, the P2b rules,
SP0, `useTake`, the shared player, `slow-clip.ts`.

## Test baseline

From the 2026-10-25 runs: frontend vitest 923 passed / 57 failed on this commit (pre-existing), tsc and lint clean; backend jest 646 passed.
New failures get compared against that.
