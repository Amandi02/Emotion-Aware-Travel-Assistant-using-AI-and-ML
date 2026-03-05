# How to Start the Backend (Plain Language)

This guide explains **what the backend is**, **what you need installed**, and **how to run it**—written for someone who is not a coder.

---

## What Is the Backend?

Think of your app like a restaurant:

- **Mobile app (React Native)** = the dining room. Users see the app, record or pick videos, and see results.
- **Backend (FastAPI)** = the kitchen. It receives video or images from the app, runs the emotion recognition model, and sends back the emotions (happy, sad, angry, etc.).
- **MongoDB** = the filing cabinet. It stores each analysis (who sent it, what emotions were detected) so you can look it up later.

So: **the backend is the “brain” that runs your emotion model and talks to the database.** The mobile app only talks to this backend; it does not run the model itself.

---

## What You Need on Your Computer

1. **Python** (version 3.10 or 3.11 recommended)  
   - The backend is written in Python.  
   - Download: https://www.python.org/downloads/  
   - During install, check **“Add Python to PATH”**.

2. **MongoDB**  
   - This is where results are stored.  
   - Option A: Install locally: https://www.mongodb.com/try/download/community  
   - Option B: Use MongoDB Atlas (free cloud): https://www.mongodb.com/cloud/atlas  
   - If you use Atlas, you’ll get a **connection string** like:  
     `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/`

3. **Your emotion model**  
   - You already have it (the one in your notebook: `vit-Facial-Expression-Recognition`).  
   - The backend will load it from the same path or from Hugging Face when you start the server.

---

## Step-by-Step: Starting the Backend

### 1. Open a terminal (command line)

- On Windows: press **Win + R**, type `cmd`, press Enter.  
- Or in VS Code / Cursor: **Terminal → New Terminal**.

### 2. Go to the backend folder

```text
cd "c:\Research\emotion detection module pckg - Copy\backend"
```

(Use your real path if it’s different.)

### 3. Create a virtual environment (recommended)

This keeps backend libraries separate from the rest of your system:

```text
python -m venv venv
```

Then turn it on:

- **Windows:**  
  `venv\Scripts\activate`
- **Mac/Linux:**  
  `source venv/bin/activate`

You should see `(venv)` at the start of the line.

### 4. Install the backend’s dependencies

```text
pip install -r requirements.txt
```

This installs FastAPI, the emotion model libraries (e.g. transformers, torch, opencv), and MongoDB driver. It can take a few minutes the first time.

### 5. Configure MongoDB (and optional settings)

- Copy the example env file:  
  - Copy `backend\.env.example` to `backend\.env`
- Open `backend\.env` in a text editor and set:

  - **MONGODB_URI**  
    - Local: `mongodb://localhost:27017`  
    - Atlas: paste your connection string (e.g. `mongodb+srv://...`)
  - **MONGODB_DB_NAME**  
    - Any name you like, e.g. `emotion_app`
  - **EMOTION_MODEL_PATH** (optional)  
    - Leave as `vit-Facial-Expression-Recognition` or use your notebook’s path.

Save the file.

### 6. Start MongoDB (if it’s on your computer)

- If you use **MongoDB Atlas**, you don’t need to start anything.  
- If you installed **MongoDB locally**, start the MongoDB service (e.g. from Services on Windows, or `mongod` in a separate terminal).

### 7. Run the backend server

From the **backend** folder (with `venv` activated):

```text
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

You should see something like:

```text
INFO:     Uvicorn running on http://0.0.0.0:8000
```

- **Backend is now running.**  
- **API docs (Swagger):** open in browser: **http://localhost:8000/docs**  
- **Health check:** **http://localhost:8000/health**

The first time you call an endpoint that uses the model (e.g. `/analyze-frame`), the model will load; that can take a bit. After that, requests will be faster.

---

## What the Backend Does (Endpoints)

- **GET /** – Simple welcome message.  
- **GET /health** – Check if the server and MongoDB are OK.  
- **POST /analyze-frame** – Send **one image** (e.g. one frame from a video). Backend returns emotions and saves the result in MongoDB.  
- **POST /analyze-video** – Send a **video file**. Backend samples frames, runs emotion detection, and returns a summary + per-frame results, and saves to MongoDB.  
- **GET /analysis/{id}** – Get a previously saved analysis by its id.

Your React Native app will call these URLs (using your computer’s IP and port 8000 when testing from a phone, or `localhost:8000` when testing on the same machine).

---

## If Something Goes Wrong

- **“python not found”** – Install Python and make sure “Add Python to PATH” was checked; or try `py -m venv venv` and `py -m uvicorn ...` on Windows.  
- **“pip not found”** – Run `python -m pip install -r requirements.txt` (or `py -m pip ...` on Windows).  
- **“Could not connect to MongoDB”** – Check that MongoDB is running (local) or that your Atlas URI and network access are correct.  
- **“Model not found”** – Set `EMOTION_MODEL_PATH` in `.env` to the same path or Hugging Face ID you use in your notebook.

---

## Next: Frontend (React Native)

See **FRONTEND_NEXT_STEPS.md** for how to create the React Native app, record/pick videos, send frames or video to this backend, and show results.
