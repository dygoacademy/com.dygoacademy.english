"""Builds the M4 calibration set with macOS voices (`say`) as AAC .m4a,
like an iPhone recording. Run on the Mac: python3 make_set.py <out-dir>.

For each sentence in sentences.json: good speech in five voices (US, UK,
AU, a Vietnamese and a Chinese voice), fast and slow (US), a skipped word
(not the target) and a wrong target word (a near miss, e.g. "migrate").
Writes <out-dir>/manifest.json with what each clip should get.
"""
import json, os, subprocess, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
SENTENCES = json.load(open(os.path.join(HERE, "sentences.json")))


def say(voice, text, path, rate=None):
    aiff = path + ".aiff"
    cmd = ["say", "-v", voice, "-o", aiff] + (["-r", str(rate)] if rate else []) + [text]
    subprocess.run(cmd, check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", aiff, "-ac", "1", "-ar", "48000",
                    "-c:a", "aac", "-b:a", "64k", path], check=True)
    os.remove(aiff)


manifest = []
for n, s in enumerate(SENTENCES):
    words = s["sentence"].split()
    t = s["target_index"]
    skip = 1 if t != 1 else 3
    cases = [
        ("good_us", "Samantha", s["sentence"], None, "good", None),
        ("good_uk", "Daniel", s["sentence"], None, "good", None),
        ("good_au", "Karen", s["sentence"], None, "good", None),
        ("accent_vi", "Linh", s["sentence"], None, "accent", None),
        ("accent_zh", "Tingting", s["sentence"], None, "accent", None),
        ("fast_us", "Samantha", s["sentence"], 250, "good", None),
        ("slow_us", "Samantha", s["sentence"], 120, "good", None),
        ("missing_us", "Samantha", " ".join(w for i, w in enumerate(words) if i != skip), None, "missing", skip),
        ("wrong_target_us", "Samantha",
         " ".join(s["wrong"] if i == t else w for i, w in enumerate(words)), None, "wrong_target", t),
    ]
    for name, voice, text, rate, kind, index in cases:
        path = os.path.join(OUT, f"s{n}_{name}.m4a")
        say(voice, text, path, rate)
        manifest.append({"file": os.path.basename(path), "sentence": s["sentence"], "target_index": t,
                         "kind": kind, "word_index": index, "voice": voice})
json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w"), indent=1)
print(f"{len(manifest)} clips in {OUT}")
