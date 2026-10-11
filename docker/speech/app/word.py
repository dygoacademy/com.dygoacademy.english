"""Pure rules for `POST /check-word` (Pronunciation "Stepping stones", P1–P4).

One word, one stone per syllable: the IPA is split into syllables with the
backend's rule (`speaking-timings.ts` `ipaSyllables`), each syllable scores
the mean of its phonemes' Goodness of Pronunciation, and the reply says
which syllable wobbled. No models here, so it's unit-tested.
"""

from __future__ import annotations

import re

import numpy as np

from .matching import canon, normalise

# A syllable under this (0–100) is wobbly: the stone tilts orange on P4.
WOBBLY_SCORE = 60
# Whisper heard one other word and the sounds score under this: "We heard 'medicate'".
OTHER_WORD_SCORE = 50
# Less voice than this (s) is nothing heard; so is no word heard with every syllable under NOTHING_SCORE.
MIN_VOICED_SECONDS = 0.3
NOTHING_SCORE = 20
# A 10 ms frame louder than this RMS (−40 dBFS, as the backend's SILENCE_RMS) is voiced.
VOICED_RMS = 0.01


def ipa_syllables(ipa: str | None) -> list[str]:
    """Syllables of an IPA transcription, stress marks kept: split on "." and
    before ˈ / ˌ, first variant only. "/ˈmɪt.ɪ.ɡeɪt/" → ["ˈmɪt", "ɪ", "ɡeɪt"]."""
    if not ipa:
        return []
    core = re.split(r"[,;]", ipa)[0].strip().strip("/[]").strip()
    parts = [p.strip() for chunk in core.split(".") for p in re.split(r"(?=[ˈˌ])", chunk)]
    return [p for p in parts if re.sub(r"[ˈˌ]", "", p)]


def syllable_scores(phone_scores: list[float], counts: list[int]) -> list[int | None]:
    """The mean phoneme score of each syllable, given how many phonemes each
    has (in order). A syllable with no phonemes the model knows is None."""
    out: list[int | None] = []
    i = 0
    for n in counts:
        mine = phone_scores[i : i + n]
        i += n
        out.append(round(sum(mine) / len(mine)) if mine else None)
    return out


def collapse_path(frame_ids: list[int], blank: int) -> list[int]:
    """CTC best path → phoneme ids: collapse repeats, drop blanks."""
    out, prev = [], None
    for f in frame_ids:
        if f != prev and f != blank:
            out.append(f)
        prev = f
    return out


def voiced_seconds(audio: np.ndarray, rate: int) -> float:
    """How much of the clip is louder than VOICED_RMS, in 10 ms frames."""
    frame = max(1, rate // 100)
    n = len(audio) // frame
    if n == 0:
        return 0.0
    frames = audio[: n * frame].reshape(n, frame)
    rms = np.sqrt((frames.astype(np.float64) ** 2).mean(axis=1))
    return float((rms > VOICED_RMS).sum()) * frame / rate


def word_status(word: str, heard: list[str], total: int, scores: list[int | None], voiced_s: float) -> str:
    """`not_heard`, `other_word` or `ok`."""
    words = [normalise(h) for h in heard if normalise(h)]
    known = [s for s in scores if s is not None]
    if voiced_s < MIN_VOICED_SECONDS or (not words and all(s < NOTHING_SCORE for s in known)):
        return "not_heard"
    if len(words) == 1 and canon(words[0]) != canon(word) and total < OTHER_WORD_SCORE:
        return "other_word"
    return "ok"
