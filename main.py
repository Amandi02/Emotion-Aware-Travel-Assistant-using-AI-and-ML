from fastapi import FastAPI
from models.schemas import FusionRequest
from core.logic import determine_user_state, calculate_vfm_score

app = FastAPI(title="Fusion Engine Backend")

@app.post("/recommend")
def recommend_places(data: FusionRequest):
    
    # 1. FUSE SIGNALS (Logic Layer)
    intent, calculated_d0 = determine_user_state(
        data.emotion, 
        data.step_count, 
        data.local_time_hour
    )

    # 2. MOCK GOOGLE SEARCH (Replace with Real API later)
    # Simulating results found near the user
    candidates = [
        {"name": "Cozy Cafe",     "rating": 4.5, "dist": 200,  "type": "cafe"},
        {"name": "Distant Park",  "rating": 4.9, "dist": 2200, "type": "park"},
        {"name": "City Mall",     "rating": 4.2, "dist": 800,  "type": "mall"},
        {"name": "Quick Mart",    "rating": 3.8, "dist": 100,  "type": "shop"},
    ]

    # 3. RANKING (VFM Algorithm)
    results = []
    for place in candidates:
        score, decay = calculate_vfm_score(place, calculated_d0, data.price_sensitivity)
        results.append({
            "name": place['name'],
            "final_score": round(score, 2),
            "distance": place['dist'],
            "decay_factor": round(decay, 2)
        })

    # Sort by Score (High to Low)
    results.sort(key=lambda x: x['final_score'], reverse=True)

    return {
        "user_context": {
            "fused_intent": intent,
            "calculated_radius": calculated_d0,
            "fatigue_override": data.step_count > 10000
        },
        "recommendations": results
    }