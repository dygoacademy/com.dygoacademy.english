"""GOPT pronunciation scorer on Dygo's wav2vec2 phoneme model (POST /check-gopt).

1. The sentence's phones (ARPAbet, `phones.py`) are force-aligned (CTC) to the
   recording with the phoneme model that `Scorer` already runs.
2. Each phone gets 84 features (same layout as GOPT's Kaldi features; kept in
   step with com.dydoacademy.gopt/wav2vec2/extract_feats.py): [0:39] log mean
   posterior of every phone class, [39:78] the same minus the phone's own
   class, then GOP, duration, blank probability, confidence, frames, "own
   class is the top one".
3. The trained transformer (`gopt_model.py`, speechocean762, 100 epochs) scores
   every phone, word and the utterance. Sentences over 50 phones go through in
   chunks of whole words.

Scores are returned 0–100 (the model's 0–2 scale × 50).
"""

from __future__ import annotations

import json
import os

import numpy as np
import torch
import torchaudio.functional as AF

from .gopt_model import GOPT
from .phones import chunks

DATA = os.path.join(os.path.dirname(__file__), "data", "gopt")
CLASSES = (
    "AA AE AH AO AW AY B CH D DH EH ER EY F G HH IH IY JH K L M N NG OW OY P R S SH T TH UH UW V W Y Z ZH"
).split()
# The IPA token each phone is aligned to, and the other tokens that count as the same class.
PRIMARY = {
    "AA": "ɑː", "AE": "æ", "AH": "ʌ", "AO": "ɔː", "AW": "aʊ", "AY": "aɪ", "B": "b", "CH": "tʃ", "D": "d", "DH": "ð",
    "EH": "ɛ", "ER": "ɜː", "EY": "eɪ", "F": "f", "G": "ɡ", "HH": "h", "IH": "ɪ", "IY": "iː", "JH": "dʒ", "K": "k",
    "L": "l", "M": "m", "N": "n", "NG": "ŋ", "OW": "oʊ", "OY": "ɔɪ", "P": "p", "R": "ɹ", "S": "s", "SH": "ʃ",
    "T": "t", "TH": "θ", "UH": "ʊ", "UW": "uː", "V": "v", "W": "w", "Y": "j", "Z": "z", "ZH": "ʒ",
}
ALSO = {
    "AA": ["ɑ", "ɐ", "ɑːɹ"], "AE": ["a"], "AH": ["ə", "ɐ"], "AO": ["ɔ", "ɔːɹ", "oː"], "D": ["ɾ"], "EH": ["e", "ɛɹ"],
    "ER": ["ɚ", "ɜ"], "EY": ["e"], "IH": ["ɨ", "ᵻ", "ɪɹ"], "IY": ["i"], "L": ["əl"], "OW": ["o"],
    "R": ["r", "ɾ", "ɛɹ", "ɑːɹ", "ɔːɹ", "ɪɹ", "ʊɹ", "ɚ"], "T": ["ɾ"], "UH": ["ʊɹ"], "UW": ["u"],
}
SCALE = 50  # model score (0–2) → 0–100


def pct(x: float) -> int:
    return int(round(min(100.0, max(0.0, x * SCALE))))


class Gopt:
    def __init__(self, vocab: dict[str, int], blank: int) -> None:
        self.blank = blank
        self.prim_id = {p: vocab[t] for p, t in PRIMARY.items()}
        self.cls_ids = [sorted({vocab[PRIMARY[p]]} | {vocab[t] for t in ALSO.get(p, []) if t in vocab}) for p in CLASSES]
        self.ah0, self.er0 = vocab["ə"], vocab["ɚ"]
        norm = json.load(open(os.path.join(DATA, "norm.json")))
        self.mean, self.std = norm["mean"], norm["std"]
        index = json.load(open(os.path.join(DATA, "phone_index.json")))
        self.phn_index = {p: index[p] for p in CLASSES}
        self.model = GOPT(embed_dim=24, num_heads=1, depth=3, input_dim=84)
        sd = torch.load(os.path.join(DATA, "gopt_wav2vec2.pth"), map_location="cpu", weights_only=True)
        self.model.load_state_dict({k.removeprefix("module."): v for k, v in sd.items()})
        self.model.eval()

    # ── features ──────────────────────────────────────────────────────────
    def features(self, lp: torch.Tensor, phones: list[str]) -> tuple[np.ndarray, bool]:
        """(n, 84) float32 for the phones (ARPAbet with stress digits) force-aligned
        to `lp` (log-softmax frames × vocab); False when the audio is too short to align."""
        n = len(phones)
        pure = [p.rstrip("012") for p in phones]
        ids = [self.ah0 if p == "AH0" else self.er0 if p == "ER0" else self.prim_id[q] for p, q in zip(phones, pure)]
        out = np.zeros((n, 84), np.float32)
        t = lp.shape[0]
        if n == 0 or t < 2 * n:
            return out, False
        ali, _ = AF.forced_align(lp.unsqueeze(0), torch.tensor([ids]), blank=self.blank)
        spans: list[list[int]] = [[] for _ in ids]
        k, prev = -1, self.blank
        for f, lab in enumerate(ali[0].tolist()):
            if lab != self.blank and lab != prev:
                k += 1
            if lab != self.blank and 0 <= k < n:
                spans[k].append(f)
            prev = lab
        probs = lp.exp()
        nb = lp.clone()
        nb[:, self.blank] = -1e9
        best = nb.max(-1).values
        pmax = probs.clone()
        pmax[:, self.blank] = 0
        pmax = pmax.max(-1).values
        q = probs / (1 - probs[:, self.blank : self.blank + 1]).clamp_min(1e-4)  # posteriors without blank
        cls = torch.stack([q[:, c].sum(-1) for c in self.cls_ids], -1)  # (T, 39)
        starts = [s[0] if s else None for s in spans]
        ok = all(spans)
        for j, fr in enumerate(spans):
            if not fr:
                continue
            nxt = next((starts[m] for m in range(j + 1, n) if starts[m] is not None), fr[-1] + 3)
            ext = list(range(fr[0], min(t, max(nxt, fr[-1] + 1))))
            lpp = torch.log(cls[fr].mean(0).clamp_min(1e-9)).clamp_min(-10)
            own = CLASSES.index(pure[j])
            out[j, :39] = lpp.numpy()
            out[j, 39:78] = (lpp - lpp[own]).clamp(-15, 15).numpy()
            out[j, 78] = float((lp[fr, ids[j]] - best[fr]).mean())
            out[j, 79] = len(ext) / 10
            out[j, 80] = float(probs[ext, self.blank].mean())
            out[j, 81] = float(pmax[fr].mean())
            out[j, 82] = len(fr)
            out[j, 83] = float(int(lpp.argmax()) == own)
        return out, ok

    # ── scores ────────────────────────────────────────────────────────────
    def run(self, feats: np.ndarray, phones: list[str]) -> dict:
        """Raw model outputs (0–2 scale) for ≤ 50 phones: phone scores, word accuracy per
        phone, and the five utterance scores."""
        n = len(phones)
        x = torch.zeros(1, 50, 84)
        x[0, :n] = (torch.from_numpy(feats) - self.mean) / self.std
        phn = torch.full((1, 50), -1.0)
        phn[0, :n] = torch.tensor([self.phn_index[p.rstrip("012")] for p in phones], dtype=torch.float)
        with torch.inference_mode():
            u1, u2, u3, u4, u5, p, w1, _w2, _w3 = self.model(x, phn)
        return {
            "phone": p[0, :n, 0].tolist(),
            "word": w1[0, :n, 0].tolist(),
            "utt": [float(u[0, 0]) for u in (u1, u2, u3, u4, u5)],
        }

    def score(self, lp: torch.Tensor, words: list[list[str]]) -> dict:
        """Scores for a sentence whose words have these phone lists (an empty list =
        a word with no known phones: left out, `None`). Returns per word
        `{"score", "phones": [{"phone", "score"}]}` or None, plus the utterance scores."""
        flat = [p for w in words for p in w]
        feats, aligned = self.features(lp, flat)
        out_words: list[dict | None] = [None] * len(words)
        acc = tot = weight = 0.0
        if aligned:
            offsets = np.concatenate([[0], np.cumsum([len(w) for w in words])])
            for group in chunks(words):
                ph = [p for i in group for p in words[i]]
                if len(ph) > 50:
                    continue
                f = np.concatenate([feats[offsets[i] : offsets[i + 1]] for i in group])
                res = self.run(f, ph)
                k = 0
                for i in group:
                    m = len(words[i])
                    out_words[i] = {
                        "score": pct(float(np.mean(res["word"][k : k + m]))),
                        "phones": [
                            {"phone": p.rstrip("012"), "score": pct(s)}
                            for p, s in zip(words[i], res["phone"][k : k + m])
                        ],
                    }
                    k += m
                acc += res["utt"][0] * len(ph)
                tot += res["utt"][4] * len(ph)
                weight += len(ph)
        return {
            "words": out_words,
            "accuracy": pct(acc / weight) if weight else None,
            "total": pct(tot / weight) if weight else None,
            "aligned": aligned,
        }
