# Feelio Application - Complete Process Flow

This document explains the entire application flow file-by-file, from user interaction to final response.

---

## 🎯 Overview

**Feelio** is an emotion-aware travel assistant that:
1. Detects user emotions from video selfies
2. Recommends nearby places based on emotion + context (weather, time, step count)
3. Estimates carbon emissions for places
4. Awards eco-points for visiting sustainable locations

---

## 📱 FLOW 1: Emotion Detection & Place Recommendations

### **Step 1: Mobile App - User Initiates Emotion Scan**

**File: `mobile/screens/EmotionScanScreen.jsx`**

1. User opens the Emotion Scan screen
2. User taps "Start Camera" button → `startScanning()` function
3. Requests camera permissions via `ImagePicker.requestCameraPermissionsAsync()`
4. Launches camera with `ImagePicker.launchCameraAsync()` configured for:
   - Video recording only (`mediaTypes: ['videos']`)
   - Max duration: 10 seconds
   - Medium quality
5. Video URI is stored in state: `setVideoUri(result.assets[0].uri)`
6. User taps "REVEAL MY VIBE" button → `analyse()` function

---

### **Step 2: Mobile App - Sends Video to Backend**

**File: `mobile/api.js` → `mlApi.analyzeEmotionVideo()`**

1. Creates FormData with video file:
   ```javascript
   formData.append('video', {
     uri: videoUri,
     type: mimeType,  // 'video/mp4' or 'video/quicktime'
     name: 'scan.mp4'
   })
   ```
2. Sends POST request to backend:
   ```
   POST ${API_URL}/pipeline/analyze-emotion
   Headers: Authorization: Bearer <token>
   Body: multipart/form-data with video file
   ```

---

### **Step 3: Backend - Receives Video & Forwards to ML API**

**File: `backend/src/routes/pipeline.js`**

1. **Route Handler**: `POST /api/pipeline/analyze-emotion`
   - Protected by `authMiddleware` (validates JWT token)
   - Uses `multer` middleware to handle file upload (max 100MB)
   - Extracts video from `req.file.buffer`

2. **Forwards to ML API**:
   ```javascript
   POST ${ML_API_URL}/api/emotion/analyze-video?full=true
   ```
   - ML_API_URL defaults to `http://127.0.0.1:8003`
   - Creates FormData with video buffer
   - Sets timeout: 120 seconds (video processing can take time)
   - Returns response directly to mobile app

---

### **Step 4: ML API - Processes Video Frame-by-Frame**

**File: `ml-api/main.py` → `/api/emotion/analyze-video` endpoint**

1. **Receives video file** via FastAPI `UploadFile`
2. **Validates** content type is video (mp4/mov/webm)
3. **Saves to temp file** (temporary file on disk)
4. **Calls emotion service**: `get_emotion_service(EMOTION_MODEL_PATH).process_video(tmp_path)`

---

### **Step 5: Emotion Service - Deep Learning Analysis**

**File: `ml-api/emotion_service.py` → `EmotionService.process_video()`**

1. **Opens video** with OpenCV: `cv2.VideoCapture(video_path)`
2. **Processes EVERY frame** (no skipping):
   - Reads frame from video
   - Detects face using Haar Cascade (`haarcascade_frontalface_default.xml`)
   - Crops and resizes face to 640x640
   - Converts to PIL Image
   - Runs through Vision Transformer (ViT) model:
     - Model loaded from `EMOTION_MODEL_PATH` (configured in `config.py`)
     - Uses HuggingFace transformers library
     - Outputs emotion probabilities: happy, sad, angry, fear, neutral, surprise, disgust

3. **Applies 5-frame sliding window smoothing**:
   - Maintains deque of last 5 frames' emotion scores
   - Averages scores within window for each frame
   - Reduces noise from individual frame predictions

4. **Calculates final emotion**:
   - Averages all smoothed frame scores across entire video
   - Applies emotion weights (anger: 3.1x, neutral: 0.4x, etc.) to rebalance
   - Returns dominant emotion + full breakdown

5. **Returns**:
   ```python
   {
     "emotion": "happy",           # Dominant emotion
     "percent": 45.23,              # Confidence percentage
     "average_emotions": {...},     # Full breakdown
     "frames_analyzed": 150,
     "total_frames": 150
   }
   ```

6. **Cleanup**: Deletes temporary video file

---

### **Step 6: Response Flows Back to Mobile**

**Path**: ML API → Backend → Mobile App

1. ML API returns JSON response
2. Backend (`pipeline.js`) forwards response unchanged
3. Mobile app (`EmotionScanScreen.jsx`) receives result:
   ```javascript
   setEmotion(result.emotion);      // e.g., "happy"
   setPercent(result.percent);      // e.g., 45.23
   setAllEmotions(result.average_emotions);
   ```
4. UI displays emotion with emoji and percentage
5. "EXPLORE PLACES" button appears → navigates to PlacesScreen

---

### **Step 7: Mobile App - Requests Place Recommendations**

**File: `mobile/screens/PlacesScreen.jsx`**

1. **On mount** (`useEffect`), calls `fetchPlaces()`
2. **Gets user location**:
   - Requests location permission
   - Gets current GPS coordinates via `expo-location`
3. **Sends request to backend**:
   ```javascript
   GET /api/places/nearby?lat=${lat}&lng=${lng}&emotion=${emotion}
   ```
   - Emotion comes from navigation params (from EmotionScanScreen)

---

### **Step 8: Backend - Processes Place Recommendation Request**

**File: `backend/src/routes/places.js` → `GET /api/places/nearby`**

1. **Extracts query parameters**:
   - `lat`, `lng` (required)
   - `emotion` (defaults to 'neutral')
   - `step_count` (optional, defaults to 0)
   - `local_time_hour` (optional, defaults to current hour)

2. **Calls Hybrid AI Recommender** (Python ML API):
   ```javascript
   POST ${ML_API_URL}/api/v1/recommend
   Body: {
     emotion: "happy",
     step_count: 5000,
     lat: 40.7128,
     lon: -74.0060,
     local_time_hour: 14,
     price_sensitivity: 1.0
   }
   ```

---

### **Step 9: ML API - Hybrid AI Recommendation Engine**

**File: `ml-api/main.py` → `/api/v1/recommend` endpoint**

1. **Receives request** via Pydantic model `RecommenderRequest`
2. **Gets live weather data**:
   ```python
   temp, precip, clouds = weather_service.get_live_weather(req.lat, req.lon)
   ```
   - **File**: `ml-api/services/weather.py`
   - Calls OpenWeatherMap API
   - Returns: temperature (°C), precipitation (mm), cloud cover (%)

3. **Calls Hybrid Recommender Engine**:
   ```python
   top_categories = recommender_engine.get_top_categories(
     req.local_time_hour, temp, precip, clouds, 
     req.emotion, req.step_count, top_n=3
   )
   ```

---

### **Step 10: Hybrid Recommender - Multi-Phase AI Logic**

**File: `ml-api/hybrid_engine.py` → `HybridRecommender.get_top_categories()`**

#### **Phase 1: ML Context Prediction**
- Loads Random Forest model (`models/context_brain.pkl`)
- Inputs: hour, temperature, precipitation, cloud cover
- Predicts top 5 logical venue categories based purely on environmental context
- Example: "It's 2pm, sunny, 25°C" → predicts: ["park", "cafe", "restaurant", "museum", "beach"]

#### **Phase 2: WESAD Fatigue Modifier**
- Calculates fatigue factor from step count:
  ```python
  fatigue_factor = min(1.0, step_count / 15000.0)
  ```
- 15,000+ steps = maximum fatigue (1.0)
- Used later to penalize high-arousal places when user is tired

#### **Phase 3: Psychological Expert System**
- Loads venue emotion signatures from CSV (`data/venue_6emotions_lookup.csv`)
- Each venue type has emotional profile (e.g., "park" → high joy, low anger)
- Applies mood regulation matrix:
  - **If user is SAD**: Rewards venues with high joy (+1.0), penalizes fear/anger (-1.0)
  - **If user is ANGRY**: Rewards joy (+1.0), penalizes disgust (-1.5)
  - **If user is FEAR**: Heavily penalizes fear venues (-2.0), rewards joy (+1.0)
  - Similar rules for all 6 emotions

- **Calculates emotional match score** for each venue:
  ```python
  match_score = sum(venue_emotion[emo] * mood_weight[emo] for emo in emotions)
  ```

- **Applies fatigue penalty**:
  ```python
  arousal_level = venue_emotion["emo_anger"] + venue_emotion["emo_surprise"]
  fatigue_penalty = fatigue_factor * arousal_level * 2.0
  final_score = match_score - fatigue_penalty
  ```

- **Sorts venues** by final hybrid score (highest to lowest)
- **Returns top 3 categories** (e.g., ["park", "cafe", "museum"])

---

### **Step 11: ML API - Searches Google Places**

**File: `ml-api/main.py` → continues `/api/v1/recommend`**

1. **For each category** from hybrid engine:
   ```python
   places = places_service.search_places(req.lat, req.lon, category, SEARCH_RADIUS)
   ```
   - **File**: `ml-api/services/places.py`
   - Calls Google Places API (New v1): `POST /places:searchText`
   - Uses text query (e.g., "park near me")
   - Location bias: 10km radius circle
   - Filters: minimum 10 user ratings (quality threshold)

2. **Collects all candidates** from all categories
3. **Removes duplicates** by name
4. **Ranks by quality**: `rating × min(user_rating_count, 500)`
5. **Returns top 5 places**:
   ```python
   {
     "diagnostics": {
       "weather": {"temp": 25, "precipitation": 0, "clouds": 10},
       "logic": {"selected_categories": ["park", "cafe", "museum"]}
     },
     "recommendations": [
       {
         "name": "Central Park",
         "rating": 4.8,
         "user_rating_count": 1500,
         "location": {"latitude": 40.7829, "longitude": -73.9654},
         "photos": [...],
         ...
       },
       ...
     ]
   }
   ```

---

### **Step 12: Backend - Formats Response for Mobile**

**File: `backend/src/routes/places.js` → continues `GET /api/places/nearby`**

1. **Maps AI recommendations** to mobile-friendly format:
   - Extracts place details (name, address, rating, location)
   - **Generates photo URLs**:
     - Primary: Google Street View Static API (exterior images)
     - Fallback: Places API photo endpoint
   - Adds `vfm_score` (value-for-mood score) if present
   - Sets `emission: null` (will be fetched later)

2. **Returns JSON**:
   ```javascript
   {
     emotion: "happy",
     diagnostics: {...},
     places: [
       {
         placeId: "...",
         name: "Central Park",
         address: "...",
         rating: 4.8,
         photoUrl: "https://maps.googleapis.com/...",
         emission: null,
         vfm_score: 0.85
       },
       ...
     ]
   }
   ```

---

### **Step 13: Mobile App - Displays Places**

**File: `mobile/screens/PlacesScreen.jsx`**

1. **Receives places array** from API
2. **Renders FlatList** with place cards:
   - Shows place photo (from `photoUrl`)
   - Displays name, address, rating
   - Shows eco-badge (simulated 60-100% green score)
   - Shows place type tag
3. **User taps a place** → navigates to `PlaceDetailScreen`

---

## 🌍 FLOW 2: Carbon Emission Estimation

### **Step 1: Mobile App - User Views Place Detail**

**File: `mobile/screens/PlaceDetailScreen.jsx`**

1. **On mount** (`useEffect`), automatically fetches emission data:
   ```javascript
   POST /api/places/emission
   Body: {
     photoName: place.photoName,  // Google Places photo reference
     photoUrl: place.photoUrl      // Direct URL (Street View)
   }
   ```

---

### **Step 2: Backend - Forwards Emission Request**

**File: `backend/src/routes/places.js` → `POST /api/places/emission`**

1. **Builds image URL**:
   - Uses `photoUrl` if provided directly
   - Otherwise constructs from `photoName`: `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${GOOGLE_KEY}`

2. **Forwards to ML API**:
   ```javascript
   POST ${ML_API_URL}/api/emission/predict-url
   Body: application/x-www-form-urlencoded
   {
     url: <image_url>,
     model: "base"  // or "intel"
   }
   ```

---

### **Step 3: ML API - Emission Estimation**

**File: `ml-api/main.py` → `/api/emission/predict-url` endpoint**

1. **Receives image URL** and model type
2. **Calls emission service**:
   ```python
   svc = get_emission_service(ckpt, PLACES365_CATEGORIES_PATH, use_intel=use_intel)
   return await svc.predict_url(url)
   ```

---

### **Step 4: Emission Service - Deep Learning Analysis**

**File: `ml-api/emission_service.py` → `EmissionService.predict_url()`**

1. **Fetches image** from URL using `httpx`
2. **Runs MultiTaskResNet50 model**:
   - **Scene Classification**: Identifies scene type (365 Places365 categories)
     - Examples: "forest", "airport", "restaurant", "park"
   - **Attributes**: Binary classification (Indoor, Crowded, Bright_Lights, High_Tech_Equipment)
   - **Raw Emission**: 5-tier classification (very_low, low, medium, high, very_high)

3. **Scene-Calibrated Blending** (critical correction):
   - **Problem**: Raw emission head tends to collapse to "medium" due to training imbalance
   - **Solution**: Uses scene classification to derive emission prior
   - **Keyword Matching**: Maps scene labels to emission tiers:
     - "forest", "beach", "mountain" → very_low
     - "airport", "stadium", "mall" → high
     - "restaurant", "cafe", "office" → medium
   - **Blending**: `final = (1 - 0.75) × model_output + 0.75 × scene_prior`
   - Result: Accurate differentiation (forests = very_low, airports = high)

4. **Calculates CO₂ estimate**:
   ```python
   co2_kg_year = sum(probability × tier_co2 for each tier)
   ```
   - very_low: 50 kg CO₂/year
   - low: 250 kg CO₂/year
   - medium: 1,000 kg CO₂/year
   - high: 5,000 kg CO₂/year
   - very_high: 15,000 kg CO₂/year

5. **Returns**:
   ```python
   {
     "scenes": [
       {"label": "park", "confidence": 0.85, "rank": 1},
       ...
     ],
     "attributes": [
       {"name": "Indoor", "probability": 0.2},
       {"name": "Crowded", "probability": 0.4},
       ...
     ],
     "emission": {
       "label": "very_low",
       "confidence": 0.92,
       "distribution": {"very_low": 0.92, "low": 0.05, ...},
       "co2_kg_year": 75.5,
       "calibration": "scene_blended"
     },
     "model_used": "base"
   }
   ```

---

### **Step 5: Response Flows Back**

**Path**: ML API → Backend → Mobile App

1. ML API returns emission analysis
2. Backend forwards unchanged
3. Mobile app displays:
   - Emission tier badge (very_low = green, very_high = red)
   - CO₂ estimate in kg/year
   - Scene classification
   - Attributes

---

## 🎁 FLOW 3: Eco-Points Award System

### **Step 1: User Visits Place**

**File: `mobile/screens/PlaceDetailScreen.jsx`**

1. User taps "CHECK IN" button → `handleVisit()`
2. **Sends request**:
   ```javascript
   POST /api/points/award
   Body: {
     placeId: "...",
     placeName: "Central Park",
     placeAddress: "...",
     emissionLevel: "very_low"
   }
   ```

---

### **Step 2: Backend - Awards Points**

**File: `backend/src/routes/points.js`** (inferred from context)

1. Validates user authentication
2. Calculates points based on emission level:
   - very_low: Highest points (e.g., 50)
   - low: High points (e.g., 30)
   - medium: Medium points (e.g., 15)
   - high: Low points (e.g., 5)
   - very_high: No points or penalty
3. Updates user's point balance in database
4. Records transaction history
5. Returns success message with points earned

---

### **Step 3: Mobile App - Displays Success**

**File: `mobile/screens/PlaceDetailScreen.jsx`**

1. Shows alert: "🌱 Points Earned! You gained 50 eco-points!"
2. Option to navigate to Points screen to view portfolio

---

## 🔧 Supporting Infrastructure

### **Backend Server Entry Point**

**File: `backend/src/index.js`**

1. Loads environment variables (`dotenv`)
2. Connects to MongoDB (`connectDB()`)
3. Sets up Express app with CORS
4. Registers routes:
   - `/api/auth` → Authentication (login, signup)
   - `/api/pipeline` → Emotion analysis pipeline
   - `/api/places` → Place recommendations & emission
   - `/api/points` → Eco-points system
   - `/api/donations` → Stripe integration
5. Starts server on port 3000 (or `process.env.PORT`)

---

### **ML API Server Entry Point**

**File: `ml-api/main.py`**

1. Creates FastAPI app with CORS middleware
2. Registers endpoints:
   - `/api/emotion/analyze-frame` → Single image emotion
   - `/api/emotion/analyze-video` → Video emotion (5-frame smoothing)
   - `/api/emission/predict` → Upload image for emission
   - `/api/emission/predict-url` → URL-based emission
   - `/api/v1/recommend` → Hybrid AI place recommendations
   - `/health` → Liveness probe
3. Initializes `HybridRecommender` singleton (loads models once)
4. Runs on port 8003 (or `ML_API_PORT`)

---

### **Configuration**

**File: `ml-api/config.py`**

- Defines all model paths (emotion, emission, context brain)
- Loads from environment variables with fallback defaults
- Configures server host/port

---

## 🔄 Complete User Journey Summary

1. **User opens app** → `App.js` → Navigation setup → `DashboardScreen`
2. **User taps "Scan Emotion"** → `EmotionScanScreen`
3. **Records 10-second video** → Mobile app
4. **Sends video** → Backend (`pipeline.js`) → ML API (`emotion_service.py`)
5. **Gets emotion** → "happy" (45%)
6. **Taps "Explore Places"** → `PlacesScreen`
7. **Gets location** → GPS coordinates
8. **Requests recommendations** → Backend (`places.js`) → ML API (`hybrid_engine.py`)
9. **AI analyzes**:
   - Weather (25°C, sunny)
   - Time (2pm)
   - Steps (5,000)
   - Emotion (happy)
   - → Recommends: ["park", "cafe", "museum"]
10. **Searches Google Places** → Finds 5 top-rated places
11. **Displays places** → User sees cards with photos, ratings
12. **Taps place** → `PlaceDetailScreen`
13. **Fetches emission** → ML API (`emission_service.py`)
14. **Gets result** → "very_low" emission, 75 kg CO₂/year
15. **Checks in** → Awards 50 eco-points
16. **Views portfolio** → `PointsScreen` shows total points

---

## 🎯 Key Technologies

- **Mobile**: React Native (Expo)
- **Backend**: Node.js (Express)
- **ML API**: Python (FastAPI)
- **Emotion Model**: Vision Transformer (ViT) via HuggingFace
- **Emission Model**: MultiTaskResNet50 (PyTorch)
- **Recommendation**: Hybrid AI (Random Forest + Fuzzy Logic + Expert System)
- **Places**: Google Places API (New v1)
- **Weather**: OpenWeatherMap API
- **Database**: MongoDB
- **Authentication**: JWT tokens

---

## 📊 Data Flow Diagram

```
Mobile App
    ↓ (video)
Backend (Express)
    ↓ (video)
ML API (FastAPI)
    ↓ (process video)
EmotionService (ViT)
    ↓ (emotion: "happy")
Mobile App
    ↓ (GET /places/nearby?emotion=happy&lat=...&lng=...)
Backend
    ↓ (POST /api/v1/recommend)
ML API
    ↓ (get weather)
WeatherService (OpenWeatherMap)
    ↓ (temp, precip, clouds)
HybridRecommender
    ↓ (ML + Psychology + Fatigue)
    → Random Forest (context)
    → Venue Emotions CSV
    → Mood Regulation Matrix
    ↓ (categories: ["park", "cafe"])
PlacesService (Google Places API)
    ↓ (5 places)
Backend
    ↓ (formatted JSON)
Mobile App
    ↓ (user taps place)
PlaceDetailScreen
    ↓ (POST /places/emission)
Backend
    ↓ (POST /api/emission/predict-url)
ML API
    ↓ (fetch image)
EmissionService (ResNet50)
    ↓ (scene + emission)
Mobile App (displays emission tier)
    ↓ (user checks in)
Backend (awards points)
Mobile App (shows success)
```

---

This completes the entire flow! Each component works together to create an intelligent, emotion-aware travel recommendation system with sustainability tracking.
