"""
Emotion detection service using ViT (Vision Transformer) model.
Adapted from the emotion-detection module – model path is configurable.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification

# Weighted re-balancing so rare emotions are not swamped by "neutral"
EMOTION_WEIGHTS: Dict[str, float] = {
    "anger": 3.1,
    "disgust": 0.8,
    "fear": 1.2,
    "happy": 0.5,
    "neutral": 0.4,
    "sad": 1.1,
    "surprise": 0.5,
}


class EmotionService:
    """Loads the ViT emotion model once and processes frames or images."""

    def __init__(self, model_path: str) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        torch.set_num_threads(4)
        # Wrap in Path so HuggingFace treats it as a local directory, not a Hub repo-ID.
        # Paths with spaces / special chars fail the Hub name validation when passed as a plain string.
        local_path = Path(model_path)
        self.model = AutoModelForImageClassification.from_pretrained(local_path).to(self.device)
        self.image_processor = AutoImageProcessor.from_pretrained(local_path)
        self.model.eval()
        # Haar cascade face detector (built-in OpenCV)
        self.face_detector = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self.frame_size = 640

    # ── internal helpers ──────────────────────────────────────────────────────

    def _detect_and_crop_face(self, frame: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_detector.detectMultiScale(
            gray, scaleFactor=1.2, minNeighbors=4, minSize=(30, 30)
        )
        if len(faces) == 0:
            return cv2.resize(frame, (self.frame_size, self.frame_size))
        largest = max(faces, key=lambda x: x[2] * x[3])
        x, y, w, h = largest
        pad = int(0.2 * max(w, h))
        x = max(0, x - pad)
        y = max(0, y - pad)
        w = min(frame.shape[1] - x, w + 2 * pad)
        h = min(frame.shape[0] - y, h + 2 * pad)
        face_img = frame[y: y + h, x: x + w]
        return cv2.resize(face_img, (self.frame_size, self.frame_size))

    def _run_model(self, pil_image: Image.Image) -> Dict[str, float]:
        with torch.no_grad():
            inputs = self.image_processor([pil_image], return_tensors="pt").to(self.device)
            outputs = self.model(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        predictions = probs.cpu().numpy()[0]
        raw: Dict[str, float] = {
            label: float(p)
            for label, p in zip(self.model.config.id2label.values(), predictions)
        }
        # Normalise label: "angry" → "anger"
        if "angry" in raw:
            raw["anger"] = raw.pop("angry")
        weighted = {e: s * EMOTION_WEIGHTS.get(e, 1.0) for e, s in raw.items()}
        total = sum(weighted.values()) or 1.0
        return {e: round((s / total) * 100, 2) for e, s in weighted.items()}

    # ── public API ────────────────────────────────────────────────────────────

    def process_frame(self, frame_bytes: bytes) -> Dict[str, float]:
        """Process a single image (JPEG/PNG bytes) and return emotion scores."""
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Could not decode image")
        cropped = self._detect_and_crop_face(frame)
        pil_image = Image.fromarray(cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB))
        return self._run_model(pil_image)

    def process_frame_from_array(self, frame: np.ndarray) -> Dict[str, float]:
        """Process a frame already decoded in memory (e.g. from video)."""
        cropped = self._detect_and_crop_face(frame)
        pil_image = Image.fromarray(cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB))
        return self._run_model(pil_image)

    def process_video(self, video_path: str) -> Dict:
        """
        Process a video file and return the dominant emotion.

        Matches the notebook's EmotionDetectorCPU.process_video_with_display() logic exactly:
          • Reads EVERY frame (no skipping)
          • Applies a 5-frame sliding window to smooth per-frame scores
          • Averages all smoothed scores across the full video
          • Returns dominant emotion + full average breakdown
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Sliding window – same deque(maxlen=5) as the notebook
        emotion_window: deque = deque(maxlen=5)
        # Accumulate per-frame weighted+smoothed scores for final average
        frame_results: List[Tuple[int, Dict[str, float]]] = []

        frame_idx = 0
        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                frame_idx += 1

                try:
                    # 1. detect face + run ViT → weighted scores (same as process_single_frame)
                    weighted_scores = self.process_frame_from_array(frame)

                    # 2. add to sliding window
                    emotion_window.append(weighted_scores)

                    # 3. average across window (smoothing)
                    avg_scores = {
                        emotion: float(np.mean([w[emotion] for w in emotion_window]))
                        for emotion in weighted_scores
                    }

                    frame_results.append((frame_idx, avg_scores))
                except Exception:
                    # Skip unprocessable frames (e.g. all-black frames)
                    pass
        finally:
            cap.release()

        if not frame_results:
            raise ValueError("No frames could be analysed in the video")

        # Final average across all frames  (same as notebook's _analyze_results)
        emotion_keys = list(frame_results[0][1].keys())
        avg_emotions: Dict[str, float] = {
            e: round(
                sum(scores[e] for _, scores in frame_results) / len(frame_results), 2
            )
            for e in emotion_keys
        }

        dominant_name, dominant_pct = max(avg_emotions.items(), key=lambda x: x[1])

        return {
            "emotion":          dominant_name,
            "percent":          round(dominant_pct, 2),
            "average_emotions": avg_emotions,
            "frames_analyzed":  len(frame_results),
            "total_frames":     frame_idx,
        }


# ── lazy singleton ────────────────────────────────────────────────────────────

_emotion_service: Optional[EmotionService] = None


def get_emotion_service(model_path: str) -> EmotionService:
    global _emotion_service
    if _emotion_service is None:
        _emotion_service = EmotionService(model_path)
    return _emotion_service
