# Speech scorer (`dygo_speech`)

Checks a learner's recording against the sentence, on this Mac, for free (Phase 13 G6, `docs/phase13-notes.md` §20). Only the backend calls it.

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

## Limits

CPU only (Docker on macOS can't use the GPU). A 4–6 s sentence takes ~1.7–3.3 s, up to ~5 s when the Mac is busy; one check at a time. `mem_limit` 4 GB, ~0.8–1.5 GB used.
