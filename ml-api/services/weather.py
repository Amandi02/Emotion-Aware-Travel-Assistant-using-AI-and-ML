import requests
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("OPENWEATHER_API_KEY")

def get_live_weather(lat: float, lon: float):
    """Fetches real-time weather and formats it for the ML model."""
    if not API_KEY:
        print("⚠️ No Weather API Key. Returning default clear weather.")
        return 25.0, 0.0, 10 # Default: 25C, 0mm rain, 10% clouds

    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
        response = requests.get(url).json()
        
        # 1. Temperature (Celsius)
        temp = response['main']['temp']
        
        # 2. Cloud Cover (Percentage)
        clouds = response['clouds']['all']
        
        # 3. Precipitation (mm in the last 1hr)
        # OpenWeather sometimes omits the 'rain' key if it's not raining
        precip = 0.0
        if 'rain' in response and '1h' in response['rain']:
            precip = response['rain']['1h']
            
        return temp, precip, clouds
        
    except Exception as e:
        print(f"🌦️ Weather API Error: {e}")
        return 25.0, 0.0, 10 # Safe fallback