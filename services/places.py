import requests
import os
import math
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
# UPDATED: Using the V1 "New" API Endpoint
BASE_URL = "https://places.googleapis.com/v1/places:searchText"

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance (in meters) between two GPS points.
    """
    R = 6371000  # Radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2)**2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c

def search_places(lat: float, lon: float, keyword: str, radius: int):
    """
    Fetches places using the Google Places API (New).
    """
    if not API_KEY:
        print("❌ DEBUG: No Google API Key found in .env")
        return []

    # 1. SETUP HEADERS (Required for New API)
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        # We must specify exactly which fields we want to reduce cost & latency
        "X-Goog-FieldMask": "places.displayName,places.location,places.rating,places.priceLevel"
    }

    # 2. SETUP BODY (JSON Request)
    payload = {
        "textQuery": keyword,
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": lat,
                    "longitude": lon
                },
                "radius": float(radius)
            }
        }
    }

    print(f"🔎 DEBUG: Searching Google (New API) for '{keyword}' at {lat},{lon}...")

    try:
        # Note: The New API uses POST, not GET
        response = requests.post(BASE_URL, json=payload, headers=headers)
        data = response.json()
        
        # --- DEBUGGING ---
        if response.status_code != 200:
            print(f"❌ GOOGLE API ERROR: {response.status_code}")
            print(f"⚠️ Details: {data}")
            return []
            
        results = data.get('places', [])
        print(f"✅ DEBUG: Google found {len(results)} raw results.")
        
        cleaned_places = []
        for place in results:
            # Extract Location
            loc = place.get('location', {})
            place_lat = loc.get('latitude')
            place_lng = loc.get('longitude')
            
            # Extract Name (It's an object in New API)
            name_obj = place.get('displayName', {})
            name_text = name_obj.get('text', 'Unknown')

            # Calculate Distance
            dist_meters = 0
            if place_lat and place_lng:
                dist_meters = haversine_distance(lat, lon, place_lat, place_lng)
            
            # Price Level mapping (New API uses strings like "PRICE_LEVEL_INEXPENSIVE")
            # We map strings to 1-4 integers for your algorithm
            price_enum = place.get('priceLevel', 'PRICE_LEVEL_UNSPECIFIED')
            price_map = {
                'PRICE_LEVEL_UNSPECIFIED': 2,
                'PRICE_LEVEL_FREE': 0,
                'PRICE_LEVEL_INEXPENSIVE': 1,
                'PRICE_LEVEL_MODERATE': 2,
                'PRICE_LEVEL_EXPENSIVE': 3,
                'PRICE_LEVEL_VERY_EXPENSIVE': 4
            }
            price_int = price_map.get(price_enum, 2)

            cleaned_places.append({
                "name": name_text,
                "rating": place.get('rating', 0),
                "price_level": price_int,
                "dist": dist_meters,
                "type": keyword
            })
            
        return cleaned_places

    except Exception as e:
        print(f"❌ CRITICAL ERROR fetching places: {e}")
        return []