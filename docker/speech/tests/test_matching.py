from app.matching import (
    canon,
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
    assert word_status(95, found, "mitigate") == ("ok", None)
    assert word_status(20, gone, "mitigate") == ("missing", None)
    assert word_status(55, gone, "mitigate") == ("unclear", None)
    assert word_status(43, other, "mitigate") == ("unclear", "migrate")
    assert word_status(30, found, "mitigate") == ("unclear", None)
    assert word_status(70, gone, "mitigate") == ("ok", None)  # Whisper missed it, the sounds are there


def test_m4b_whisper_mishears_but_sounds_are_right():
    assert word_status(99, WordMatch("onts", False), "months,") == ("ok", None)
    assert word_status(62, WordMatch("imitative", False), "innovative") == ("unclear", "imitative")


def test_m4b_function_words_are_judged_by_whisper():
    assert word_status(9, WordMatch(None, True), "a") == ("ok", None)
    assert word_status(56, WordMatch(None, False), "to") == ("missing", None)
    assert word_status(99, WordMatch("from", False), "for") == ("ok", None)
    assert word_status(20, WordMatch("from", False), "for") == ("unclear", "from")


def test_m4b_uk_and_us_spellings_match():
    m = match_words(tokens("The judge criticized the fines."), heard("The judge criticised the fines."))
    assert all(w.found for w in m)
    assert canon("colour") == canon("color") and canon("centre") == canon("center")
    assert canon("four") != canon("for")


def test_total_without_target_is_a_plain_mean_capped_by_mistakes():
    assert total_score([100, 100, 100], ["ok", "ok", "ok"]) == 100
    assert total_score([100, 80, 30], ["ok", "ok", "missing"]) == 60
    assert total_score([100] * 9 + [95], ["ok"] * 9 + ["missing"]) == 89  # any mistake: no fruit
    assert total_score([], []) == 0


def test_m4a_target_word_weighs_more_and_caps_the_stage():
    scores, idx = [100] * 10, list(range(10))
    ok = ["ok"] * 10
    assert total_score(scores, ok, idx, 5) == 100
    wrong_target = ok[:5] + ["unclear"] + ok[6:]
    assert total_score([100] * 5 + [43] + [100] * 4, wrong_target, idx, 5) == 69  # sprout at best
    other_unclear = ["unclear"] + ok[1:]
    assert total_score([80] + [100] * 9, other_unclear, idx, 5) <= 89
    # The target counts 3×: a weak target pulls the mean down more than another word.
    weak_target = total_score([100] * 5 + [70] + [100] * 4, ok, idx, 5)
    weak_other = total_score([70] + [100] * 9, ok, idx, 5)
    assert weak_target < weak_other


def test_ok_function_words_count_full_marks():
    words = ["We", "carved", "a", "face."]
    assert total_score([100, 100, 9, 100], ["ok"] * 4, [0, 1, 2, 3], 1, words) == 100
    assert total_score([100, 100, 9, 100], ["ok"] * 4, [0, 1, 2, 3], 1) < 100  # without words: as scored
