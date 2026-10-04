# Dygo speech scorer (Phase 13 G6, docs/phase13-notes.md §20).
# CPU only: Docker on macOS can't use the M2 GPU. Models download into the
# /models volume on first start (≈ 1.4 GB), not into the image.
FROM python:3.11-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends espeak-ng ffmpeg curl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir torch==2.5.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY tests ./tests
ENV MODELS_DIR=/models HF_HOME=/models/hf PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
