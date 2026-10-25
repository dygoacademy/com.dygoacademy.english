# PR: pron-v2/step-b — Pronunciation v2, Step B (the screens)

Branch `pron-v2/step-b` off `pron-v2/step-a` (local git, no remote). Not merged, not deployed. Plan section 4,
with the 10 flagged defaults of Step A (Dylan, "Go", 2026-10-25).

## Commits

| Commit | What |
| --- | --- |
| `f02b873` | Screens: P4 v2, SP0, Say all, every event, messages in 3 locales, `/dev/pron` board page |
| (this file's commit) | Docs: design CHANGELOG (P1–P4, P2b, SP0 Built), README, `pronunciation.md`, this file |

## Summary

- **P1**: word, IPA · meaning, stones, the stored tip (falls back to the hop wording), Hear it / Slowly as
  SoundButtons (Slowly plays the slow clip, else the word at 0.7×), mic → SP0 the first time → P2.
- **P2**: beep, "Say {word} now", stones light left to right with the live voice, 4 s ring, Cancel → P1 with
  nothing sent.
- **P3**: shimmer, Hear mine / Hear native (SoundButtons); a scoring error, including a scorer split unlike
  the stones, → Check again / Record again.
- **P4 v2** (phone; the iPad keeps iP4): badge, headline and advice per pass / almost / retry ("{syl} was cut
  short." with no heard sound); the stones with chips (Clean / Close / Wobbly; tap = that syllable, native then
  you; selected = "Native → you"; the weak one starts selected on almost and retry; real buttons with aria
  labels); Whole word Native / You with lengths; the big button + link table, last-bee rows included; Bee k of N
  counts this round.
- **P2b**: quiet / noisy / other word (with the heard word), "This try doesn't count. Nothing is lost.",
  Try again → P2, Hear the word first → P1.
- **SP0**: ask (Allow microphone → the phone's prompt → P2; Not now → back) and denied (three steps; Open
  Settings asks for the mic again, since a web page can't open Settings; Practise listening instead → P1). It
  replaces the old denied notice in Pronunciation; the permission is read when the word opens, so the tap still
  starts the mic on iPhone. Nothing about voice donation.
- **Say all**: every bee the bed passes (the `PRON_MAX_WORDS = 3` cap is gone). Skip isn't a try. The take is
  deleted on leaving P4.
- **Events**: all 7 `pron_*` events.
- **Copy**: `screens.pronounce.result` and `screens.pronounce.mic` in en-US, vi-VN (from the `-vi` boards) and
  zh-CN (English layout; needs the usual native-speaker review). Words and syllables stay `lang="en"`.

## Tests

- Frontend: `tsc` and `npm run lint` clean. vitest: 42 failing tests in 32 files, the same as before this step
  (none new; the Speaking ones among them are the sentence flow's and failed on the base too).
- `PronounceLive.test.tsx`, 18 tests: pass (last bee), almost perfect (last bee, Polish), retry (chips,
  Skip), quiet, noisy, other word, scoring error (syllable mismatch), blocked word, SP0 ask and denied, a chip
  playing native then you, the take cleared on Try again and on leaving, Say all with 4 bees, the events.
- Unit tests from Step A (stone states, outcomes, button table, auto-stop, 0.3 s, one sound at a time) pass.

## Screenshot check

`/dev/pron` in `next dev` on the worktree (port 3210, never the UAT folder), Chrome, 390 × 844 @2x,
reduced motion, dev overlays hidden; pixelmatch (threshold 0.1) against `docs/design/garden/reference`.

| Screen | English | Vietnamese |
| --- | ---: | ---: |
| P1-say-word | 0.344 % | 1.241 % |
| P2-recording-beep | 0.486 % | 0.470 % |
| P2-recording | 0.362 % | 0.368 % |
| P3-checking | 0.012 % | 0.066 % |
| P2b-not-heard (quiet / noisy / other word) | 0.036 / 0.040 / 0.038 % | 0.099 / 0.094 / 0.092 % |
| P4-result-pass, -pass-last | 0.000 % | 0.026 % |
| P4-result-almost, -almost-last | 0.000 % | 0.026 % |
| P4-result-retry, -retry-last | 0.000 % | 0.019 % |
| P4-result-sunny-pass-last | 0.000 % | 0.026 % |
| P4-result-compensation | 0.000 % | 0.021 % |
| SP0-mic, SP0-mic-denied | 0.000 % | 0.000 % |

- P2: the live voice bars and the ring come from sample levels, not the board's drawn bars.
- P1: the IPA · meaning line is offset (the IPA letters ˈ ɪ ɡ fall back to another font; in Vietnamese the line
  is also a little taller, which moves everything under it by about 2 px), and the second dashed hop arc
  differs. This step didn't change those parts; to fix next.
- Not screenshotted: P1's Hear it loading / playing / error looks (the shared player decides them; covered by
  tests and unchanged from the 2026-10-18 build).

## Flagged defaults (from Step A, used as decided)

1. Almost perfect = a pass with any syllable under 85.
2. Skip to next bee doesn't count as a try.
3. Say all runs every bee it is given and stops on a retry (the learner then picks Try again or Skip).
4. A pass with a syllable under 60 shows it as close.
5. A retry with no syllable under 60 marks the lowest as wobbly.
6. A retry with 2+ wobbly stones: the badge counts the real clean stones, the headline stays "One wobbly stone",
   the lowest is selected.
7. A retry shows only clean and wobbly stones.
8. A scorer split unlike the stones is a scoring error (a one-stone word takes all its phones).
9. One-syllable words with data get one stone.
10. The "phone under 45" wobbly rule is dropped.

New in Step B:

11. Say all runs the bees the bed card offers (still at most 3 shown on A7), not every ripe word in the bed.
12. "You" on the pills shows the take's own length (the board's demo shows the native length on a clean pass).
13. SP0 shows once per device when the browser can't tell (older Safari), and always while the mic is off.
14. On P4, the chip's "you" part plays the syllable's time in the take; with an older scorer (no times) it plays
    the whole take.

## Still for Dylan

- Try it: after merging Step A + B into the UAT branch and deploying, or I can run this branch on a separate
  port for you first.
- The Chinese copy needs the usual native-speaker check.
