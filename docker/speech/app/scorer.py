"""Speech checking with two local models (Phase 13 G6, phase/phase 13/PHASE-13-RECORD.md §20).

- Words: faster-whisper (`base.en`, int8, beam 1) says what was said, with
  word timings, so a left-out word or another word ("migrate") shows up.
- Sounds: a wav2vec2 phoneme model (espeak phonemes). The sentence's
  expected phonemes are force-aligned to the recording and each one is
  scored by how sure the model is it was said, against its best guess for
  those frames (Goodness of Pronunciation), 0–100 per word.

Both run at the same time. Audio stays in memory: nothing is written to
disk and nothing about the recording or the sentence is logged.
"""

from __future__ import annotations

import os
import subprocess
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import torch
import torchaudio.functional as AF
from faster_whisper import WhisperModel
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

from .gopt_scorer import Gopt
from .matching import (
    GOPT_HEARD_TRUST_SCORE,
    GOPT_MISSING_SCORE,
    GOPT_UNCLEAR_SCORE,
    VARIANTS,
    match_words,
    normalise,
    tokens,
    total_score,
    word_status,
)
from .phones import sentence_phones
from . import word as wordcheck

RATE = 16000
MODELS_DIR = os.environ.get("MODELS_DIR", "/models")
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "base.en")
PHONEME_MODEL = os.environ.get("PHONEME_MODEL", "facebook/wav2vec2-lv-60-espeak-cv-ft")
THREADS = int(os.environ.get("MODEL_THREADS", "4"))
MAX_SECONDS = float(os.environ.get("MAX_AUDIO_SECONDS", "30"))


class AudioError(ValueError):
    """The upload isn't usable audio (not decodable, too short or too long)."""


def decode(data: bytes) -> np.ndarray:
    """Any format ffmpeg reads (m4a / webm / wav) → mono float32 at 16 kHz, through pipes."""
    proc = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-ac", "1", "-ar", str(RATE), "-f", "f32le", "pipe:1"],
        input=data,
        capture_output=True,
    )
    if proc.returncode != 0:
        raise AudioError("not decodable audio")
    audio = np.frombuffer(proc.stdout, dtype=np.float32).copy()
    seconds = len(audio) / RATE
    if seconds < 0.3:
        raise AudioError("too short")
    if seconds > MAX_SECONDS:
        raise AudioError("too long")
    return audio


class Scorer:
    def __init__(self) -> None:
        torch.set_num_threads(THREADS)
        os.environ.setdefault("HF_HOME", os.path.join(MODELS_DIR, "hf"))
        self.whisper = WhisperModel(
            WHISPER_MODEL,
            device="cpu",
            compute_type="int8",
            cpu_threads=THREADS,
            download_root=os.path.join(MODELS_DIR, "whisper"),
        )
        self.proc = Wav2Vec2Processor.from_pretrained(PHONEME_MODEL)
        self.model = Wav2Vec2ForCTC.from_pretrained(PHONEME_MODEL).eval()
        self.tok = self.proc.tokenizer
        self.blank = self.tok.pad_token_id
        vocab = self.tok.get_vocab()
        self.vocab = {k: v for k, v in vocab.items() if v not in (self.blank, self.tok.unk_token_id)}
        self.longest = max(len(k) for k in self.vocab)
        self.phoneme = {v: k for k, v in self.vocab.items()}
        self.pool = ThreadPoolExecutor(max_workers=2)
        self.gopt = Gopt(vocab, self.blank)
        # Warm up the models so the first real check isn't slow.
        self.check(np.zeros(RATE, dtype=np.float32), "Hello there.")
        self.check_gopt(np.zeros(RATE, dtype=np.float32), "Hello there.")

    # ── phonemes ──────────────────────────────────────────────────────────
    def word_ids(self, word: str) -> list[int]:
        """Expected phoneme ids for one word (the tokenizer phonemizes with espeak, en-us)."""
        ids = self.tok(word).input_ids
        return [i for i in ids if i in self.vocab.values()]

    def ipa_ids(self, ipa: str) -> list[int]:
        """Greedy longest match of an espeak-style IPA string over the model's phonemes."""
        out, i = [], 0
        while i < len(ipa):
            for n in range(min(self.longest, len(ipa) - i), 0, -1):
                if ipa[i : i + n] in self.vocab:
                    out.append(self.vocab[ipa[i : i + n]])
                    i += n
                    break
            else:
                i += 1  # stress marks etc.
        return out

    def logprobs(self, audio: np.ndarray) -> torch.Tensor:
        inputs = self.proc(audio, sampling_rate=RATE, return_tensors="pt")
        with torch.inference_mode():
            return self.model(inputs.input_values).logits.log_softmax(-1)[0]

    def gop(self, logp: torch.Tensor, ids: list[int]) -> tuple[list[float], list[list[int]]]:
        """Each phoneme's score (0–100) for `ids` force-aligned to `logp`, and its frames."""
        if not ids or logp.shape[0] < len(ids) * 2:
            return [0.0 for _ in ids], [[] for _ in ids]
        ali, _ = AF.forced_align(logp.unsqueeze(0), torch.tensor([ids]), blank=self.blank)
        spans: list[list[int]] = [[] for _ in ids]
        k, prev = -1, self.blank
        for f, lab in enumerate(ali[0].tolist()):
            if lab != self.blank and lab != prev:
                k += 1
            if lab != self.blank and 0 <= k < len(ids):
                spans[k].append(f)
            prev = lab
        best = logp.clone()
        best[:, self.blank] = -1e9
        best = best.max(-1).values
        scores = []
        for tid, fr in zip(ids, spans):
            if not fr:
                scores.append(0.0)
                continue
            scores.append(100 * float(np.exp(float((logp[fr, tid] - best[fr]).mean()))))
        return scores, spans

    def sound_scores(self, audio: np.ndarray, words: list[str]) -> list[int]:
        """One alignment of the whole sentence gives every word's score; only
        words with VARIANTS are re-aligned on their own frames (spike M2:
        re-aligning every word cost ~1 s)."""
        logp = self.logprobs(audio)
        per_word = [self.word_ids(w) for w in words]
        flat = [i for ids in per_word for i in ids]
        phone_scores, spans = self.gop(logp, flat)
        out, i = [], 0
        for w, ids in zip(words, per_word):
            mine, frames = phone_scores[i : i + len(ids)], [f for s in spans[i : i + len(ids)] for f in s]
            i += len(ids)
            if not ids or not frames:
                out.append(0)
                continue
            score = sum(mine) / len(mine)
            variants = VARIANTS.get(normalise(w), [])
            if variants:
                seg = logp[max(0, min(frames) - 2) : max(frames) + 3]
                for ipa in variants:
                    alt, _ = self.gop(seg, self.ipa_ids(ipa))
                    if alt:
                        score = max(score, sum(alt) / len(alt))
            out.append(round(score))
        return out

    # ── words ─────────────────────────────────────────────────────────────
    def heard_words(self, audio: np.ndarray) -> list[dict]:
        segments, _ = self.whisper.transcribe(
            audio,
            language="en",
            beam_size=1,
            word_timestamps=True,
            vad_filter=False,
            condition_on_previous_text=False,
        )
        return [
            {"word": w.word.strip(), "start": round(w.start, 2), "end": round(w.end, 2)}
            for seg in segments
            for w in (seg.words or [])
        ]

    # ── check ─────────────────────────────────────────────────────────────
    def check(self, audio: np.ndarray, sentence: str, target_index: int | None = None) -> dict:
        # `index` is the word's position in sentence.split(), as the app counts
        # (a lone "—" or "…" has a position but isn't scored).
        positions = [i for i, w in enumerate(sentence.split()) if normalise(w)]
        words = tokens(sentence)
        heard_f = self.pool.submit(self.heard_words, audio)
        sound_f = self.pool.submit(self.sound_scores, audio, words)
        heard, scores = heard_f.result(), sound_f.result()
        matches = match_words(words, heard)
        out_words, statuses = [], []
        for idx, w, sc, m in zip(positions, words, scores, matches):
            status, heard_word = word_status(sc, m, w)
            statuses.append(status)
            out_words.append(
                {"index": idx, "text": w, "score": sc, "status": status, "heard": heard_word, "start": m.start, "end": m.end}
            )
        return {
            "total": total_score(scores, statuses, positions, target_index, words),
            "heard_text": " ".join(h["word"] for h in heard),
            "duration_ms": round(len(audio) / RATE * 1000),
            "words": out_words,
        }

    # ── check with GOPT ───────────────────────────────────────────────────
    def espeak_phones(self, word: str) -> list[str]:
        """The phoneme model's own espeak tokens for a word CMUdict doesn't have."""
        return [self.phoneme[i] for i in self.word_ids(word)]

    def check_gopt(self, audio: np.ndarray, sentence: str, target_index: int | None = None) -> dict:
        """Same reply shape as `check`, scored by the GOPT transformer (`POST /check-pronunciation`):
        word and phone scores 0–100 from speechocean762-trained GOPT on this model's features;
        Whisper still says what was left out or said as another word."""
        positions = [i for i, w in enumerate(sentence.split()) if normalise(w)]
        pairs = sentence_phones(sentence, self.espeak_phones)
        words = [w for w, _ in pairs]
        heard_f = self.pool.submit(self.heard_words, audio)
        res = self.gopt.score(self.logprobs(audio), [p for _, p in pairs])
        heard = heard_f.result()
        matches = match_words(words, heard)
        out_words, scores, statuses = [], [], []
        for idx, w, g, m in zip(positions, words, res["words"], matches):
            if g is None:  # no phones known for the word, or audio too short to align: Whisper decides
                status, heard_word = ("ok", None) if m.found else ("unclear", m.heard) if m.heard else ("missing", None)
                score = None
            else:
                score = g["score"]
                status, heard_word = word_status(
                    score, m, w, unclear=GOPT_UNCLEAR_SCORE, missing=GOPT_MISSING_SCORE, trust=GOPT_HEARD_TRUST_SCORE
                )
            statuses.append(status)
            scores.append(score if score is not None else (100 if status == "ok" else 0))
            out_words.append(
                {
                    "index": idx,
                    "text": w,
                    "score": score,
                    "status": status,
                    "heard": heard_word,
                    "start": m.start,
                    "end": m.end,
                    "phones": g["phones"] if g else [],
                }
            )
        return {
            "total": total_score(scores, statuses, positions, target_index, words),
            "gopt": {"accuracy": res["accuracy"], "total": res["total"], "aligned": res["aligned"]},
            "heard_text": " ".join(h["word"] for h in heard),
            "duration_ms": round(len(audio) / RATE * 1000),
            "words": out_words,
        }

    # ── one word (Pronunciation, P1–P4) ───────────────────────────────────
    def check_word(self, audio: np.ndarray, word: str, ipa: str) -> dict:
        """One word, scored per syllable (`POST /check-word`). Sounds come
        from `ipa` (espeak spelling of the word when it's empty); a wobbly
        syllable gets `heard_ipa` when the model's own best guess for its
        frames is clearly something else."""
        syllables = wordcheck.ipa_syllables(ipa)
        per_syl = [self.ipa_ids(s) for s in syllables]
        if not any(per_syl):
            syllables, per_syl = [word], [self.word_ids(word)]
        heard_f = self.pool.submit(self.heard_words, audio)
        logp = self.logprobs(audio)
        flat = [i for ids in per_syl for i in ids]
        phone_scores, spans = self.gop(logp, flat)
        scores = wordcheck.syllable_scores(phone_scores, [len(ids) for ids in per_syl])
        total = round(sum(phone_scores) / len(phone_scores)) if phone_scores else 0
        heard = heard_f.result()
        out, i = [], 0
        for text, ids, score in zip(syllables, per_syl, scores):
            frames = [f for sp in spans[i : i + len(ids)] for f in sp]
            i += len(ids)
            wobbly = score is not None and score < wordcheck.WOBBLY_SCORE
            heard_ipa = None
            if wobbly and frames:
                path = logp[min(frames) : max(frames) + 1].argmax(-1).tolist()
                guess = "".join(self.phoneme.get(p, "") for p in wordcheck.collapse_path(path, self.blank))
                expected = "".join(self.phoneme[p] for p in ids)
                heard_ipa = guess if guess and guess != expected else None
            out.append({"ipa": text, "score": score if score is not None else total, "wobbly": wobbly, "heard_ipa": heard_ipa})
        status = wordcheck.word_status(
            word, [h["word"] for h in heard], total, scores, wordcheck.voiced_seconds(audio, RATE)
        )
        return {
            "status": status,
            "total": total,
            "heard_text": " ".join(h["word"] for h in heard),
            "duration_ms": round(len(audio) / RATE * 1000),
            "syllables": out,
        }
