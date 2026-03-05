"""
Feelio ML API
─────────────
Unified FastAPI service that exposes:

  POST /api/emotion/analyze-frame   – emotion from a single image (selfie / frame)
  POST /api/emotion/analyze-video   – emotion from an uploaded video
  POST /api/emission/predict        – carbon-emission from an uploaded image
  POST /api/emission/predict-url    – carbon-emission from an image URL
  GET  /health                      – liveness probe

Run from this directory:
  uvicorn main:app --host 0.0.0.0 --port 8003 --reload
"""

import os
import sys
import tempfile
import traceback
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import (
    EMOTION_MODEL_PATH,
    EMISSION_CHECKPOINT_PATH,
    EMISSION_INTEL_CHECKPOINT_PATH,
    PLACES365_CATEGORIES_PATH,
    ML_API_PORT,
    ML_API_HOST,
)
from emotion_service import get_emotion_service
from emission_service import get_emission_service

# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Feelio ML API",
    description="Emotion detection + carbon-emission estimation pipeline",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    tb = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    print(tb, file=sys.stderr, flush=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "emotion_model_path": EMOTION_MODEL_PATH,
        "emission_checkpoint": EMISSION_CHECKPOINT_PATH,
    }


@app.get("/")
def root():
    return {"message": "Feelio ML API", "docs": "/docs"}


# ── Emotion endpoints ──────────────────────────────────────────────────────────

@app.post("/api/emotion/analyze-frame")
async def analyze_frame(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
    full: bool = Query(False, description="Return full emotion breakdown if true"),
):
    """
    Upload a single selfie / image frame.
    Returns dominant emotion (and optionally all scores).
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Expected an image file (JPEG / PNG)")

    data = await file.read()
    try:
        svc = get_emotion_service(EMOTION_MODEL_PATH)
        scores = svc.process_frame(data)
    except Exception as e:
        raise HTTPException(500, f"Emotion analysis failed: {e}")

    dominant_name, dominant_pct = max(scores.items(), key=lambda x: x[1])
    dominant_pct = round(dominant_pct, 2)

    if not full:
        return {"emotion": dominant_name, "percent": dominant_pct}

    return {
        "emotion": dominant_name,
        "percent": dominant_pct,
        "emotions": scores,
    }


@app.post("/api/emotion/analyze-video")
async def analyze_video(
    file: UploadFile = File(...),
    full: bool = Query(False),
):
    """
    Upload a short selfie video (mp4 / mov / webm).

    Processes EVERY frame with a 5-frame sliding-window smoother — the same
    algorithm used in EmotionDetectorCPU.process_video_with_display() from
    the training notebook.  Returns dominant emotion + optional full breakdown.
    """
    ct = (file.content_type or "").lower()
    if "video" not in ct:
        raise HTTPException(400, "Expected a video file (mp4 / mov / webm)")

    data = await file.read()

    suffix = ".mp4"
    if "webm" in ct:
        suffix = ".webm"
    elif "quicktime" in ct or "mov" in ct:
        suffix = ".mov"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        svc = get_emotion_service(EMOTION_MODEL_PATH)
        result = svc.process_video(tmp_path)   # uses sliding-window, ALL frames
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Video analysis failed: {e}")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    if not full:
        return {"emotion": result["emotion"], "percent": result["percent"]}

    return result   # includes average_emotions, frames_analyzed, total_frames


# ── Emission endpoints ─────────────────────────────────────────────────────────

@app.post("/api/emission/predict")
async def predict_emission(
    image: UploadFile = File(...),
    model: str = Form("base"),
):
    """
    Upload a place image (JPEG / PNG).
    Returns scene classification, attributes and carbon-emission level.
    """
    if model not in ("base", "intel"):
        raise HTTPException(400, "model must be 'base' or 'intel'")

    contents = await image.read()
    if not contents:
        raise HTTPException(400, "Empty image")

    use_intel = model == "intel"
    ckpt = EMISSION_INTEL_CHECKPOINT_PATH if use_intel else EMISSION_CHECKPOINT_PATH

    try:
        svc = get_emission_service(ckpt, PLACES365_CATEGORIES_PATH, use_intel=use_intel)
        return svc.predict_bytes(contents)
    except FileNotFoundError as e:
        raise HTTPException(503, f"Model checkpoint not found: {e}")
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/emission/predict-url")
async def predict_emission_url(
    url: str = Form(...),
    model: str = Form("base"),
):
    """
    Pass an image URL (e.g. Google Places photo URL).
    The service fetches the image and runs emission inference.
    """
    if model not in ("base", "intel"):
        raise HTTPException(400, "model must be 'base' or 'intel'")

    use_intel = model == "intel"
    ckpt = EMISSION_INTEL_CHECKPOINT_PATH if use_intel else EMISSION_CHECKPOINT_PATH

    try:
        svc = get_emission_service(ckpt, PLACES365_CATEGORIES_PATH, use_intel=use_intel)
        return await svc.predict_url(url)
    except FileNotFoundError as e:
        raise HTTPException(503, f"Model checkpoint not found: {e}")
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=ML_API_HOST, port=ML_API_PORT, reload=True)
