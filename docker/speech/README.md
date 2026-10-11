# Speech scorer (`dygo_speech`)

Checks a learner's recording against the sentence, on this Mac, for free (Phase 13 G6, `phase/phase 13/PHASE-13-RECORD.md` §20). Only the backend calls it.

- **Words**: faster-whisper `base.en` (int8, beam 1) → a left-out word, or another word heard ("migrate" for "mitigate").
- **Sounds**: `facebook/wav2vec2-lv-60-espeak-cv-ft` + espeak (en-us) + forced alignment → a 0–100 score per word (Goodness of Pronunciation). Short words accept their common variants (`VARIANTS` in `app/matching.py`, e.g. "the" as /ði/ before a vowel).
- Both run at the same time; one check at a time. Audio stays in memory; the log has timings and the score only.

## Run

```bash
docker compose up -d speech          # first start downloads ~1.4 GB of models into `speech_models` (~90 s)
curl -fsS http://127.0.0.1:8100/health
curl -s -F audio=@clip.m4a -F "sentence=Planting more trees can help mitigate the effects of climate change." http://127.0.0.1:8100/check
docker run --rm --entrypoint python comdygoacademyenglish-speech -m pytest -q tests   # rules, no models
```

## Try it in Postman

Import `docker/speech/dygo-speech.postman_collection.json` (Postman desktop app on this Mac: the API is on 127.0.0.1 only, so the web app and other devices can't reach it). It has *Health* and four *Check* requests using the clips in `samples/` (macOS voices, AAC `.m4a`): good speech, "the" left out, "migrate" for "mitigate", a Vietnamese voice. If your copy of the repo is somewhere else, change the collection variable `samplesDir`. To try your own voice, record the sentence in Voice Memos, AirDrop the `.m4a` to the Mac and pick it as `audio`.

## `POST /check`

Multipart: `audio` (m4a / webm / wav, ≤ 1 MB, 0.3–30 s), `sentence`. Errors: 413 over 1 MB, 422 not audio / too short / too long, 503 while models load.

```json
{
  "total": 89,
  "heard_text": "Planting more trees can help mitigate effects of climate change.",
  "duration_ms": 3500,
  "latency_ms": 1650,
  "words": [
    { "index": 6, "text": "the", "score": 37, "status": "missing", "heard": null, "start": null, "end": null }
  ]
}
```

`status`: `ok`, `unclear` (low sound score, or `heard` = the word Whisper heard instead) or `missing`. Thresholds (`UNCLEAR_SCORE` 60, `MISSING_SCORE` 40) are first guesses, tuned in M4 with real recordings.

## `POST /check-word`

Pronunciation "Stepping stones" (2026-10-11): one word, a score per syllable. Multipart `audio`, `word`, `ipa` (the word's IPA for the accent, e.g. `/ˈmɪt.ɪ.ɡeɪt/`; empty = espeak's spelling of the word, one syllable). Same limits, lock and logging as `/check`.

```json
{
  "status": "ok",
  "total": 76,
  "heard_text": "mitigate",
  "duration_ms": 900,
  "latency_ms": 700,
  "syllables": [
    { "ipa": "ˈmɪt", "score": 91, "wobbly": false, "heard_ipa": null },
    { "ipa": "ɪ", "score": 48, "wobbly": true, "heard_ipa": "aɪ" },
    { "ipa": "ɡeɪt", "score": 88, "wobbly": false, "heard_ipa": null }
  ]
}
```

Rules (`app/word.py`): syllables split on `.` and before `ˈ` / `ˌ` (as the backend's `ipaSyllables`); a syllable's score is the mean of its phonemes' GOP; under 60 = `wobbly`; `heard_ipa` is the phoneme model's own best path over a wobbly syllable's frames when it differs, else null. `status`: `not_heard` (under 0.3 s of voice, or no word heard and every syllable under 20), `other_word` (Whisper heard one other word, UK / US spellings aside, and the total is under 50), else `ok`. `total` = mean of the phoneme scores. The backend calls it pollinated at `ok` and 80+.

```bash
curl -s -F audio=@samples/migrate.m4a -F word=mitigate -F "ipa=/ˈmɪt.ɪ.ɡeɪt/" http://127.0.0.1:8100/check-word
```

## Limits

CPU only (Docker on macOS can't use the GPU). A 4–6 s sentence takes ~1.7–3.3 s, up to ~5 s when the Mac is busy; one check at a time. `mem_limit` 4 GB, ~0.8–1.5 GB used.

## Scoring rules and calibration (M4, 2026-10-05)

Per word (`word_status` in `app/matching.py`):
- **Function words** (a, the, to, for… `FUNCTION_WORDS`) are too short for the sound model: Whisper decides. Heard → ok, not heard → missing.
- **Whisper heard another word**: `unclear` with `heard`, unless the sounds score ≥ `HEARD_TRUST_SCORE` (85): then Whisper misheard and the word is ok ("months" → "onts" scored 100; real wrong words scored 21–62).
- **UK / US spellings** count as the same word (`canon`: -ise/-ize, -our/-or, -re/-er).
- Otherwise: not heard and sound < 40 → missing; < 60 → unclear.

Total (`total_score`): weighted mean of the word scores, the **target word 3×** (`target_index` form field; the backend sends it), missing = 0, unclear ≤ 50, ok function words = 100; then **any mistake → at most 89** (no fruit) and **target word missing / unclear → at most 69** (sprout at best).

Calibrate after changing a rule or a model:

```bash
cd docker/speech/calibration
python3 make_set.py /tmp/calib            # 63 clips: 7 real sentences × good (US/UK/AU), fast, slow, Vietnamese and Chinese voices, a skipped word, a wrong target word
python3 calibrate.py run /tmp/calib       # through the running scorer, saves raw.json
python3 calibrate.py report /tmp/calib    # per kind: totals, stages, false flags / mistakes caught (re-run report alone after a rule change)
```

Results on 2026-10-05 (macOS voices): good speech 33/35 fruit (min 89), 2/35 with a word wrongly flagged; skipped word caught 6/7 (all bloom); wrong target word caught 7/7 (all 69, sprout); check 1.2 s median. Before M4: good 19/35 fruit with 15/35 false flags, wrong target 4/7 fruit. Real recordings (`manifest.json` written by hand, same fields) are the next check.
