import json
import os

import numpy as np
import torch

from app.gopt_model import GOPT
from app.gopt_scorer import CLASSES, DATA, SCALE, pct
from app.matching import (
    GOPT_HEARD_TRUST_SCORE,
    GOPT_MISSING_SCORE,
    GOPT_UNCLEAR_SCORE,
    WordMatch,
    word_status,
)


def test_pct_scales_and_clamps():
    assert SCALE == 50
    assert [pct(0), pct(1), pct(2), pct(2.4), pct(-0.3)] == [0, 50, 100, 100, 0]


def test_phone_index_covers_the_39_classes():
    idx = json.load(open(os.path.join(DATA, "phone_index.json")))
    assert set(idx) == set(CLASSES)
    assert sorted(idx.values()) == list(range(39))


def test_trained_weights_load_and_run():
    model = GOPT(24, 1, 3, 84)
    sd = torch.load(os.path.join(DATA, "gopt_wav2vec2.pth"), map_location="cpu", weights_only=True)
    model.load_state_dict({k.removeprefix("module."): v for k, v in sd.items()})
    model.eval()
    x = torch.zeros(1, 50, 84)
    x[0, :3] = torch.randn(3, 84)
    phn = torch.full((1, 50), -1.0)
    phn[0, :3] = torch.tensor([1.0, 2.0, 3.0])
    with torch.inference_mode():
        out = model(x, phn)
    assert len(out) == 9 and out[5].shape == (1, 50, 1) and out[0].shape == (1, 1)
    assert all(torch.isfinite(o).all() for o in out)


def test_gopt_word_status_thresholds():
    kw = dict(unclear=GOPT_UNCLEAR_SCORE, missing=GOPT_MISSING_SCORE, trust=GOPT_HEARD_TRUST_SCORE)
    found = WordMatch(None, True)
    gone = WordMatch(None, False)
    other = WordMatch("migrate", False)
    assert word_status(95, found, "mitigate", **kw) == ("ok", None)
    assert word_status(70, found, "mitigate", **kw) == ("ok", None)  # heard, mid score: Whisper heard it right
    assert word_status(30, found, "mitigate", **kw) == ("unclear", None)
    assert word_status(70, gone, "mitigate", **kw) == ("unclear", None)
    assert word_status(30, gone, "mitigate", **kw) == ("missing", None)
    assert word_status(75, other, "mitigate", **kw) == ("unclear", "migrate")
    assert word_status(92, other, "mitigate", **kw) == ("ok", None)


def test_default_word_status_is_unchanged():
    assert word_status(50, WordMatch(None, False), "mitigate") == ("unclear", None)
    assert word_status(30, WordMatch(None, False), "mitigate") == ("missing", None)
