"""M1 spike: per-sound pronunciation scores (Goodness of Pronunciation).

For each clip: decode to 16 kHz, run the wav2vec2 espeak phoneme model,
force-align the sentence's expected phonemes (espeak, en-us) to the
frames, and score each phoneme by how sure the model is that the expected
sound was said, compared with its best guess for those frames.
Word score = mean of its phoneme scores, 0..100.
"""
import subprocess, sys, time

import numpy as np
import torch
import torchaudio.functional as AF
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

MODEL = "facebook/wav2vec2-lv-60-espeak-cv-ft"
SENTENCE = "Planting more trees can help mitigate the effects of climate change."

t0 = time.time()
proc = Wav2Vec2Processor.from_pretrained(MODEL)
model = Wav2Vec2ForCTC.from_pretrained(MODEL).eval()
torch.set_num_threads(6)
print(f"model load {time.time() - t0:.1f}s", flush=True)

tok = proc.tokenizer
blank = tok.pad_token_id
words = [w.strip(".,").lower() for w in SENTENCE.split()]
word_ids = []
for w in words:
    ids = tok(w).input_ids  # the tokenizer phonemizes with espeak (en-us)
    word_ids.append([i for i in ids if i not in (blank, tok.unk_token_id)])
targets = [i for ids in word_ids for i in ids]


def load(path):
    raw = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def score(path):
    t = time.time()
    audio = load(path)
    inputs = proc(audio, sampling_rate=16000, return_tensors="pt")
    with torch.inference_mode():
        logp = model(inputs.input_values).logits.log_softmax(-1)[0]
    t_model = time.time() - t
    ali, _ = AF.forced_align(logp.unsqueeze(0), torch.tensor([targets]), blank=blank)
    ali = ali[0].tolist()
    # frames per target token: walk the CTC path, a new token starts when the label changes
    spans, k, prev = [[] for _ in targets], -1, blank
    for f, lab in enumerate(ali):
        if lab != blank and (lab != prev):
            k += 1
        if lab != blank and k < len(targets):
            spans[k].append(f)
        prev = lab
    best = logp.clone()
    best[:, blank] = -1e9
    best = best.max(-1).values
    ph_scores = []
    for (tid, fr) in zip(targets, spans):
        if not fr:
            ph_scores.append(0.0)
            continue
        gop = float((logp[fr, tid] - best[fr]).mean())  # <= 0; 0 = expected sound is the top guess
        ph_scores.append(100 * float(np.exp(gop)))
    out, i = [], 0
    for w, ids in zip(words, word_ids):
        s = ph_scores[i:i + len(ids)]
        i += len(ids)
        out.append((w, round(sum(s) / len(s)) if s else 0))
    total = round(sum(v for _, v in out) / len(out))
    return total, out, t_model, time.time() - t


for path in sys.argv[1:]:
    total, out, tm, tt = score(path)
    low = [f"{w}:{v}" for w, v in out if v < 60]
    print(f"{path:20} total={total:3d}  model {tm:.2f}s all {tt:.2f}s  low<60: {' '.join(low) or '-'}", flush=True)
    print("   ", " ".join(f"{w}:{v}" for w, v in out), flush=True)
