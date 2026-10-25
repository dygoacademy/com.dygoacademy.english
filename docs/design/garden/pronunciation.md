# Pronunciation: design guide (P1–P4, P2b, SP0)

How the screens of the canvas page **Adult · Pronunciation** are built, so the UI keeps matching the
canvas. P4 is the **v2** board (2026-10-25, Dylan's pronunciation rebuild plan); P1–P3 and P2b are the
boards of 2026-10-11 (see `CHANGELOG.md`). Exact values live in `reference/<name>.html`; build from
those, never by eye. English and Vietnamese boards (`-vi`); the iPad boards (iP1–iP4, iP2b) are
unchanged and not covered here.

| Screen | Board | References | Component |
| --- | --- | --- | --- |
| P1 Say the word | `PronStones` | `P1-say-word(-loading, -playing, -slowly, -sound-error)` | `pronounce/PronounceScreen.tsx` (`say`) |
| P2 Recording | `PronStonesRecord` | `P2-recording(-beep)` | same (`recording`) |
| P2b Couldn't hear you | `PronStonesNotHeard` | `P2b-not-heard(-noisy, -other-word)` | same (`notHeard`) |
| P3 Checking | `PronStonesChecking` | `P3-checking` | same (`checking`) |
| P4 Result v2 | `PronStonesResult` | `P4-result-pass(-last)`, `-almost(-last)`, `-retry(-last)`, `-sunny-pass-last`, `-compensation` | `pronounce/PronResult.tsx` (phone; the iPad keeps iP4) + `ResultStones.tsx` |
| SP0 Microphone | `SpeakMic` | `SP0-mic`, `SP0-mic-denied` | `pronounce/SpeakMicScreen.tsx` |

Every reference has a `-vi` twin. The numbers behind the rules are in one file each side:
`com.dygoacademy.frontend/src/lib/speaking/pron-config.ts` and
`com.dygoacademy.backend/src/modules/speaking/pron-config.ts`.

## Rules (plan section 2)

- No countdown: tap, beep + vibration, recording. It stops 1 s after the voice ends, at 4 s, or on a tap.
- Under 0.3 s of voice: P2b "quiet", nothing is sent. Too noisy: P2b "noisy".
- Pass = overall 80 %+ (visual only: never the stage or review dates). Almost perfect = a pass with a
  syllable under 85. Wobbly = a syllable under 60 (the only wobbly rule).
- Another word heard: always P2b when it is shorter (cloud for cloudy); else it passes only at 90 %+ with
  no wobbly syllable.
- One stone per stored syllable (`master_lexicon.syllables_us / _uk`); a word with none is not offered.
  The scorer splitting the word differently is a scoring error (P3 Check again / Record again).

## Shared frame (P4 v2)

- 390 × 844, `bg` #F4F1EA, padding 20 / 18 / 26, 14 px gap.
- Header: 44 px white circle Close (1 px `border` #E3DDD0, 20 px ✕), "PRONUNCIATION" 12 px bold
  uppercase, letter-spacing 0.1em, `success` #3E7F5A; "Bee k of N" 13 px bold `text-muted` #5E6A62.
- Head block (padding 0 4, 6 px gap, pops in on a pass, `pop` 0.6 s): badge 12 px extra-bold uppercase,
  letter-spacing 0.06em, padding 4 / 10, radius 10 (pass and almost: `pron-pass` #DDE7DA on `forest`;
  retry: `gold-soft` #FBF4E4 on `gold-soft-text` #6B5215); headline Fraunces 600 32 / 1.1; line 16 / 1.45 #44524A.

## P4 stones card

- `forest` #24463A card, radius 26, overflow hidden. Drawing viewBox 334 × 150, water from y 110
  (`pond-water` #1F3E33, wave `pond-wave` #3A5E4F, 2).
- Stones (`layoutResultStones`): one slot of 334 / n each, centre at the slot's middle. Stressed: rx
  min(52, slot/2 − 4), ry 22, cy 100, text 23 px. Others: rx min(36, slot/2 − 14), ry 15, cy 104, text
  17 px. Text is DM Sans 700 HTML over the drawing at (cx/334, cy/150), centred.
- States: **clean** `stone-ok` #9CC39A; **close** `stone-close` #C8DDB8 with a `stone-close-edge`
  #E0B04A edge, 2.5, dashes 5 4; **wobbly** `stone-wobbly` #E8A87C, tilted −8° (stone and text).
- **Selected**: ring rx + 7, ry + 6, `stone-selected` #F2D28B, 3, breathing 0.9 → 0.2 over 1.2 s
  (`.pron-selected`; still under reduced motion).
- Bee: scale 1.6, at (first stone's cx, 22) on a retry; at (167, 22) flying off on a pass (`pron-away`).
- Chips: a grid of n equal columns, 6 px gap, padding 0 10 12; each 52 px, radius 16, 2 px
  border, 15 px bold syllable with an 11 px play icon, 11 px semibold label. Clean `pron-chip` #2E5446 /
  #DDE7DA / `pron-chip-line` #3A5E4F "Clean"; close #FBF4E4 / #6B5215 / dashed #E0B04A "Close"; wobbly
  #FBEFE9 / #8A3E20 / #E8A87C "Wobbly"; selected `bg` #F4F1EA / `text` / #F2D28B "Native → you".

## Sound buttons (SoundButton)

One component, one shared player (only one sound at a time; a tap while playing stops it), states ready /
loading (spinner) / playing (bars) / couldn't play (the P1 line "Couldn't play the sound. Tap to try
again.", 13 px semibold `primary-text`). Looks per board:

- `hear` (P1 Hear it / Slowly) and `outline` (P3 Hear mine / Hear native): 48 px, radius 16, white,
  `border`, 15 px bold `forest`; loading `forest-wash` + `forest-wash-border`; playing `forest` with white.
- `pill` (P4 Native / You, after "Whole word" 13 px bold muted): 44 px, radius 22, 14 px bold, a 14 px
  play icon and the length (600, muted). Native: `forest-wash` #F1F6EF, `sprout-border` #C9D8C4,
  `forest`. You: `pron-mine` #FBF1EC, `primary-border` #EBC7B6, `primary-text` #8A3E20.

## P4 buttons

Main: 60 px clay `primary` #B4552E, radius 20, shadow 0 4 0 #7E3719, 17 px bold, 20 px icon after the
label. Link under it: min 44 px, 15 px semibold muted, 16 px icon before.

| Outcome | Middle bee | Last bee |
| --- | --- | --- |
| Pass | Next bee: {word} → · Say it again | Back to the bed → · Say it again |
| Almost perfect | Next bee: {word} → · Polish {syl}: say it again | Back to the bed → · Polish {syl}: say it again |
| Retry | Try again (mic) · Skip to next bee | Try again (mic) · Back to the bed |

## Copy (board)

- Pass: "Pollinated · n of n stones", "Clean crossing!", "{word} is pollinated. Tap any stone to hear it back."
- Almost: same badge, "Good crossing!", "It counts. {syl} was close: aim for {ipa}. Tap {syl} to compare."
- Retry: "Almost · {clean} of n stones", "One wobbly stone", "{syl} sounded like {heard}. Aim for {ipa}.
  Tap {syl} to compare." (no heard IPA: "{syl} was cut short.").
- Vietnamese: from `reference/P4-result-*-vi.html` ("Qua suối gọn gàng!", "Qua suối rồi!", "Một hòn đá
  còn chênh vênh", "Bản xứ" / "Bạn", "Ong k/N").

## SP0 Microphone (first time)

- Padding 22 / 20 / 24, Close top right. Ask: mic-and-sprout drawing 190 × 170 (`forest` disc r 50, two
  `pond-path` ripples), Fraunces 28 "Let your garden hear you", 15 px muted line, a white card (radius 20,
  14 / 16) with three 36 px `pron-pass` icon rows (14 px), "Next, your phone will ask. Tap **Allow**."
  13 px, 56 px clay "Allow microphone", "Not now" link. Denied: grey drawing with a clay strike,
  "Your microphone is off", three numbered steps (28 px forest circles), 56 px forest "Open Settings"
  (shadow #142A21), "Practise listening instead".
- Nothing about voice donation on these screens (Dylan, 2026-10-25): "Your recording is checked, then deleted".

## Flow (Step B)

- P1 mic → SP0 the first time on a device (or while the browser says the mic is off) → Allow → P2. The
  permission is read when the word opens, so the tap itself starts the mic (iPhone).
- P2 Cancel → P1, nothing sent. Too quiet / too noisy → P2b, nothing sent. Another word → P2b (other).
- P3 failure, including a scorer split unlike the stones → Check again / Record again.
- P4 chip: that syllable from the word clip (its stored span, at 0.7×), then the learner's (its time in
  the take). Pills: the whole word. Leaving P4 (next bee, skip, back to the bed, close, try again)
  deletes the take.
- Say all: every bee the bed passes, one after another; Skip to next bee isn't a try.
- Events: `pron_scored`, `pron_not_heard`, `pron_chip_played`, `pron_word_played`, `pron_say_again`,
  `pron_skipped`, `pron_word_blocked` (POST /events).

## Checking a screen

`/dev/pron?s=<state>&locale=en-US|vi-VN` (development only; `next dev` in a copy of the frontend, never
the UAT folder) draws each board state from the boards' sample data: `P1`, `P2`, `P2-beep`, `P3`,
`P2b-quiet`, `P2b-noisy`, `P2b-other`, `P4` (`result`, `round`, `word`), `SP0-ask`, `SP0-denied`.
Screenshot at 390 × 844 @2x with reduced motion and compare with `reference/<name>.png`.
