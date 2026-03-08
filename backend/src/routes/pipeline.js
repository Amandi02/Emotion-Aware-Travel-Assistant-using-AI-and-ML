/**
 * Pipeline route – bridges the mobile app and the Python ML API.
 *
 * POST /api/pipeline/analyze-emotion
 *   Accepts a short selfie VIDEO upload, forwards it to the ML API
 *   /api/emotion/analyze-video endpoint and returns the dominant emotion.
 *
 *   The ML API processes EVERY frame with a 5-frame sliding-window smoother
 *   (same algorithm as EmotionDetectorCPU.process_video_with_display in the
 *   training notebook), then averages across the full clip to find the
 *   dominant emotion.
 */

import { Router } from 'express';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Videos can be 100 MB or more – raise the limit accordingly
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },   // 100 MB
});

// Unified ML pipeline service (feelio/ml-api – runs on port 8003)
const ML_API_URL = process.env.ML_API_URL || 'http://127.0.0.1:8003';

// ── POST /api/pipeline/analyze-emotion ────────────────────────────────────────
router.post(
  '/analyze-emotion',
  authMiddleware,
  upload.single('video'),          // mobile sends field name "video"
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' });
    }

    try {
      const form = new FormData();
      form.append('file', req.file.buffer, {
        filename: req.file.originalname || 'scan.mp4',
        contentType: req.file.mimetype || 'video/mp4',
      });

      const { data } = await axios.post(
        `${ML_API_URL}/api/emotion/analyze-video?full=true`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 120_000,    // video analysis can take up to 2 min on CPU
        }
      );

      res.json(data);   // { emotion, percent, average_emotions, frames_analyzed, total_frames }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      res.status(502).json({ message: `ML API error: ${detail}` });
    }
  }
);

export default router;
