import requests
import os
import math
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GOOGLE_PLACES_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY")

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi, dlam = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

def search_places(lat: float, lon: float, keyword: str, radius: int):
    if not API_KEY:
        print("⚠️ GOOGLE_PLACES_API_KEY not set. No places can be fetched.")
        return []
    
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.location,places.rating,places.priceLevel,places.photos"
    }
    payload = {
        "textQuery": keyword,
        "locationBias": {"circle": {"center": {"latitude": lat, "longitude": lon}, "radius": float(radius)}}
    }

    print(f"📡 Places Request → URL: {url}")
    print(f"   Headers: X-Goog-Api-Key={API_KEY[:8]}...{API_KEY[-4:]} | FieldMask={headers['X-Goog-FieldMask']}")
    print(f"   Payload: {payload}")
    
    try:
        raw = requests.post(url, json=payload, headers=headers)
        response = raw.json()
        print(f"📨 Places Response → status={raw.status_code} | body={response}")
        results = []
        for p in response.get('places', []):
            p_lat = p.get('location', {}).get('latitude')
            p_lon = p.get('location', {}).get('longitude')
            dist = haversine(lat, lon, p_lat, p_lon) if p_lat and p_lon else radius
            
            # Map price level string to number (1-4)
            price_str = p.get('priceLevel', 'PRICE_LEVEL_UNSPECIFIED')
            price_map = {'PRICE_LEVEL_FREE': 0, 'PRICE_LEVEL_INEXPENSIVE': 1, 'PRICE_LEVEL_MODERATE': 2, 'PRICE_LEVEL_EXPENSIVE': 3, 'PRICE_LEVEL_VERY_EXPENSIVE': 4}
            
            results.append({
                "name": p.get('displayName', {}).get('text', 'Unknown'),
                "rating": p.get('rating', 0),
                "price_level": price_map.get(price_str, 2),
                "dist": dist,
                "type": keyword,
                "photos": p.get('photos', []),
                "location": p.get('location', {}),
            })
        return results
    except Exception as e:
        print(f"Places API Error: {e}")
        return []