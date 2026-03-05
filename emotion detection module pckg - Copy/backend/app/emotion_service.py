"""
Emotion detection service using the same ViT model as your notebook.
Processes video frames and returns emotion scores.
"""
import io
from typing import Dict, List, Optional

import cv2
import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification

# Same emotion weights as in your notebook
EMOTION_WEIGHTS = {
    "anger": 3.1,
    "disgust": 0.8,
    "fear": 1.2,
    "happy": 0.5,
    "neutral": 0.4,
    "sad": 1.1,
    "surprise": 0.5,
}


class EmotionService:
    """Loads the emotion model once and processes frames/images."""

    def __init__(self, model_path: str):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        torch.set_num_threads(4)
        self.model = AutoModelForImageClassification.from_pretrained(model_path).to(
            self.device
        )
        self.image_processor = AutoImageProcessor.from_pretrained(model_path)
        self.model.eval()
        #This loads OpenCV’s built-in face detector
        self.face_detector = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self.frame_size = 640

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
        face_img = frame[y : y + h, x : x + w]
        return cv2.resize(face_img, (self.frame_size, self.frame_size))

    def process_frame(self, frame_bytes: bytes) -> Dict[str, float]:
        """
        Process a single image (JPEG/PNG bytes) and return emotion scores.
        Used when the mobile app sends one frame at a time.
        """
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Could not decode image")
        cropped = self._detect_and_crop_face(frame)
        pil_image = Image.fromarray(cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB))
        with torch.no_grad():
            inputs = self.image_processor([pil_image], return_tensors="pt").to(
                self.device
            )
            outputs = self.model(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        predictions = probs.cpu().numpy()[0]
        emotion_scores = {
            label: float(p)
            for label, p in zip(
                self.model.config.id2label.values(), predictions
            )
        }
        if "angry" in emotion_scores:
            emotion_scores["anger"] = emotion_scores.pop("angry")
        weighted = {
            e: s * EMOTION_WEIGHTS.get(e, 1.0) for e, s in emotion_scores.items()
        }
        total = sum(weighted.values()) or 1.0
        return {e: round((s / total) * 100, 2) for e, s in weighted.items()}

    def process_frame_from_array(self, frame: np.ndarray) -> Dict[str, float]:
        """Process a frame already in memory (e.g. from video)."""
        cropped = self._detect_and_crop_face(frame)
        pil_image = Image.fromarray(cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB))
        with torch.no_grad():
            inputs = self.image_processor([pil_image], return_tensors="pt").to(
                self.device
            )
            outputs = self.model(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        predictions = probs.cpu().numpy()[0]
        emotion_scores = {
            label: float(p)
            for label, p in zip(
                self.model.config.id2label.values(), predictions
            )
        }
        if "angry" in emotion_scores:
            emotion_scores["anger"] = emotion_scores.pop("angry")
        weighted = {
            e: s * EMOTION_WEIGHTS.get(e, 1.0) for e, s in emotion_scores.items()
        }
        total = sum(weighted.values()) or 1.0
        return {e: round((s / total) * 100, 2) for e, s in weighted.items()}


# Lazy singleton so we load the model only when first request comes
_emotion_service: Optional[EmotionService] = None


def get_emotion_service(model_path: str) -> EmotionService:
    global _emotion_service
    if _emotion_service is None:
        _emotion_service = EmotionService(model_path)
    return _emotion_service
