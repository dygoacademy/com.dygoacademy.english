"""Sentence → phones (ARPAbet, 39 classes + stress digits) for the GOPT scorer.

CMUdict first (the lexicon GOPT's training labels use); a word it doesn't
have (names, numbers, new words) falls back to the phoneme model's own
espeak tokens converted to ARPAbet. Pure rules, no models: unit-tested.
"""

from __future__ import annotations

import os
import re
from functools import lru_cache
from typing import Callable

from .matching import normalise, tokens

CMUDICT = os.path.join(os.path.dirname(__file__), "data", "cmudict.dict")
MAX_PHONES = 50  # GOPT's sequence length

# The phoneme model's espeak (en-us) tokens → ARPAbet. Vowels carry a stress
# digit (0 for the reduced ones); the digit only matters for AH0 / ER0.
TOKEN_TO_ARPA: dict[str, list[str]] = {
    "ə": ["AH0"], "ɐ": ["AH0"], "ʌ": ["AH1"], "ɛ": ["EH1"], "e": ["EY1"], "ɪ": ["IH1"], "ᵻ": ["IH0"], "ɨ": ["IH0"],
    "i": ["IY1"], "iː": ["IY1"], "ɑː": ["AA1"], "ɑ": ["AA1"], "ɔː": ["AO1"], "ɔ": ["AO1"], "ʊ": ["UH1"],
    "uː": ["UW1"], "u": ["UW1"], "æ": ["AE1"], "a": ["AE1"], "aɪ": ["AY1"], "aʊ": ["AW1"], "eɪ": ["EY1"],
    "oʊ": ["OW1"], "o": ["OW1"], "ɔɪ": ["OY1"], "ɜː": ["ER1"], "ɜ": ["ER1"], "ɚ": ["ER0"],
    "ɛɹ": ["EH1", "R"], "ɪɹ": ["IH1", "R"], "ʊɹ": ["UH1", "R"], "ɑːɹ": ["AA1", "R"], "ɔːɹ": ["AO1", "R"],
    "əl": ["AH0", "L"], "aɪɚ": ["AY1", "ER0"], "aɪə": ["AY1", "AH0"],
    "n": ["N"], "s": ["S"], "t": ["T"], "l": ["L"], "k": ["K"], "d": ["D"], "m": ["M"], "ɾ": ["D"], "p": ["P"],
    "z": ["Z"], "ð": ["DH"], "f": ["F"], "j": ["Y"], "v": ["V"], "b": ["B"], "ɹ": ["R"], "r": ["R"], "w": ["W"],
    "ɡ": ["G"], "ʃ": ["SH"], "h": ["HH"], "ŋ": ["NG"], "θ": ["TH"], "tʃ": ["CH"], "dʒ": ["JH"], "ʒ": ["ZH"],
}


@lru_cache(maxsize=1)
def cmudict() -> dict[str, list[str]]:
    """word → phones of its first pronunciation. Entries look like `word(2) K AE1 T`."""
    out: dict[str, list[str]] = {}
    with open(CMUDICT, encoding="utf-8") as fh:
        for line in fh:
            parts = line.split("#", 1)[0].split()  # entries may end with "# name, german"
            if len(parts) < 2:
                continue
            word = re.sub(r"\(\d+\)$", "", parts[0])
            out.setdefault(word, parts[1:])
    return out


def tokens_to_phones(toks: list[str]) -> list[str]:
    """Convert phoneme-model tokens to ARPAbet; tokens with no English equivalent are dropped."""
    out: list[str] = []
    for t in toks:
        out.extend(TOKEN_TO_ARPA.get(t, []))
    return out


def word_phones(word: str, fallback: Callable[[str], list[str]] | None = None) -> list[str]:
    """ARPAbet phones of one word ([] when nothing is known)."""
    w = normalise(word)
    if not w:
        return []
    hit = cmudict().get(w)
    if hit is None and w.endswith("'s"):
        hit = cmudict().get(w[:-2])
        if hit is not None:
            hit = hit + (["Z"] if hit[-1] not in ("S", "Z", "SH", "ZH", "CH", "JH") else ["AH0", "Z"])
    if hit is not None:
        return list(hit)
    return tokens_to_phones(fallback(w)) if fallback else []


def sentence_phones(sentence: str, fallback: Callable[[str], list[str]] | None = None) -> list[tuple[str, list[str]]]:
    """(word, phones) for each word of the sentence, in the order `tokens()` gives."""
    return [(w, word_phones(w, fallback)) for w in tokens(sentence)]


def chunks(words: list[list[str]], limit: int = MAX_PHONES) -> list[list[int]]:
    """Groups of consecutive word indexes whose phones fit in GOPT's `limit`;
    a word with no phones is left out; one over the limit alone is cut by the caller."""
    out: list[list[int]] = []
    cur: list[int] = []
    n = 0
    for i, ph in enumerate(words):
        if not ph:
            continue
        if cur and n + len(ph) > limit:
            out.append(cur)
            cur, n = [], 0
        cur.append(i)
        n += len(ph)
    if cur:
        out.append(cur)
    return out
