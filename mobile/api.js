/**
 * Feelio API client
 * -----------------
 * api       – JSON REST calls to the Node.js backend  (port 3000)
 * mlApi     – multipart / binary calls forwarded through the backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

// ── Shared header builder ─────────────────────────────────────────────────────

async function getAuthHeaders() {
  const token = await AsyncStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── JSON API ──────────────────────────────────────────────────────────────────

export const api = {
  async get(path) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${path}`, { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, message: data.message, ...data };
    return { data };
  },

  async post(path, body) {
    const headers = {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json',
    };
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, message: data.message, ...data };
    return { data };
  },
};

// ── ML API helpers ────────────────────────────────────────────────────────────

export const mlApi = {
  /**
   * Send a short selfie VIDEO to the backend pipeline endpoint.
   *
   * The backend forwards it to /api/emotion/analyze-video on the Python ML
   * API, which processes EVERY frame with a 5-frame sliding-window smoother
   * (matching the training notebook exactly) and returns:
   *   { emotion: string, percent: number }
   *
   * @param {string} videoUri  – local file URI from expo-image-picker / expo-camera
   * @param {string} mimeType  – e.g. 'video/mp4' or 'video/quicktime'
   */
  async analyzeEmotionVideo(videoUri, mimeType = 'video/mp4') {
    const authHeaders = await getAuthHeaders();

    const formData = new FormData();
    formData.append('video', {
      uri:  videoUri,
      type: mimeType,
      name: 'scan.mp4',
    });

    const res = await fetch(`${API_URL}/pipeline/analyze-emotion`, {
      method:  'POST',
      headers: authHeaders,    // no Content-Type header – let fetch set multipart boundary
      body:    formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, message: data.message || 'Emotion analysis failed' };
    return data;   // { emotion, percent }
  },
};
