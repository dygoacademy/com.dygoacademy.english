# Pronunciation honeycomb: session report (2026-10-25)

Plan: `docs/specs/Pronunciation-honeycomb-implementation-plan.md`. Phase 0 findings: `docs/reports/Pronunciation honeycomb phase 0.md`.
Branch `pron-honeycomb` (worktree `com.dygoacademy.english-honeycomb`), on top of `seeds-harvest/phase-2` at ad48f01 (pron_tip removed).
**Not deployed.** UAT still runs the stepping stones.

## What changed

| Commit | Phase | What |
| --- | --- | --- |
| 6677904 | Docs | The plan and the Phase 0 findings |
| 7db2c0b | 1 | Backend pass rule (approved by Dylan, 2026-10-25): a word passes and pollinates only when the check is `ok` and **every syllable scores 80+** (was: overall 80+). Frontend `lib/pronunciation/` (scoring rules, P4 view model, P1 tip, P2 live fill, mock scorer), `useExclusiveAudio`, `useAudioEnvelope`, `useMicLevel`, `usePlayer` `stretch` |
| 8b4010e | 2 | `HoneycombBoard` (empty, live, checking, dim, result), `ListenCard`, `VoiceMeterComb`, `MirrorWave`, `MatchRing`, the `/dev/pron?s=comb` preview |
| 5a1909a | 3 | P1, P2, P3, P2b, P4 rebuilt on the honeycomb, phone and iPad in one tree. The stones (`PondStones`, `ResultStones`, `PronResult`), the stone layout, the syllable audio slicing and the stone copy and CSS are deleted |
| 8314c19 | Design | The honeycomb boards in `docs/design/garden/source/` and their English references (rule 13) |
| 41abbcf | 4 | Screen tests and the screenshots below |

Screen by screen:

- **P1**: empty cells (stressed syllable in capitals), Normal / Slowly with loading, playing (solid, "Playing, tap to stop"), stop and error states. The tip comes from the syllables ("say **MI** loud, **ti** light, then **gate**").
- **P2**: pale honey fills each cell once the voice reaches its slot of the native word (the stored syllable spans, else equal slots). The honeycomb meter follows the live mic level (AnalyserNode RMS, ~60 fps, short decay). "Starting…" during the beep, then the blinking dot and "Recording". No quality words. Auto-stop, the 4 s cap, quiet and noisy rules are unchanged.
- **P3**: honey rises and falls; Native / Your try both play; no close button; a server error shows Check again / Record again.
- **P2b**: dim cells and the bee with "?", quiet / noisy / other word; Try again → P2, Hear the word first → P1.
- **P4**: honey to each score, ✓ / ✗ badges, the 80% line, the detail strip (`aria-live`). A clean pass selects nothing ("All pass"); almost and retry select the weakest cell. Tapping a cell never plays audio. The listen card holds the mirror waveform (40 native bars over 40 of the take, the weak syllable's zone tinted), the match ring and Native / Your try, nothing else. CTAs as plan §5.
- **iPad** (the app's `ipad:` layout, 600px+): two columns, the word and board on the left, the listen card, tips and actions on the right.
- **Slowly** is the word clip at 0.75, from the copy slowed in the browser (pitch kept, WSOLA), because a slow `playbackRate` went silent on iPhone. `/garden/_speaking` Slow compare does the same.

## The mock scorer

`NEXT_PUBLIC_PRON_MOCK=1` replaces the server check with the plan's table (§4): the first try of a word is a retry, the second almost perfect, then a pass. Off by default; never set it on UAT or production.

## Tests

- Frontend `tsc --noEmit` and `next lint` clean.
- vitest: 72 failures, the same 72 as the base commit in this sandbox (sw.js, copy drift in Speaking/Home screens), none in pronunciation. The rewritten `PronounceLive` flow test (19 cases) and the honeycomb component tests (10) pass, plus the Phase 1 unit tests (thresholds 79 / 80 / 84 / 85, resultKind, the CTA matrix, live fill, the tip for 2-, 3- and 4-syllable words, one sound at a time).
- Component checks the plan asks for: cell selection → detail text, a new result resets the selection, play buttons are mutually exclusive, the P2 meter shows no quality words, keyboard order cells → play buttons → CTA, Vietnamese copy.
- Backend (Phase 1): jest passed with the new pass-rule tests (95 / 56 / 94 with an overall of 82 fails; 79 fails).
- `next build` not run in the sandbox (the known hang).

## Screenshots

`docs/reports/pron-honeycomb/` (84 files): every screen (P1, P2, P3, P2b, P4) × mitigate / compensation / cloudy × EN / VI × 390 and 1194 (iPad), plus P4 × pass / almost / retry and P2b × quiet / noisy / other word. Taken from `/dev/pron` with reduced motion. A 360px pass over every screen, word, locale and P4 result found no overflow.

Against the references (`docs/design/garden/reference/P*.png`), the screens match apart from font anti-aliasing and one planned difference: the pass line sits at y 76 (the plan's formula, 80% of the cell), the board draws it at 68.

## Open gaps

1. **The real scorer rarely says no.** GOPT syllable scores stay at 95–98 even for a wrong vowel (pron-v2 Step C), so most real tries will show "Sweet as honey!". Retry and almost appear with the mock. Tuning is `pron-v2/scoring-tune`, out of scope.
2. **No Vietnamese or iPad honeycomb boards.** vi-VN uses the English layout with translated copy; the iPad layout is the plan's two columns, not drawn on the canvas.
3. **Events.** `pron_chip_played` no longer fires (cells don't play audio). The name stays allowed in the database.
4. **Deploy order.** The backend pass-rule change and the new screens should go out together; the old P4 would show "Clean crossing" for a word the server now refuses to pollinate.
