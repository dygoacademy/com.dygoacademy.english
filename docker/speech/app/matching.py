"""Pure rules for the speech scorer (no models, so they're unit-tested).

`match_words` lines up what Whisper heard with the reference sentence;
`word_status` turns a word's sound score plus that match into the mark the
app shows (ok / missing / unclear, with `heard` for a different word).
Thresholds are first guesses from spike M1 (notes §20) and are tuned in M4
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
    ref = [normalise(w) for w in reference]
    hyp = [normalise(h["word"]) for h in heard]
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
                out[i1 + k] = WordMatch(hyp[j1 + k] or None, False, h.get("start"), h.get("end"))
    return out


def word_status(score: int, match: WordMatch) -> tuple[str, str | None]:
    """(status, heard) for one word: `missing`, `unclear` or `ok`."""
    if not match.found and match.heard is None and score < MISSING_SCORE:
        return "missing", None
    if match.heard is not None:
        return "unclear", match.heard
    if not match.found and score < UNCLEAR_SCORE:
        return "unclear", None
    if score < MISSING_SCORE:
        return "unclear", None
    return "ok", None


def total_score(word_scores: list[int], statuses: list[str]) -> int:
    """0–100: mean word score, with a missing word counting 0."""
    if not word_scores:
        return 0
    vals = [0 if st == "missing" else sc for sc, st in zip(word_scores, statuses)]
    return round(sum(vals) / len(vals))
