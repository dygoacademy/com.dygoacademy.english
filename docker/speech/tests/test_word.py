import numpy as np

from app.word import collapse_path, ipa_syllables, syllable_scores, voiced_seconds, word_status


def test_ipa_syllables_split_on_dots_and_stress():
    assert ipa_syllables("/ˈmɪt.ɪ.ɡeɪt/") == ["ˈmɪt", "ɪ", "ɡeɪt"]
    assert ipa_syllables("/ˌbaɪ.oʊ.daɪˈvɜːr.sə.ti/") == ["ˌbaɪ", "oʊ", "daɪ", "ˈvɜːr", "sə", "ti"]
    assert ipa_syllables("/ˈiː.kəʊˌsɪs.təm/, /ˈek.əʊ/") == ["ˈiː", "kəʊ", "ˌsɪs", "təm"]
    assert ipa_syllables("") == [] and ipa_syllables(None) == []


def test_syllable_scores_average_each_run():
    # mitigate: m ɪ t | ɪ | ɡ eɪ t
    assert syllable_scores([90, 92, 91, 48, 80, 90, 94], [3, 1, 3]) == [91, 48, 88]
    assert syllable_scores([70, 70], [2, 0]) == [70, None]


def test_collapse_path_drops_blanks_and_repeats():
    assert collapse_path([0, 5, 5, 0, 5, 7, 7, 0], blank=0) == [5, 5, 7]


def test_voiced_seconds():
    rate = 16000
    quiet = np.full(rate, 0.001, dtype=np.float32)
    voice = np.concatenate([quiet, np.full(rate // 2, 0.2, dtype=np.float32)])
    assert voiced_seconds(quiet, rate) == 0
    assert abs(voiced_seconds(voice, rate) - 0.5) < 0.02


def test_status_ok_other_word_not_heard():
    assert word_status("mitigate", ["Mitigate."], 76, [91, 48, 88], 0.8) == "ok"
    assert word_status("mitigate", ["medicate"], 41, [30, 48, 45], 0.8) == "other_word"
    # Whisper's spelling differs but the sounds are good: still the word.
    assert word_status("mitigate", ["mitigait"], 82, [91, 70, 88], 0.8) == "ok"
    assert word_status("colour", ["color"], 30, [30, 30], 0.8) == "ok"  # UK / US spelling
    assert word_status("mitigate", [], 60, [60, 60, 60], 0.1) == "not_heard"  # too little voice
    assert word_status("mitigate", [], 10, [12, 8, 15], 0.8) == "not_heard"  # noise, no word
    assert word_status("mitigate", ["it", "is"], 30, [30, 30, 30], 0.8) == "ok"  # two words: not "another word"
