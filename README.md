# Feelio

**Mobile app** with **Node.js** + **FastAPI** backends and **MongoDB**. User sign up / login are implemented in the app; your 3 Python ML models can be added to the FastAPI service later.

## Architecture

```
feelio/
├── backend/     # Node.js (Express) – auth API, MongoDB, JWT
├── ml-api/      # FastAPI (Python) – placeholder for 3 ML models
└── mobile/      # Expo (React Native) – iOS/Android app
```

## Prerequisites

- **Node.js 20.19+** (required for Expo SDK 54)
- Python 3.10+ (for ML API)
- MongoDB (local or [Atlas](https://www.mongodb.com/cloud/atlas))
- Expo Go app on your phone (or iOS Simulator / Android Emulator)

## Setup

### 1. MongoDB

Run MongoDB locally or create a cluster on MongoDB Atlas and copy the connection string.

### 2. Node.js backend

```bash
cd backend
copy env.example .env   # Windows (or: cp env.example .env on Mac/Linux)
# Edit .env: set MONGODB_URI, JWT_SECRET
npm install
npm run dev
```

API: **http://localhost:3000**

- `POST /api/auth/signup` – body: `{ "email", "password", "name?" }`
- `POST /api/auth/login` – body: `{ "email", "password" }`
- `GET /api/auth/me` – header: `Authorization: Bearer <token>`

### 3. Mobile app (Expo SDK 54)

```bash
cd mobile
npm install
npm start
```

Then:

- **Physical device:** Install “Expo Go” from the App Store / Play Store, scan the QR code from the terminal.
- **iOS Simulator:** Press `i` in the Expo terminal (Mac only).
- **Android Emulator:** Press `a` in the Expo terminal.

**API URL for the app:** Edit `mobile/config.js` and set `API_URL` so the device can reach your backend:

- **iOS Simulator:** `http://localhost:3000/api`
- **Android Emulator:** `http://10.0.2.2:3000/api`
- **Physical device:** Use your computer’s LAN IP, e.g. `http://192.168.1.100:3000/api` (same WiFi as the phone).

### 4. FastAPI (ML API, optional)

```bash
cd ml-api
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Add your 3 ML models under `/api/ml/model1`, `/api/ml/model2`, `/api/ml/model3` in `ml-api/main.py`.

## Quick start

1. Start MongoDB.
2. Start backend: `cd backend && npm run dev`
3. Start mobile app: `cd mobile && npm start`
4. Open the app in Expo Go (or simulator), set `API_URL` in `mobile/config.js` if needed, then sign up or log in.

## App screens

- **Home** – Welcome and links to Log in / Sign up
- **Login** – Email + password
- **Sign up** – Email, password, optional name
- **Dashboard** – Protected screen after login; placeholder for future ML features
