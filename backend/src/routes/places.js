/**
 * Places routes – uses the NEW Google Places API (v1)
 *
 * GET  /api/places/nearby
 *   Returns up to 10 nearby places via Places API (New) Nearby Search,
 *   filtered by emotion-mapped place types.
 *   Query params: lat, lng, emotion, radius (default 15 000 m)
 *
 * POST /api/places/emission
 *   Fetches the carbon-emission estimate for a single place photo.
 *   Body: { photoName }  – the `photos[0].name` value from /nearby response
 */

import { Router } from 'express';
import axios from 'axios';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;
const ML_API_URL = process.env.ML_API_URL || 'http://127.0.0.1:8003';

// New Places API (v1) base URLs
const PLACES_NEW_BASE = 'https://places.googleapis.com/v1';
const NEARBY_URL = `${PLACES_NEW_BASE}/places:searchNearby`;

// ── Emotion → place-type mapping ──────────────────────────────────────────────
const EMOTION_PLACE_TYPES = {
  happy: ['park', 'amusement_park', 'tourist_attraction', 'restaurant'],
  sad: ['spa', 'cafe', 'library', 'book_store'],
  angry: ['park', 'gym', 'yoga_studio', 'national_park'],
  fear: ['cafe', 'library', 'church', 'museum'],
  neutral: ['museum', 'shopping_mall', 'restaurant', 'art_gallery'],
  surprise: ['tourist_attraction', 'amusement_park', 'museum', 'zoo'],
  disgust: ['park', 'spa', 'gym'],
};

// Fields to request – keeps response lean and avoids billing surprises
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.location',
  'places.photos',
].join(',');

// ── GET /api/places/nearby ────────────────────────────────────────────────────
// ── GET /api/places/nearby ────────────────────────────────────────────────────
router.get('/nearby', authMiddleware, async (req, res) => {
  // 1. Extract inputs (adding the new context metrics for your AI)
  const { 
    lat, 
    lng, 
    emotion = 'neutral', 
    step_count = 0, // Fallback if mobile app isn't sending steps yet
    local_time_hour = new Date().getHours() // Fallback to server time
  } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ message: 'lat and lng are required' });
  }

  try {
    // 2. Call your Python Hybrid AI Recommender (Port 8003)
    const ML_API_URL = process.env.ML_API_HOST 
      ? `http://${process.env.ML_API_HOST}:${process.env.ML_API_PORT}`
      : 'http://127.0.0.1:8003';

    const aiResponse = await axios.post(`${ML_API_URL}/api/v1/recommend`, {
      emotion: emotion,
      step_count: parseInt(step_count, 10),
      lat: parseFloat(lat),
      lon: parseFloat(lng),
      local_time_hour: parseInt(local_time_hour, 10),
      price_sensitivity: 1.0
    });

    // Extract the payload returned by your Python script
    const { diagnostics, recommendations } = aiResponse.data;

    // 3. Map the AI output to the exact format the mobile frontend expects
    const KEY = process.env.GOOGLE_PLACES_API_KEY;
    const places = recommendations.map((p) => {
      // Use Street View Static API for guaranteed exterior images.
      // Falls back to Places photo if no coordinates are available.
      const lat = p.location?.latitude ?? p.location?.lat ?? null;
      const lng = p.location?.longitude ?? p.location?.lng ?? null;

      const photoName = p.photos?.[0]?.name ?? null;

      const photoUrl = KEY && lat && lng
        ? `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&fov=90&pitch=0&source=outdoor&key=${KEY}`
        : photoName && KEY
          ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${KEY}`
          : null;

      return {
        placeId:      p.place_id || p.id || 'unknown',
        name:         p.name || p.displayName?.text || 'Unknown',
        address:      p.formattedAddress || p.vicinity || '',
        rating:       p.rating || null,
        userRatings:  p.userRatingCount || p.user_ratings_total || 0,
        types:        p.types || [],
        location:     p.location || p.geometry?.location || null,
        photoName,
        photoUrl,
        emission: null,
        vfm_score: p.vfm_score
      };
    });

    // 4. Return the intelligent payload to the user
    res.json({ 
      emotion, 
      diagnostics, // Exposing weather & fuzzy radius for frontend UI (optional but cool)
      places 
    });

  } catch (err) {
    console.error("🧠 AI Engine Error:", err.message);
    // Catch errors from the Python service so Node.js doesn't crash
    const detail = err.response?.data?.detail || err.message;
    res.status(502).json({ message: `AI Recommender error: ${detail}` });
  }
});

// ── POST /api/places/emission ─────────────────────────────────────────────────
router.post('/emission', authMiddleware, async (req, res) => {
  const { photoName, photoUrl: directUrl } = req.body;

  if (!photoName && !directUrl) {
    return res.status(400).json({ message: 'photoName or photoUrl is required' });
  }

  // Build the image URL using the new Places API photo endpoint
  const imageUrl = directUrl ||
    `${PLACES_NEW_BASE}/${photoName}/media?maxWidthPx=400&key=${GOOGLE_KEY}`;

  try {
    const form = new URLSearchParams();
    form.append('url', imageUrl);
    form.append('model', 'base');

    const { data } = await axios.post(
      `${ML_API_URL}/api/emission/predict-url`,
      form.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 45_000,
      }
    );

    res.json(data);
  } catch (err) {
    const detail = err.response?.data?.detail || err.message;
    res.status(502).json({ message: `Emission analysis error: ${detail}` });
  }
});

export default router;
