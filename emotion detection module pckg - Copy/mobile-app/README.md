# Emotion Detection – React Native (Expo) Mobile App

Mobile app that picks a video, sends it to the Node.js backend, and shows the detected emotion.

## Prerequisites

- Node.js 18+
- Expo Go app on your phone (or Android/iOS simulator)
- Backend: Node server and FastAPI emotion API must be running (see project root and `backend-node/`)

## Setup

```bash
cd mobile-app
npm install
```

## Run

```bash
npx expo start
```

Then scan the QR code with Expo Go (Android) or Camera (iOS), or press `a`/`i` for simulator.

## API URL (important for real device)

- **Android emulator:** app uses `http://10.0.2.2:3000` (Node backend).
- **iOS simulator:** app uses `http://localhost:3000`.
- **Physical device:** set your computer’s IP in `config.js` so `API_BASE_URL` is e.g. `http://192.168.1.10:3000`. Ensure phone and PC are on the same Wi‑Fi.

## Assets

If you see missing icon/splash errors, add under `mobile-app/assets/`:

- `icon.png` (1024×1024)
- `splash.png` (1284×2778)
- `adaptive-icon.png` (1024×1024)

Or change `app.json` to remove/point to existing assets.
