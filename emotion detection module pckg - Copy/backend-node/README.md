# Emotion App – Node.js Backend (MongoDB)

Express server used by the React Native app. It receives video/image uploads, calls the Python FastAPI emotion API, saves results to MongoDB, and returns a single emotion for mobile.

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- **FastAPI emotion API** running (e.g. `uvicorn` on port 8000)

## Setup

```bash
cd backend-node
cp .env.example .env
# Edit .env: set MONGODB_URI and EMOTION_API_URL (e.g. http://localhost:8000)
npm install
```

## Run

```bash
npm start
```

Server runs on port 3000 by default. The mobile app calls this server; this server calls FastAPI.

## Endpoints

- `POST /api/analyze-video` – body: multipart with `video` file. Returns `{ emotion, percent }`.
- `POST /api/analyze-frame` – body: multipart with `image` file. Returns `{ emotion, percent }`.
- `GET /api/analyses` – list recent analyses (optional).
- `GET /health` – health check.
