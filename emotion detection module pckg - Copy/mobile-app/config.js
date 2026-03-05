// API backend URL from .env or fallback
// Set EXPO_PUBLIC_API_URL in mobile-app/.env (e.g. http://localhost:3000)
import { Platform } from 'react-native';

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();
  if (__DEV__) {
    if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
    return 'http://localhost:3000';
  }
  return 'https://your-production-api.com';
};

export const API_BASE_URL = getBaseUrl();
  