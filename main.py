from fastapi import FastAPI
from models.schemas import FusionRequest
from core.logic import determine_user_state, calculate_vfm_score
import services.weather as weather_service
import services.places as places_service

app = FastAPI(title="Fusion Engine Backend (Live)")

@app.post("/recommend")
def recommend_places(data: FusionRequest):
    
    print(f"📥 RECEIVED REQUEST: Emotion={data.emotion}, Lat={data.lat}, Lon={data.lon}")

    # --- 1. LIVE CONTEXT CHECK ---
    # Fetch real weather condition for the user's location
    real_weather = weather_service.get_current_weather(data.lat, data.lon)
    print(f"🌤️ LIVE WEATHER: {real_weather}")
    
    # --- 2. FUSE SIGNALS (Logic Layer) ---
    intent, calculated_d0 = determine_user_state(
        data.emotion, 
        data.step_count, 
        data.local_time_hour
    )
    
    # --- KEYWORD MAPPING (Critical Fix) ---
    # We must translate "Thesis Intent" -> "Google Maps Keyword"
    google_keyword = "restaurant" # default

    # Base Logic
    if "Exploration" in intent:
        google_keyword = "tourist_attraction"
    elif "Comfort" in intent:
        google_keyword = "cafe"
    elif "Safety" in intent:
        google_keyword = "hotel"
    elif "Relief" in intent:
        google_keyword = "bar"
    elif "Shopping" in intent:
        google_keyword = "shopping_mall"

    # Weather Override Logic
    if real_weather == "Rainy":
        intent = f"Indoor {intent}"
        calculated_d0 = int(calculated_d0 * 0.7) # Reduce radius
        
        # Force indoor keywords
        if "Exploration" in intent:
            google_keyword = "museum"
        elif "Comfort" in intent:
            google_keyword = "coffee_shop"

    print(f"🧠 FUSION LOGIC: Intent='{intent}' -> Keyword='{google_keyword}' (Radius: {calculated_d0}m)")

    # --- 3. LIVE GOOGLE SEARCH ---
    # We search with a slightly larger radius to give the VFM algo options to rank
    search_radius = calculated_d0 + 500 
    
    candidates = places_service.search_places(
        data.lat, 
        data.lon, 
        keyword=google_keyword, 
        radius=search_radius
    )

    # --- 4. RANKING (VFM Algorithm) ---
    results = []
    for place in candidates:
        score, decay = calculate_vfm_score(place, calculated_d0, data.price_sensitivity)
        results.append({
            "name": place['name'],
            "final_score": round(score, 2),
            "distance_meters": int(place['dist']),
            "rating": place['rating'],
            "decay_factor": round(decay, 2)
        })

    # Sort by Score (High to Low)
    results.sort(key=lambda x: x['final_score'], reverse=True)

    # Return top 10
    return {
        "user_context": {
            "detected_weather": real_weather,
            "fused_intent": intent,
            "calculated_radius": calculated_d0,
            "fatigue_override": data.step_count > 10000
        },
        "recommendations": results[:10] 
    }