from app.matching import (
    WordMatch,
    match_words,
    normalise,
    tokens,
    total_score,
    word_status,
)

SENTENCE = "Planting more trees can help mitigate the effects of climate change."


def heard(text: str) -> list[dict]:
    return [{"word": w, "start": i * 0.3, "end": i * 0.3 + 0.25} for i, w in enumerate(text.split())]


def test_normalise_keeps_letters_and_inner_apostrophes():
    assert normalise("Change.") == "change"
    assert normalise("Don’t") == "don't"
    assert normalise("“effects,”") == "effects"


def test_everything_heard():
    m = match_words(tokens(SENTENCE), heard(SENTENCE))
    assert all(w.found and w.heard is None for w in m)
    assert m[0].start == 0.0


def test_left_out_word_is_not_found():
    m = match_words(tokens(SENTENCE), heard("Planting more trees can help mitigate effects of climate change."))
    assert [w.found for w in m].count(False) == 1
    assert not m[6].found and m[6].heard is None  # "the"


def test_other_word_heard():
    m = match_words(tokens(SENTENCE), heard("Planting more trees can help migrate the effects of climate change."))
    assert m[5].heard == "migrate" and not m[5].found


def test_status_rules():
    found = WordMatch(None, True)
    gone = WordMatch(None, False)
    other = WordMatch("migrate", False)
    assert word_status(95, found) == ("ok", None)
    assert word_status(20, gone) == ("missing", None)
    assert word_status(55, gone) == ("unclear", None)
    assert word_status(90, other) == ("unclear", "migrate")
    assert word_status(30, found) == ("unclear", None)
    assert word_status(70, gone) == ("ok", None)  # Whisper missed it, the sounds are there


def test_total_counts_missing_as_zero():
    assert total_score([100, 80, 30], ["ok", "ok", "missing"]) == 60
    assert total_score([], []) == 0
