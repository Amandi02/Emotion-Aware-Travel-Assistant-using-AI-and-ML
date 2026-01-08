from pydantic import BaseModel

class FusionRequest(BaseModel):
    # --- INPUT A: From Teammate (AI Vision) ---
    emotion: str            # e.g., "Happy", "Sad"

    # --- INPUT B: From Phone Sensors ---
    lat: float              # GPS Latitude
    lon: float              # GPS Longitude
    step_count: int         # Fatigue Indicator
    local_time_hour: int    # e.g., 23 for 11 PM

    # --- INPUT C: User Preferences (Adaptive Learning) ---
    price_sensitivity: float = 1.0
    distance_tolerance: float = 1.0