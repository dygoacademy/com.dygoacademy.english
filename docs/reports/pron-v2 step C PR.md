# Pronunciation v2, Step C: UAT checks (2026-10-25)

Steps A + B merged into `seeds-harvest/phase-2` (`180b288`) and deployed to UAT at 11:45 (deploy log: all steps OK).
Step C fix `06aef8f` deployed at 12:26. Branch `pron-v2/step-c`.

## How it was run

- `com.dygoacademy.automationtesting/ui/pron-v2-uat.mjs`: Chrome at 390 × 844 @2x, iPhone user agent, the UAT
  build served on this Mac (`http://localhost:3000`, the same build as www.dygoacademy.com), the seed test learner
  (`11111111-…`, app language Vietnamese; session from `ui/.auth/user.json`, signed in by Dylan's run), each take
  fed in as the microphone (`--use-file-for-fake-audio-capture`). Labels are read from the app's message files in
  the page's language.
- Takes in `pron-v2 step C/audio/`: Google TTS in another voice than the native one (en-US-Neural2-D), 0.8 s of
  silence before, 3 s after. Scored live by the UAT speech scorers.
- Database: read-only snapshots before and after.

## Results

| # | Check | Result | Screenshots |
| --- | --- | --- | --- |
| 1 | sunny: a pass on the last bee | **PASS**: "Qua suối gọn gàng!" (Clean crossing!), Về luống (Back to the bed), Đọc lại (Say it again), Ong 1/1; score 98 | `1-sunny-P1/P2/P4.png` |
| 2 | compensation: 4 stones, SA big | **PASS**: P1 pond com · pen · SA · tion with SA the big stone; P4 with 4 chips and "Next bee: sunny"; score 99 | `2-compensation-P1/P2/P4.png` |
| 3 | mitigate retry, chip ti selected plays native ti then yours, Try again / Skip | **NOT REACHED**: see "Scorer finding". The chip behaviour (selected chip, native then you, Try again / Skip) passes in the app tests. | n/a |
| 4 | mitigate almost perfect | **NOT REACHED**: same finding. The almost state (close stone, Polish {syl}) passes in the app tests and screenshots (Step B). | n/a |
| 5 | cloudy said as "cloud" | **PASS**: P2b "That sounded like another word", "We heard “cloud”. Say just “cloudy”.", no play buttons; Try again records straight away | `5-cloudy-P1/P2/P2b.png` |
| 6a | a quiet try → P2b, doesn't count | **PASS**: "We couldn't hear you", "This try doesn't count. Nothing is lost.", nothing uploaded | `6-quiet-P1/P2/P2b.png` |
| 6b | a pass changes no stage / review date | **PASS**: no `user_word_srs` row for sunny, cloudy or compensation before or after; the sunny pass only added its `speaking_harvests` row (98) | DB diff below |
| 6c | no recording left after leaving P4 | **PASS** (after the fix): the take's blob URL can't be read after Back to the bed (also when You was played); the server zero-fills it after scoring, and the test learner (no consent) has no kept donation | n/a |
| 7 | every play button is the same SoundButton with loading / playing | **PASS**: P1 Hear it went to `loading`, the P4 Native pill to `playing` after a tap (`data-sound`); P3's Hear mine / Hear native use the same component (tests) | `7-P1-hear-it.png`, `7-P4-native-playing.png` |

`results.json` has the run's raw lines.

### Database (test learner), before → after

- `user_word_srs` for the three words: none → none.
- `speaking_harvests`: + sunny 98 (pollinated, visual only).
- `product_events`: pron_scored 13, pron_not_heard 5, pron_word_played 12 (all runs of the day).
- `voice_donations`: 74 → 77, all three from two other learners with an active consent, practising at the time;
  none from the test learner.

### The fix (`06aef8f`)

The first run reported the take still readable after "Back to the bed". Most of that was the check itself: it read
the take as soon as the URL changed, before the old screen unmounted and revoked it (the check now waits for P4 to
leave the page). The fix makes clearing a take also take it out of the shared audio element when that holds it
(after You was played); with it deployed, the take is gone in both cases.

## Scorer finding (checks 3 and 4)

With synthetic takes, one wrong syllable mostly still passes:

| Take (what was said) | Score | Result |
| --- | ---: | --- |
| mitigate /ˈmɪtaɪɡeɪt/ (ti said "tie") | 98 | pass, all clean (Whisper heard "Mid -high gate") |
| mitigate /ˈmɪtəɡeɪt/, /ˈmɪtiɡeɪt/, /ˈmɪtɛɡeɪt/, /ˈmiːtɪɡeɪt/ | 99 | pass, all clean |
| compensation /…ˈsæʃən/ (the board's "sæ") | 98 | pass, all clean |
| sunny /ˈsʌnaɪ/ (the board's "naɪ") | 87 | P2b other word (Whisper heard "son I") |
| mitigate /ˈmaɪtaɪɡeɪt/ | 71 | P2b other word ("Might I gate?") |

The GOPT phone scores barely move for a changed vowel (ti: 95–98), and the utterance score is 81 for the wrong take
against 84 for the right one. Bigger mistakes are caught, but Whisper then hears another word, so they end on P2b,
not P4 retry. So P4 retry / almost perfect are rarely reached. Options, for Dylan:

1. Calibrate on real learner takes (the opted-in voice donations, 77 so far) before changing any rule.
2. Use the speech server's new per-phone `heard` (greedy decode): a vowel heard differently from the target caps that
   syllable's score. It caught "nɑ" for "ni" but was null (unsure) for "taɪ" and "sæ", so it needs tuning.
3. Make another heard word always P2b (drop the "passes at 90+" rule): stricter, but Whisper also mishears good speech.

No rule was changed in Step C.

## For Dylan on the iPhone (can't be automated)

- Your real voice: one right and one deliberately wrong "mitigate", "sunny" as "sunnai", "compensation". Does a
  wrong syllable ever reach P4 retry / almost (the finding above)?
- The beep and the vibration before recording; the 4 s ring; the auto-stop 1 s after you stop.
- SP0 on a fresh install: "Allow microphone" → the iPhone prompt → recording; with the mic turned off in Settings → SP0 denied.
- Sound: Hear it / Slowly / Native / You and a chip (native then you) through the speaker with the silent switch on.
- Reduced motion on (Settings → Accessibility): no bee flight, no ring pulse.
