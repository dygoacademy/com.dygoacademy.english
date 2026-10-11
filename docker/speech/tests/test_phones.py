from app.phones import chunks, cmudict, sentence_phones, tokens_to_phones, word_phones


def test_cmudict_known_words():
    assert word_phones("mitigate") == ["M", "IH1", "T", "AH0", "G", "EY2", "T"]
    assert word_phones("The") == ["DH", "AH0"]  # first pronunciation, case-insensitive
    assert word_phones("change.") == ["CH", "EY1", "N", "JH"]  # punctuation ignored


def test_possessive_falls_back_to_the_base_word():
    assert word_phones("Dylan's")[-1] == "Z"  # either in the dictionary or base + Z


def test_unknown_word_uses_the_fallback_or_gives_nothing():
    assert word_phones("zzqxv") == []
    assert word_phones("zzqxv", lambda w: ["k", "æ", "t"]) == ["K", "AE1", "T"]
    assert word_phones("", lambda w: ["k"]) == []


def test_tokens_to_phones_converts_and_drops():
    assert tokens_to_phones(["h", "ə", "l", "oʊ"]) == ["HH", "AH0", "L", "OW1"]
    assert tokens_to_phones(["b", "ɛɹ"]) == ["B", "EH1", "R"]  # r-coloured vowel is two phones
    assert tokens_to_phones(["ʁ", "x"]) == []  # no English equivalent


def test_sentence_phones_keeps_word_order():
    got = sentence_phones("Trees help — a lot.")
    assert [w for w, _ in got] == ["Trees", "help", "a", "lot."]
    assert got[1][1] == ["HH", "EH1", "L", "P"]


def test_chunks_group_whole_words_up_to_the_limit():
    words = [["A"] * 20, ["B"] * 20, ["C"] * 20, [], ["D"] * 5]
    assert chunks(words, 50) == [[0, 1], [2, 4]]  # the empty word is left out
    assert chunks([], 50) == []


def test_every_dictionary_phone_is_one_of_the_39_classes():
    from app.gopt_scorer import CLASSES

    seen = {p.rstrip("012") for ph in list(cmudict().values())[:20000] for p in ph}
    assert seen <= set(CLASSES)
