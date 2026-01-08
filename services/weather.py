import requests
import os
from dotenv import load_dotenv

load_dotenv() # Load keys from .env

API_KEY = os.getenv("OPENWEATHER_API_KEY")
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

def get_current_weather(lat: float, lon: float):
    """
    Returns a simple weather condition string (e.g., 'Rainy', 'Clear').
    """
    if not API_KEY:
        print("⚠️ No Weather Key found. Returning default.")
        return "Clear"

    params = {
        "lat": lat,
        "lon": lon,
        "appid": API_KEY,
        "units": "metric"
    }
    
    try:
        response = requests.get(BASE_URL, params=params)
        data = response.json()
        
        # OpenWeatherMap returns a list of weather conditions
        # Main types: Rain, Drizzle, Thunderstorm, Snow, Clear, Clouds
        condition_main = data['weather'][0]['main']
        
        if condition_main in ["Rain", "Drizzle", "Thunderstorm", "Snow"]:
            return "Rainy"
        return "Clear"
        
    except Exception as e:
        print(f"Error fetching weather: {e}")
        return "Clear" # Fallback