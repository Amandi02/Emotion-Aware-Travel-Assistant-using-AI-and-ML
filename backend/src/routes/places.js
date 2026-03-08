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
router.get('/nearby', authMiddleware, async (req, res) => {
  const { lat, lng, emotion = 'neutral', radius = 15000 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ message: 'lat and lng are required' });
  }
  if (!GOOGLE_KEY) {
    return res.status(503).json({ message: 'Google Places API key not configured' });
  }

  const placeTypes = EMOTION_PLACE_TYPES[emotion] || EMOTION_PLACE_TYPES.neutral;

  try {
    // New API: single POST request, all types at once, up to 20 results
    const { data } = await axios.post(
      NEARBY_URL,
      {
        includedTypes: placeTypes,          // all 4 types in one call
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: parseFloat(lat),
              longitude: parseFloat(lng),
            },
            radius: parseFloat(radius),
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_KEY,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        timeout: 10_000,
      }
    );

    const rawPlaces = data.places || [];

    const places = rawPlaces.slice(0, 20).map((p) => {
      // Photo name format: "places/PLACE_ID/photos/PHOTO_REF"
      const photoName = p.photos?.[0]?.name ?? null;

      // Build a direct media URL for the photo
      const photoUrl = photoName
        ? `${PLACES_NEW_BASE}/${photoName}/media?maxWidthPx=400&key=${GOOGLE_KEY}`
        : null;

      return {
        placeId: p.id,
        name: p.displayName?.text ?? 'Unknown',
        address: p.formattedAddress ?? '',
        rating: p.rating ?? null,
        userRatings: p.userRatingCount ?? 0,
        types: p.types ?? [],
        location: p.location ?? null,
        photoName,                // pass this to /emission
        photoUrl,
        emission: null,       // fetched separately per place
      };
    });

    res.json({ emotion, places });
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    res.status(502).json({ message: `Google Places error: ${detail}` });
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
