"""M4 calibration: runs a labelled set through the speech scorer and reports
how well the marks and the total separate good speech from mistakes.

  python3 calibrate.py run <set-dir> [scorer-url]   # POST every clip, save raw.json
  python3 calibrate.py report <set-dir>             # metrics from raw.json (no audio)

<set-dir>/manifest.json lists the clips (make_set.py, or hand-written for
real recordings): file, sentence, target_index, kind = good | accent |
missing | wrong_target, word_index (the skipped / wrong word).
`report` scores with the rules in ../app/matching.py, so a rule change can
be compared without re-running the audio.
"""
import json, os, statistics, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
from app.matching import total_score  # noqa: E402

STAGES = [(90, "fruit"), (70, "bloom"), (40, "sprout"), (0, "seed")]


def stage(score):
    return next(name for floor, name in STAGES if score >= floor)


def run(set_dir, url):
    manifest = json.load(open(os.path.join(set_dir, "manifest.json")))
    raw = []
    for m in manifest:
        t = time.time()
        out = subprocess.run(
            ["curl", "-s", "-F", f"audio=@{os.path.join(set_dir, m['file'])}", "-F", f"sentence={m['sentence']}",
             "-F", f"target_index={m['target_index']}", f"{url}/check"],
            capture_output=True, text=True, check=True).stdout
        r = json.loads(out)
        raw.append({**m, "result": r, "seconds": round(time.time() - t, 2)})
        print(f"{m['file']:28} {r['total']:3d} {round(time.time() - t, 1)}s", flush=True)
    json.dump(raw, open(os.path.join(set_dir, "raw.json"), "w"), indent=1)


def report(set_dir):
    raw = json.load(open(os.path.join(set_dir, "raw.json")))
    rows = {}
    for r in raw:
        words = r["result"]["words"]
        scores = [w["score"] for w in words]
        statuses = [w["status"] for w in words]
        indexes = [w["index"] for w in words]
        texts = [w["text"] for w in words]
        total = total_score(scores, statuses, indexes, r["target_index"], texts)
        by_index = {w["index"]: w for w in words}
        flagged = [w["index"] for w in words if w["status"] != "ok"]
        target_ok = by_index.get(r["target_index"], {}).get("status") == "ok"
        hit = None
        if r["kind"] == "missing":
            hit = by_index.get(r["word_index"], {}).get("status") == "missing"
        elif r["kind"] == "wrong_target":
            hit = not target_ok
        rows.setdefault(r["kind"], []).append(
            {"file": r["file"], "total": total, "stage": stage(total), "flagged": flagged, "hit": hit,
             "target_ok": target_ok, "seconds": r["seconds"]})
    print(f"{'kind':14} {'n':>3} {'min':>4} {'mean':>5} {'max':>4}  stages                      marks")
    for kind in ["good", "accent", "missing", "wrong_target"]:
        rs = rows.get(kind, [])
        if not rs:
            continue
        totals = [r["total"] for r in rs]
        stages = {s: sum(r["stage"] == s for r in rs) for _, s in STAGES}
        if kind in ("good",):
            marks = f"false flags in {sum(bool(r['flagged']) for r in rs)}/{len(rs)}"
        elif kind == "accent":
            marks = f"flagged words / clip {statistics.mean(len(r['flagged']) for r in rs):.1f}"
        else:
            marks = f"caught {sum(r['hit'] for r in rs)}/{len(rs)}"
        print(f"{kind:14} {len(rs):3d} {min(totals):4d} {statistics.mean(totals):5.1f} {max(totals):4d}  "
              f"{' '.join(f'{k}:{v}' for k, v in stages.items() if v):27} {marks}")
    seconds = [r["seconds"] for rs in rows.values() for r in rs]
    print(f"check time: median {statistics.median(seconds):.1f}s, max {max(seconds):.1f}s")
    for kind in ["good", "missing", "wrong_target"]:
        for r in rows.get(kind, []):
            if (kind == "good" and (r["flagged"] or r["total"] < 90)) or r["hit"] is False:
                print(f"  ! {kind:12} {r['file']:28} total {r['total']:3d} flagged {r['flagged']}")


if __name__ == "__main__":
    cmd, set_dir = sys.argv[1], sys.argv[2]
    if cmd == "run":
        run(set_dir, sys.argv[3] if len(sys.argv) > 3 else "http://127.0.0.1:8100")
    else:
        report(set_dir)
