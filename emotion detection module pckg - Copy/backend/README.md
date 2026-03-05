# Emotion Detection Backend (FastAPI + MongoDB)

Backend for the emotion detection mobile app. Accepts video or image frames, runs the ViT emotion model (same as your notebook), and stores results in MongoDB.

## Quick start

1. **Create and activate virtual environment** (from this `backend` folder):
   ```bash
   python -m venv venv
   venv\Scripts\activate   # Windows
   # source venv/bin/activate   # Mac/Linux
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure:** Copy `.env.example` to `.env` and set `MONGODB_URI` (and optionally `EMOTION_MODEL_PATH`).

4. **Run:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   Or on Windows: `run_server.bat`

5. Open **http://localhost:8000/docs** for the API documentation.

## Endpoints

- `GET /health` – Health check (server + MongoDB).
- `POST /analyze-frame` – Upload one image; returns emotions and saves to MongoDB.
- `POST /analyze-video` – Upload video; returns summary + per-frame emotions, saves to MongoDB.
- `GET /analysis/{id}` – Get a saved analysis by id.

See **START_HERE.md** in the project root for a non-coder friendly guide.
