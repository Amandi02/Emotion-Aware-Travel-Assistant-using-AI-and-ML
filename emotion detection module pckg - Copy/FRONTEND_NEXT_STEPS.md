# React Native Frontend – Next Steps

This document describes how to set up the **mobile app (React Native)** so it talks to your **FastAPI backend** and **MongoDB** for emotion detection from videos.

---

## What You’re Building

- **React Native** app (iOS/Android).
- User can **record a video** or **pick a video** from the device.
- App sends **video** or **frames** to your **FastAPI backend**.
- Backend runs the **emotion model** and stores results in **MongoDB**.
- App shows **emotion results** (and optionally history from the API).

**Note:** The backend is **FastAPI (Python)** and uses **MongoDB** with **Python (PyMongo)**. There is no Node.js server in this setup; Node.js is only used by React Native for the app build tooling.

---

## 1. Create a New React Native App

If you don’t have a React Native project yet:

```bash
npx @react-native-community/cli@latest init EmotionApp
cd EmotionApp
```

Use **React Native CLI** (not Expo) if you need native camera/video access. If you prefer **Expo**, use:

```bash
npx create-expo-app EmotionApp
cd EmotionApp
```

---

## 2. Install Dependencies for Video and API

You’ll need:

- **Camera / video:** e.g. `react-native-vision-camera` or `expo-camera` (Expo), and possibly a video picker.
- **HTTP client:** `axios` or `fetch` to call your FastAPI backend.
- **Permissions:** camera and storage as required by the platform.

Example (React Native CLI, no Expo):

```bash
npm install axios
npm install react-native-vision-camera react-native-video  # or expo-camera / expo-image-picker if using Expo)
```

Configure permissions in:

- **Android:** `AndroidManifest.xml` (camera, storage).
- **iOS:** `Info.plist` (camera, photo library).

---

## 3. Backend Base URL

Your app must call the **same machine** where the backend runs.

- **Emulator/Simulator:**  
  - Android emulator: `http://10.0.2.2:8000`  
  - iOS simulator: `http://localhost:8000`
- **Physical device:**  
  Use your computer’s IP and port **8000**, e.g. `http://192.168.1.10:8000`.  
  - Find IP: Windows `ipconfig`, Mac/Linux `ifconfig` or `ip addr`.  
  - Backend must be run with `--host 0.0.0.0` (already in START_HERE).

Create a small config (e.g. `src/config.js`):

```javascript
export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.10:8000'   // replace with your PC IP when on device
  : 'https://your-production-api.com';
```

Use this for all API calls.

---

## 4. Call the Backend from the App

### Analyze one frame (image)

When you have a **single image** (e.g. one frame from the video):

```javascript
import axios from 'axios';
import { API_BASE_URL } from './config';

async function analyzeFrame(imageUri, userId = null) {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'frame.jpg',
  });
  if (userId) formData.append('user_id', userId);

  const { data } = await axios.post(`${API_BASE_URL}/analyze-frame`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // { emotions, dominant_emotion, dominant_percent, analysis_id }
}
```

### Analyze a full video

When you have a **video file**:

```javascript
async function analyzeVideo(videoUri, userId = null, sampleEveryNFrames = 10) {
  const formData = new FormData();
  formData.append('file', {
    uri: videoUri,
    type: 'video/mp4',
    name: 'video.mp4',
  });
  if (userId) formData.append('user_id', userId);
  formData.append('sample_every_n_frames', sampleEveryNFrames);

  const { data } = await axios.post(`${API_BASE_URL}/analyze-video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // { analysis_id, summary, frames }
}
```

### Get a saved analysis

```javascript
async function getAnalysis(analysisId) {
  const { data } = await axios.get(`${API_BASE_URL}/analysis/${analysisId}`);
  return data;
}
```

Use these from your screens: e.g. after recording/picking a video, call `analyzeVideo(videoUri)` or extract a frame and call `analyzeFrame(frameUri)`, then show `data.emotions` and `data.dominant_emotion` on the UI.

---

## 5. Suggested App Flow

1. **Home / Record screen**  
   - Button “Record video” or “Pick video”.
2. **After video is chosen**  
   - Show a preview; button “Analyze”.
3. **On “Analyze”**  
   - Call `analyzeVideo(uri)` or `analyzeFrame(uri)`.
4. **Show result**  
   - Display `dominant_emotion`, `emotions` (e.g. bar chart or list), and optionally `analysis_id`.
5. **Optional:** “History” screen that calls `GET /analysis/{id}` for previously saved analyses (you can store `analysis_id` in local state or in MongoDB linked to a user).

---

## 6. MongoDB and Users

- **Backend** already saves each analysis to **MongoDB** (see `backend/app/database.py`).  
- The optional `user_id` in the API links an analysis to a user.  
- You can add **auth** later (e.g. JWT in FastAPI and send a token from the app in headers).  
- For now, you can omit `user_id` or send a placeholder; analyses will still be stored and retrievable by `analysis_id`.

---

## 7. Summary Checklist

- [ ] Create React Native app (CLI or Expo).  
- [ ] Install camera/video and HTTP (e.g. axios).  
- [ ] Set `API_BASE_URL` to your backend (IP:8000 or localhost for simulator).  
- [ ] Implement `analyzeFrame` and/or `analyzeVideo` and show results.  
- [ ] Run backend (see **START_HERE.md**) and MongoDB, then test from the app.

Once the backend is running and the app uses the correct base URL, the “next steps” are: design the UI (record → analyze → results), add history if you want, and later add auth and production deployment.
