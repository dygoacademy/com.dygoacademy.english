# Pronunciation: every stone fits its text (A)

Status: approved by Dylan (2026-10-18, option A on the decision card).
Frontend only, no migration. Backend: the syllable split for words whose IPA has no syllable dots.

## The problem (Dylan, 2026-10-18, iPhone screenshot of P4)

"CONDITIONAL" was drawn on one stone the size of a short syllable, so most of the dark text ran off the green stone onto the dark water. The word also showed as one stone instead of four.

## Why

- `layoutStones` gives every stone a fixed size (big 50, mid 40, small 32 on a phone), whatever its text.
- `wordSyllables` (backend) splits the spelling only when it has as many syllables as the IPA. An IPA without syllable dots (/kənˈdɪʃənəl/) splits into 2 parts at the stress mark, the spelling into 4, so neither matched and the learner got one stone for the whole word.

## Design (boards `PronStonesResult(Vi).dc.html`, new `result` options `long` and `one`)

- A stone is at least as wide as its text plus 0.6 × the font size on each side.
- Three stones keep the boards' places when they fit. Otherwise the row is packed in the middle (3 % gaps, 3 % margins) and shrunk, stones and text together, when it is wider than the card.
- New references: `P4-result-long-word(-vi)` (con · DI · tio · nal) and `P4-result-one-stone(-vi)` (a word with no split, one wide stone).

## Code

1. `lib/speaking/pronounce.ts`: `stoneTextWidth` (DM Sans bold widths, no DOM so server and client draw the same) and `layoutStones` sizing as above. Used by every pond (P1–P4, iPad).
2. Backend `speaking-syllables.ts`: when the IPA has no syllable dots, count its vowel groups instead of the stress-mark parts, so a word like "conditional" gets its spelling split.
3. Tests, typecheck, eslint, vitest (baseline 65), Change Log.
