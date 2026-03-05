"""
FastAPI backend for emotion detection from videos/frames.
Mobile app (React Native) sends frames or video; backend runs the model and stores results in MongoDB.
"""
import os
import sys
import tempfile
import traceback
from typing import Optional

import cv2
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import get_analysis, save_analysis
from app.emotion_service import get_emotion_service

#creates your backend application
app = FastAPI(
    title="Emotion Detection API",
    description="Analyze video frames for emotions. Used by the React Native mobile app.",
    version="1.0.0",
)

# Allow React Native app (and browser) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#It prints full error message when an error occurs
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Log full traceback and return a clear 500 so we can see the real error."""
    tb = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    print(tb, file=sys.stderr, flush=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
        },
    )

#This is the root endpoint. It returns a message and the documentation and health check endpoints.
@app.get("/")
def root():
    return {
        "message": "Emotion Detection API",
        "docs": "/docs",
        "health": "/health",
    }

#This checks:Is backend running?Is MongoDB connected?It pings the database.

@app.get("/health")
def health():
    """Check if the server and MongoDB are reachable."""
    from app.database import get_db
    try:
        get_db().command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok", "mongodb": "ok" if db_ok else "unavailable"}

#This endpoint analyzes a single image frame and returns the emotion score.
@app.post("/analyze-frame")
async def analyze_frame(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
    full: bool = Query(False, description="If true, return full emotion breakdown; else single emotion for mobile"),
):
    """
    Upload a single image (one frame). Returns a single emotion for mobile by default.
    Use ?full=true for full emotion scores.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Expected an image file (e.g. JPEG, PNG)")
    data = await file.read()
    try:
        service = get_emotion_service(settings.emotion_model_path)
        scores = service.process_frame(data)
    except Exception as e:
        raise HTTPException(500, f"Emotion analysis failed: {str(e)}")
    emotion = max(scores.items(), key=lambda x: x[1])
    emotion_name, percent = emotion[0], round(emotion[1], 2)
    if not full:
        return {"emotion": emotion_name, "percent": percent}
    result = {"emotions": scores, "dominant_emotion": emotion_name, "dominant_percent": percent}
    analysis_id = save_analysis(user_id, "frame", result)
    out = {"emotion": emotion_name, "percent": percent, "emotions": scores}
    if analysis_id is not None:
        out["analysis_id"] = analysis_id
    else:
        out["saved"] = False
    return out

#This endpoint analyzes a video file and returns the emotion score.
#It takes a video file, user_id, sample_every_n_frames, and full.

@app.post("/analyze-video")
async def analyze_video(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
    sample_every_n_frames: int = Form(10),
    full: bool = Query(False, description="If true, return full summary and per-frame data; else single emotion for mobile"),
):
    """
    Upload a video file. Returns a single emotion for mobile by default (average across sampled frames).
    Use ?full=true for full summary and per-frame results.
    """
    if not file.content_type or "video" not in file.content_type:
        raise HTTPException(400, "Expected a video file")
    data = await file.read()
    ct = (file.content_type or "").lower()
    if "mp4" in ct:
        suffix = ".mp4"
    elif "webm" in ct:
        suffix = ".webm"
    elif "quicktime" in ct or "mov" in ct:
        suffix = ".mov"
    else:
        suffix = ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
    try:
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise HTTPException(400, "Could not open video file")
        service = get_emotion_service(settings.emotion_model_path)
        frame_results = []
        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % sample_every_n_frames == 0:
                try:
                    scores = service.process_frame_from_array(frame)
                    dominant = max(scores.items(), key=lambda x: x[1])
                    frame_results.append(
                        {
                            "frame": frame_idx,
                            "emotions": scores,
                            "dominant_emotion": dominant[0],
                            "dominant_percent": round(dominant[1], 2),
                        }
                    )
                except Exception:
                    pass
            frame_idx += 1
        cap.release()
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
    if not frame_results:
        raise HTTPException(400, "No frames could be analyzed")
    all_emotions = list(frame_results[0]["emotions"].keys())
    avg_emotions = {
        e: round(
            sum(r["emotions"].get(e, 0) for r in frame_results) / len(frame_results), 2
        )
        for e in all_emotions
    }
    emotion_name, percent = max(avg_emotions.items(), key=lambda x: x[1])
    emotion_name, percent = emotion_name, round(percent, 2)
    if not full:
        return {"emotion": emotion_name, "percent": percent}
    result = {
        "summary": {
            "average_emotions": avg_emotions,
            "dominant_emotion": emotion_name,
            "dominant_percent": percent,
            "frames_analyzed": len(frame_results),
            "total_frames": frame_idx,
        },
        "frames": frame_results,
    }
    analysis_id = save_analysis(user_id, "video", result)
    out = {"emotion": emotion_name, "percent": percent, "summary": result["summary"], "frames": frame_results}
    if analysis_id is not None:
        out["analysis_id"] = analysis_id
    else:
        out["saved"] = False
    return out

#This endpoint retrieves a saved analysis by id.
@app.get("/analysis/{analysis_id}")
def get_analysis_by_id(analysis_id: str):
    """Retrieve a saved analysis by id."""
    doc = get_analysis(analysis_id)
    if not doc:
        raise HTTPException(404, "Analysis not found")
    return doc
