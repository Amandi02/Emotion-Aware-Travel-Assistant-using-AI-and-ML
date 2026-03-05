import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes     from './routes/auth.js';
import pipelineRoutes from './routes/pipeline.js';
import placesRoutes   from './routes/places.js';
import pointsRoutes   from './routes/points.js';
import donationsRoutes from './routes/donations.js';

await connectDB();

const app = express();

// ── CORS ───────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
}));

// ── Stripe webhook MUST come before express.json (needs raw body) ─────────────
app.use('/api/donations/webhook', express.raw({ type: 'application/json' }));

// ── Body parsers ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/pipeline',  pipelineRoutes);
app.use('/api/places',    placesRoutes);
app.use('/api/points',    pointsRoutes);
app.use('/api/donations', donationsRoutes);

app.get('/api/health', (_, res) => res.json({ ok: true }));

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
