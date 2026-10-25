import torch

from app.gopt_scorer import HEARD_MIN_PROB, Gopt


def bare(blank: int = 0) -> Gopt:
    """A Gopt with only what `heard` and `timing` use (no model files)."""
    g = Gopt.__new__(Gopt)
    g.blank = blank
    g.token = {1: "t", 2: "aɪ", 3: "ɪ"}
    return g


def frames(*rows: list[float]) -> torch.Tensor:
    """Log-probabilities from per-frame probabilities over [blank, t, aɪ, ɪ]."""
    return torch.tensor(rows).clamp_min(1e-6).log()


def test_heard_greedy_decodes_and_drops_repeats_and_blanks():
    lp = frames(
        [0.05, 0.9, 0.03, 0.02],
        [0.05, 0.9, 0.03, 0.02],
        [0.9, 0.05, 0.03, 0.02],
        [0.05, 0.02, 0.9, 0.03],
    )
    assert bare().heard(lp, [0, 1, 2, 3]) == "taɪ"


def test_heard_is_none_when_unsure_or_silent():
    unsure = frames([0.1, 0.3, 0.3, 0.3], [0.1, 0.3, 0.3, 0.3])
    assert 0.3 < HEARD_MIN_PROB
    assert bare().heard(unsure, [0, 1]) is None
    silent = frames([0.97, 0.01, 0.01, 0.01])
    assert bare().heard(silent, [0]) is None
    assert bare().heard(silent, []) is None


def test_timing_gives_ms_from_frames():
    lp = frames(*[[0.05, 0.02, 0.03, 0.9]] * 10)
    t = bare().timing(lp, [3, 4, 5], 20.0)
    assert t == {"start_ms": 60, "end_ms": 120, "heard": "ɪ"}
    assert bare().timing(lp, [], 20.0) == {"start_ms": None, "end_ms": None, "heard": None}
