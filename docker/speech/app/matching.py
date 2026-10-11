"""Pure rules for the speech scorer (no models, so they're unit-tested).

`match_words` lines up what Whisper heard with the reference sentence;
`word_status` turns a word's sound score plus that match into the mark the
app shows (ok / missing / unclear, with `heard` for a different word).
Thresholds come from spike M1 and the M4 calibration (phase/phase 13/PHASE-13-RECORD.md §20) and are tuned in M4
with real recordings.
"""

from __future__ import annotations

import difflib
import re
from dataclasses import dataclass

# A word's sound score (0–100) below this is "unclear"; below MISSING_SCORE
# and not heard by Whisper it's "missing".
UNCLEAR_SCORE = 60
MISSING_SCORE = 40
# Whisper heard another word, but the sounds score at least this: trust the
# sounds (M4-b). Calibration: real wrong words scored 21–62, Whisper's
# mishearings of good speech ("months" → "onts") 99–100.
HEARD_TRUST_SCORE = 85

# GOPT scorer scale (POST /check-gopt). GOPT predicts word accuracy 0–100 with a high median
# (98): the best F1 for catching a human-marked mispronounced word (accuracy <= 5/10) on
# speechocean762 was at 80 (flags 9% of words; humans marked 7.6%). "Missing" and the
# Whisper-heard-another-word trust level are provisional: no data to calibrate them yet.
GOPT_UNCLEAR_SCORE = 80
GOPT_MISSING_SCORE = 40
GOPT_HEARD_TRUST_SCORE = 90

# Short words the sound model can't judge (a few frames, reduced vowels):
# Whisper decides. Heard → ok; not heard → missing (M4-b). Same list as the
# app's FUNCTION_WORDS (src/lib/speaking/constants.ts).
FUNCTION_WORDS = set(
    (
        "a an the of to in on at for and or but nor so yet is are was were be been being am "
        "it its as by with from into onto that this these those can could will would shall should "
        "may might must do does did has have had not if than then there their they them we us our "
        "you your he him his she her i me my mine who whom which what when where how all some any no"
    ).split()
)

# Short words people say more than one way. Each word's sound score is the
# best over these (espeak only gives one, e.g. /ðə/, but "the effects" is
# said /ði/). Spellings are espeak-style IPA, as the phoneme model writes them.
VARIANTS: dict[str, list[str]] = {
    "the": ["ðə", "ði", "ðɪ"],
    "a": ["ə", "eɪ"],
    "an": ["ən", "æn"],
    "to": ["tə", "tuː", "tʊ"],
    "of": ["əv", "ʌv", "ə"],
    "and": ["ənd", "ænd", "ən"],
    "for": ["fɚ", "fɔːɹ"],
    "can": ["kən", "kæn"],
    "that": ["ðæt", "ðət"],
}


def normalise(word: str) -> str:
    """Lower case, letters, digits and inner apostrophes only."""
    return re.sub(r"[^a-z0-9']+", "", word.lower().replace("’", "'")).strip("'")


def canon(word: str) -> str:
    """A spelling key that treats UK and US spellings as one word (M4-b):
    criticise / criticize, colour / color, centre / center."""
    w = normalise(word)
    w = re.sub(r"is(e|ed|es|ing|ation|ations)$", r"iz\1", w)
    if len(w) > 4:
        w = re.sub(r"our(s|ed|ing)?$", r"or\1", w)
        w = re.sub(r"tre(s)?$", r"ter\1", w)
    return w


def tokens(sentence: str) -> list[str]:
    return [w for w in sentence.split() if normalise(w)]


@dataclass
class WordMatch:
    """What Whisper heard for one reference word."""

    heard: str | None  # Whisper's word when it heard a different one
    found: bool  # Whisper heard this exact word
    start: float | None = None
    end: float | None = None


def match_words(reference: list[str], heard: list[dict]) -> list[WordMatch]:
    """Lines up Whisper's words (`{"word", "start", "end"}`) with the
    reference words. Equal runs are found; a 1:1 replaced run gives `heard`;
    reference words with nothing heard are not found."""
    ref = [canon(w) for w in reference]
    hyp = [canon(h["word"]) for h in heard]
    out = [WordMatch(heard=None, found=False) for _ in reference]
    sm = difflib.SequenceMatcher(a=ref, b=hyp, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                h = heard[j1 + k]
                out[i1 + k] = WordMatch(None, True, h.get("start"), h.get("end"))
        elif op == "replace":
            # Pair word by word as far as both sides go; extra reference words stay not found.
            for k in range(min(i2 - i1, j2 - j1)):
                h = heard[j1 + k]
                out[i1 + k] = WordMatch(normalise(h["word"]) or None, False, h.get("start"), h.get("end"))
    return out


def word_status(
    score: int,
    match: WordMatch,
    word: str = "",
    *,
    unclear: int = UNCLEAR_SCORE,
    missing: int = MISSING_SCORE,
    trust: int = HEARD_TRUST_SCORE,
) -> tuple[str, str | None]:
    """(status, heard) for one word: `missing`, `unclear` or `ok`. The three
    thresholds default to the GOP scale; the GOPT scorer passes its own."""
    function_word = normalise(word) in FUNCTION_WORDS
    if function_word:
        # Too short to judge by sound: Whisper decides.
        if match.found:
            return "ok", None
        if match.heard is None:
            return "missing", None
    if match.heard is not None:
        if score >= trust:
            return "ok", None  # Whisper misheard; the sounds are right
        return "unclear", match.heard
    if not match.found and score < missing:
        return "missing", None
    if not match.found and score < unclear:
        return "unclear", None
    if score < missing:
        return "unclear", None
    return "ok", None


# Total score rules (M4-a, calibrated 2026-10-05 on calibration/; README).
TARGET_WEIGHT = 3  # the practised word counts this many times in the mean
UNCLEAR_CAP = 50  # an unclear word counts at most this, whatever its sound score
ANY_MISTAKE_CAP = 89  # any missing / unclear word: no fruit (fruit = all said right)
TARGET_WRONG_CAP = 69  # target word missing / unclear: sprout at best


def total_score(
    word_scores: list[int],
    statuses: list[str],
    indexes: list[int] | None = None,
    target_index: int | None = None,
    words: list[str] | None = None,
) -> int:
    """0–100 for the sentence: a weighted mean of the word scores (the
    target word TARGET_WEIGHT times; missing = 0; unclear at most
    UNCLEAR_CAP; with `words`, a function word judged ok counts 100, since
    the sound model can't score words that short), then capped: any mistake
    → ANY_MISTAKE_CAP, a wrong or missing target word → TARGET_WRONG_CAP.
    Without `target_index` every word weighs the same."""
    if not word_scores:
        return 0
    indexes = indexes if indexes is not None else list(range(len(word_scores)))
    num = den = 0.0
    target_status = None
    texts = words if words is not None else [""] * len(word_scores)
    for sc, st, ix, text in zip(word_scores, statuses, indexes, texts):
        if st == "ok" and normalise(text) in FUNCTION_WORDS:
            sc = 100
        value = 0 if st == "missing" else min(sc, UNCLEAR_CAP) if st == "unclear" else sc
        weight = TARGET_WEIGHT if ix == target_index else 1
        num += value * weight
        den += weight
        if ix == target_index:
            target_status = st
    total = round(num / den)
    if any(st != "ok" for st in statuses):
        total = min(total, ANY_MISTAKE_CAP)
    if target_status is not None and target_status != "ok":
        total = min(total, TARGET_WRONG_CAP)
    return total
