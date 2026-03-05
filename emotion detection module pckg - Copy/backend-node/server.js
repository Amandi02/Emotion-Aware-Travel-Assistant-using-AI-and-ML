require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const EMOTION_API_URL = process.env.EMOTION_API_URL || 'http://localhost:8000';
const PORT = process.env.PORT || 3000;

// In-memory storage for multer (no disk write). For large videos use diskStorage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// MongoDB schema for analysis results
const analysisSchema = new mongoose.Schema({
  userId: { type: String, default: null },
  source: { type: String, enum: ['video', 'frame'], required: true },
  emotion: { type: String, required: true },
  percent: { type: Number, required: true },
  raw: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});
const Analysis = mongoose.model('Analysis', analysisSchema);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'node-backend' });
});

// Analyze video: proxy to FastAPI, save to MongoDB, return single emotion for mobile
app.post('/api/analyze-video', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'video.mp4',
      contentType: req.file.mimetype,
    });
    if (req.body.user_id) form.append('user_id', req.body.user_id);
    form.append('sample_every_n_frames', req.body.sample_every_n_frames || '10');

    const { data } = await axios.post(`${EMOTION_API_URL}/analyze-video`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120000,
    });

    const emotion = data.emotion ?? data.summary?.dominant_emotion ?? 'neutral';
    const percent = data.percent ?? data.summary?.dominant_percent ?? 0;

    await Analysis.create({
      userId: req.body.user_id || null,
      source: 'video',
      emotion,
      percent,
      raw: data,
    }).catch(() => {});

    res.json({ emotion, percent });
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || 'Analysis failed';
    res.status(err.response?.status || 500).json({ error: msg });
  }
});

// Analyze single image (frame)
app.post('/api/analyze-frame', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'frame.jpg',
      contentType: req.file.mimetype,
    });
    if (req.body.user_id) form.append('user_id', req.body.user_id);

    const { data } = await axios.post(`${EMOTION_API_URL}/analyze-frame`, form, {
      headers: form.getHeaders(),
      timeout: 60000,
    });

    const emotion = data.emotion ?? data.dominant_emotion ?? 'neutral';
    const percent = data.percent ?? data.dominant_percent ?? 0;

    await Analysis.create({
      userId: req.body.user_id || null,
      source: 'frame',
      emotion,
      percent,
      raw: data,
    }).catch(() => {});

    res.json({ emotion, percent });
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || 'Analysis failed';
    res.status(err.response?.status || 500).json({ error: msg });
  }
});

// Optional: list recent analyses for a user
app.get('/api/analyses', async (req, res) => {
  try {
    const list = await Analysis.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ analyses: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      await mongoose.connect(uri);
      console.log('MongoDB connected');
    } catch (e) {
      console.warn('MongoDB not connected:', e.message);
    }
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Node backend running at http://0.0.0.0:${PORT}`);
    console.log(`Emotion API (FastAPI) expected at ${EMOTION_API_URL}`);
  });
}

start();
