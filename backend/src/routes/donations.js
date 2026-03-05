/**
 * Donations routes (Stripe)
 *
 * POST /api/donations/create-payment-intent
 *   Creates a Stripe PaymentIntent and returns the clientSecret + publishable key.
 *   The mobile app renders an in-app Stripe Payment Element form using these.
 *
 * POST /api/donations/confirm
 *   Called by the mobile app after a payment succeeds (client-side confirmation).
 *   Deducts points and records the donation immediately.
 *
 * POST /api/donations/webhook
 *   Stripe webhook (backup) – handles payment_intent.succeeded server-side.
 *   Must be registered with raw body parser (before express.json middleware).
 *
 * GET  /api/donations/history
 * GET  /api/donations/charities
 * GET  /api/donations/success  (HTML redirect page)
 * GET  /api/donations/cancel   (HTML redirect page)
 */

import { Router } from 'express';
import Stripe from 'stripe';
import express from 'express';
import User from '../models/User.js';
import { authMiddleware, attachUser } from '../middleware/auth.js';
import { POINTS_PER_DOLLAR } from './points.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const CHARITIES = [
  { id: 'one_tree_planted', name: 'One Tree Planted 🌳' },
  { id: 'cool_earth',       name: 'Cool Earth 🌿' },
  { id: 'rainforest_trust', name: 'Rainforest Trust 🐾' },
  { id: 'carbon_fund',      name: 'Carbon Fund ♻️' },
];

// ── GET /api/donations/charities ──────────────────────────────────────────────
router.get('/charities', (_, res) => res.json({ charities: CHARITIES }));

// ── POST /api/donations/create-payment-intent ─────────────────────────────────
// Creates a Stripe PaymentIntent. The mobile app renders a Stripe Payment
// Element form in-app using the returned clientSecret + publishableKey.
router.post('/create-payment-intent', authMiddleware, attachUser, async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ message: 'Stripe is not configured on the server.' });
  }

  const { pointsToConvert, charityId } = req.body;
  const points = parseInt(pointsToConvert, 10);

  if (!points || points < POINTS_PER_DOLLAR) {
    return res.status(400).json({
      message: `Minimum ${POINTS_PER_DOLLAR} points required to donate`,
    });
  }
  if (req.user.points < points) {
    return res.status(400).json({ message: 'Insufficient points balance' });
  }

  const charity   = CHARITIES.find((c) => c.id === charityId) || CHARITIES[0];
  const amountCents = Math.floor(points / POINTS_PER_DOLLAR) * 100;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   amountCents,
      currency: 'usd',
      description: `Feelio Eco Donation – ${charity.name}`,
      // card only – disables Stripe Link and all redirect-based methods
      payment_method_types: ['card'],
      metadata: {
        userId:          String(req.userId),
        pointsToConvert: String(points),
        charityId:       charity.id,
        charityName:     charity.name,
      },
    });

    res.json({
      clientSecret:   paymentIntent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      amount:         amountCents,
      charityName:    charity.name,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    res.status(502).json({ message: `Stripe error: ${err.message}` });
  }
});

// ── POST /api/donations/confirm ────────────────────────────────────────────────
// Called right after the in-app form reports success, before the webhook fires.
// This gives instant UX feedback. The webhook acts as a safety net.
router.post('/confirm', authMiddleware, attachUser, async (req, res) => {
  const { paymentIntentId, pointsToConvert, charityId } = req.body;
  const points = parseInt(pointsToConvert || '0', 10);

  if (!paymentIntentId || points <= 0) {
    return res.status(400).json({ message: 'paymentIntentId and pointsToConvert are required' });
  }

  // Verify the PaymentIntent actually succeeded before deducting points
  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (err) {
    return res.status(502).json({ message: `Could not verify payment: ${err.message}` });
  }

  if (intent.status !== 'succeeded') {
    return res.status(400).json({ message: `Payment not completed (status: ${intent.status})` });
  }

  // Prevent double-processing: check if this paymentIntentId was already recorded
  const alreadyProcessed = (req.user.donationHistory || []).some(
    (d) => d.stripeSessionId === paymentIntentId
  );
  if (alreadyProcessed) {
    return res.json({ message: 'Already processed', points: req.user.points });
  }

  const charity = CHARITIES.find((c) => c.id === charityId) || CHARITIES[0];

  const updated = await User.findByIdAndUpdate(
    req.userId,
    {
      $inc: { points: -points },
      $push: {
        donationHistory: {
          amountCents:     intent.amount,
          pointsUsed:      points,
          charityId:       charity.id,
          charityName:     charity.name,
          stripeSessionId: paymentIntentId,
          status:          'completed',
          createdAt:       new Date(),
        },
      },
    },
    { new: true }
  );

  res.json({
    message: `💚 Donation of $${(intent.amount / 100).toFixed(2)} to ${charity.name} confirmed!`,
    newBalance: updated.points,
  });
});

// ── GET /api/donations/history ─────────────────────────────────────────────────
router.get('/history', authMiddleware, attachUser, (req, res) => {
  const history = (req.user.donationHistory || []).slice().reverse().slice(0, 20);
  res.json({ history });
});

// ── GET /api/donations/success ────────────────────────────────────────────────
router.get('/success', (_, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Donation Successful</title>
<style>
  body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
    min-height:100vh;background:#0f0f12;font-family:system-ui,sans-serif;color:#f0f0f2;padding:24px;text-align:center}
  .emoji{font-size:4rem;margin-bottom:1rem}
  h1{font-size:2rem;margin-bottom:.5rem}
  p{color:#8a8a94;font-size:1rem;line-height:1.6;max-width:360px}
  .badge{background:#0f2a26;border:1px solid #2dd4bf33;border-radius:12px;padding:16px 24px;margin-top:16px}
  .badge span{color:#2dd4bf;font-size:1.1rem;font-weight:700}
</style></head>
<body>
  <div class="emoji">💚</div>
  <h1>Thank you!</h1>
  <p>Your eco-donation was successful. Close this tab and return to Feelio.</p>
  <div class="badge"><span>You're making the planet greener 🌍</span></div>
</body></html>`);
});

// ── GET /api/donations/cancel ─────────────────────────────────────────────────
router.get('/cancel', (_, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cancelled</title>
<style>
  body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
    min-height:100vh;background:#0f0f12;font-family:system-ui,sans-serif;color:#f0f0f2;padding:24px;text-align:center}
  .emoji{font-size:4rem;margin-bottom:1rem}
  h1{font-size:2rem;margin-bottom:.5rem}
  p{color:#8a8a94;font-size:1rem;line-height:1.6;max-width:360px}
</style></head>
<body>
  <div class="emoji">↩️</div>
  <h1>Donation Cancelled</h1>
  <p>No charge was made. Return to the Feelio app whenever you're ready.</p>
</body></html>`);
});

// ── POST /api/donations/webhook ───────────────────────────────────────────────
// Safety-net webhook. Handles both PaymentIntent and Checkout Session events.
// NOTE: registered with express.raw() in index.js – must come BEFORE express.json()
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ── PaymentIntent succeeded (in-app payment form) ───────────────────────
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const { userId, pointsToConvert, charityId, charityName } = intent.metadata || {};
      const points = parseInt(pointsToConvert || '0', 10);

      if (userId && points > 0) {
        // Find the user and only apply if not already processed via /confirm
        const user = await User.findById(userId);
        if (user) {
          const alreadyDone = (user.donationHistory || []).some(
            (d) => d.stripeSessionId === intent.id
          );
          if (!alreadyDone) {
            await User.findByIdAndUpdate(userId, {
              $inc: { points: -points },
              $push: {
                donationHistory: {
                  amountCents:     intent.amount,
                  pointsUsed:      points,
                  charityId,
                  charityName,
                  stripeSessionId: intent.id,
                  status:          'completed',
                  createdAt:       new Date(),
                },
              },
            });
          }
        }
      }
    }

    // ── Checkout Session completed (legacy fallback) ─────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { userId, pointsToConvert, charityId, charityName } = session.metadata || {};
      const points = parseInt(pointsToConvert || '0', 10);

      if (userId && points > 0) {
        const user = await User.findById(userId);
        if (user) {
          const alreadyDone = (user.donationHistory || []).some(
            (d) => d.stripeSessionId === session.id
          );
          if (!alreadyDone) {
            await User.findByIdAndUpdate(userId, {
              $inc: { points: -points },
              $push: {
                donationHistory: {
                  amountCents:     session.amount_total,
                  pointsUsed:      points,
                  charityId,
                  charityName,
                  stripeSessionId: session.id,
                  status:          'completed',
                  createdAt:       new Date(),
                },
              },
            });
          }
        }
      }
    }

    res.json({ received: true });
  }
);

export default router;
