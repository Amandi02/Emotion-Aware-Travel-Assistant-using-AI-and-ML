import requests
import os
import math
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
BASE_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

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
    Fetches places from Google Maps and calculates real distance.
    """
    if not API_KEY:
        print("⚠️ No Google Key found. Returning empty list.")
        return []

    params = {
        "location": f"{lat},{lon}",
        "radius": radius,
        "keyword": keyword,
        "key": API_KEY
    }

    try:
        response = requests.get(BASE_URL, params=params)
        data = response.json()
        results = data.get('results', [])
        
        cleaned_places = []
        for place in results:
            # 1. Get Coordinates of the venue
            place_lat = place['geometry']['location']['lat']
            place_lng = place['geometry']['location']['lng']
            
            # 2. Calculate Distance from User
            dist_meters = haversine_distance(lat, lon, place_lat, place_lng)
            
            # 3. Extract other details
            cleaned_places.append({
                "name": place.get('name'),
                "rating": place.get('rating', 0), # Default to 0 if no rating
                "price_level": place.get('price_level', 2), # Default to Moderate (2)
                "dist": dist_meters,
                "type": keyword
            })
            
        return cleaned_places

    except Exception as e:
        print(f"Error fetching places: {e}")
        return []