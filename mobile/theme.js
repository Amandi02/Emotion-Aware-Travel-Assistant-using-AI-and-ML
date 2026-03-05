/**
 * Feelio Brand Theme - Modern Premium
 * Clean, modern UI with white backgrounds, glassmorphism, and vibrant accents.
 * Inspired by the Feelio.lk logo and modern mobile design patterns.
 */

export const COLORS = {
  // ── Brand Palette (Vibrant & Deep) ─────────────────────────────────────────
  primary: '#10B981',   // Emerald 500 (Main brand green)
  primaryLight: '#34D399',   // Emerald 400
  primaryDeep: '#059669',   // Emerald 600
  primaryDark: '#065F46',   // Emerald 800

  teal: '#14B8A6',   // Teal 500
  tealLight: '#2DD4BF',   // Teal 400
  tealDark: '#0F766E',   // Teal 700

  accent: '#3B82F6',   // Blue 500
  secondary: '#F59E0B',   // Amber 500

  // ── Neutrals (Modern Slate) ────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate800: '#1E293B',
  slate900: '#0F172A',

  // ── Semantic Backgrounds (Backward Compatible) ───────────────────────────
  bg: '#F8FAFC',
  bgSecondary: '#F1F5F9',
  bgCard: '#FFFFFF',
  bgGreenTint: '#F0FDF4',
  bgTealTint: '#F0FDFA',
  bgYellowTint: '#FFFBEB',

  // ── Text (Backward Compatible) ────────────────────────────────────────────
  text: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textOnGreen: '#FFFFFF',

  // ── Borders ──────────────────────────────────────────────────────────────
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // ── Status ───────────────────────────────────────────────────────────────
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // ── Emission Tier Colors ─────────────────────────────────────────────────
  emVeryLow: '#10B981',
  emLow: '#84CC16',
  emMedium: '#F59E0B',
  emHigh: '#F97316',
  emVeryHigh: '#EF4444',
  leaf: '#4ADE80',
};

// Backward compatibility for SHADOW
export const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

export const SHADOW_LG = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.1,
  shadowRadius: 16,
  elevation: 8,
};

export const MODERN_SHADOW = {
  sm: SHADOW,
  md: SHADOW_LG,
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  }
};

export const RADIUS = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
