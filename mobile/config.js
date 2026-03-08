// ── Backend API URL ───────────────────────────────────────────────────────────
// Physical device / Expo Go → use your machine's Wi-Fi IP
// Android emulator          → use http://10.0.2.2:3000/api
// iOS simulator             → use http://localhost:3000/api
export const API_URL = 'http://172.20.10.6:3000/api';

// ── Stripe ────────────────────────────────────────────────────────────────────
// Publishable key is safe to expose in the client.
// Used if you later add @stripe/stripe-react-native for in-app card entry.
export const STRIPE_PUBLISHABLE_KEY =
  'pk_test_51T6B7t2R9LUxv7sUAM72ZFHE6nX8IL6ijZJkCtV9FPvSEY5rXQlcasb1MFngXGiSrJ42cjtCaKWe7fgF7kX9RB6800lAV1n4m5';
