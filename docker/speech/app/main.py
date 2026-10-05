"""Dygo speech scorer API (Phase 13 G6): POST /check, GET /health.

Only the backend calls this (the port is bound to 127.0.0.1). The upload is
read into memory, scored and dropped; the log line has timings and the
score only, never the audio, the sentence or what was heard.
"""

from __future__ import annotations

import logging
import threading
import time

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from .scorer import AudioError, Scorer, decode

MAX_UPLOAD_BYTES = 1_000_000

log = logging.getLogger("speech")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(title="Dygo speech scorer")
state: dict = {"scorer": None, "error": None}
lock = threading.Lock()  # one check at a time: both models already use the CPUs


@app.on_event("startup")
def load_models() -> None:
    def _load() -> None:
        t = time.time()
        try:
            state["scorer"] = Scorer()
            log.info("models ready in %.1fs", time.time() - t)
        except Exception as err:  # noqa: BLE001 - reported on /health
            state["error"] = str(err)
            log.exception("model load failed")

    threading.Thread(target=_load, daemon=True).start()


@app.get("/health")
def health() -> dict:
    if state["scorer"] is None:
        raise HTTPException(503, detail=state["error"] or "loading models")
    return {"ok": True}


@app.post("/check")
def check(
    audio: UploadFile = File(...),
    sentence: str = Form(...),
    # The practised word's position in sentence.split(): weighs more (M4-a).
    target_index: int | None = Form(None),
) -> dict:
    scorer: Scorer | None = state["scorer"]
    if scorer is None:
        raise HTTPException(503, detail="loading models")
    data = audio.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, detail="audio over 1 MB")
    if not sentence.strip() or len(sentence) > 500:
        raise HTTPException(422, detail="sentence missing or too long")
    t = time.time()
    try:
        pcm = decode(data)
    except AudioError as err:
        raise HTTPException(422, detail=str(err)) from None
    del data
    with lock:
        result = scorer.check(pcm, sentence, target_index)
    result["latency_ms"] = round((time.time() - t) * 1000)
    log.info("check duration_ms=%s latency_ms=%s total=%s", result["duration_ms"], result["latency_ms"], result["total"])
    return result
