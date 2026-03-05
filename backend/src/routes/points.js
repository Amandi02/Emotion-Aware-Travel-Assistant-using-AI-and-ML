/**
 * Points routes
 *
 * GET  /api/points/balance   – current balance + recent history
 * POST /api/points/award     – award points for visiting a low-emission place
 */

import { Router } from 'express';
import User from '../models/User.js';
import { authMiddleware, attachUser } from '../middleware/auth.js';

const router = Router();

// Points awarded per emission level (lower emission = more points)
export const EMISSION_POINTS = {
  very_low:  50,
  low:       30,
  medium:    15,
  high:       5,
  very_high:  0,
};

// Conversion: 100 points = $1.00
export const POINTS_PER_DOLLAR = 100;

// ── GET /api/points/balance ───────────────────────────────────────────────────
router.get('/balance', authMiddleware, attachUser, (req, res) => {
  const { points, pointsHistory } = req.user;
  res.json({
    points,
    dollarsValue: (points / POINTS_PER_DOLLAR).toFixed(2),
    conversionRate: `${POINTS_PER_DOLLAR} points = $1.00`,
    history: (pointsHistory || []).slice(-20).reverse(), // last 20 transactions
  });
});

// ── POST /api/points/award ────────────────────────────────────────────────────
router.post('/award', authMiddleware, attachUser, async (req, res) => {
  const { placeId, placeName, placeAddress, emissionLevel } = req.body;

  if (!placeId || !emissionLevel) {
    return res.status(400).json({ message: 'placeId and emissionLevel are required' });
  }

  // Prevent double-awarding for the same place on the same calendar day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alreadyAwarded = (req.user.pointsHistory || []).some(
    (h) => h.placeId === placeId && new Date(h.createdAt) >= today
  );
  if (alreadyAwarded) {
    return res.status(409).json({ message: 'Points already awarded for this place today' });
  }

  const pointsEarned = EMISSION_POINTS[emissionLevel] ?? 0;

  const updated = await User.findByIdAndUpdate(
    req.userId,
    {
      $inc: { points: pointsEarned },
      $push: {
        pointsHistory: {
          amount:        pointsEarned,
          reason:        `Visited ${placeName || placeId}`,
          placeId,
          placeName:     placeName || '',
          placeAddress:  placeAddress || '',
          emissionLevel,
          createdAt:     new Date(),
        },
      },
    },
    { new: true }
  );

  res.json({
    pointsEarned,
    newBalance:    updated.points,
    emissionLevel,
    message:
      pointsEarned > 0
        ? `🌱 You earned ${pointsEarned} eco-points for choosing a sustainable place!`
        : 'No points earned – try a lower-emission venue next time.',
  });
});

export default router;
