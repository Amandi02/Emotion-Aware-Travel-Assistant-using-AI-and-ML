import numpy as np

def determine_user_state(emotion, step_count, time_hour):
    """
    Fuses Emotion + Physical Fatigue + Time into a single Intent.
    """
    # 1. NORMALIZE FATIGUE
    # Thesis Logic: If steps > 10k, physical fatigue overrides facial expression.
    is_tired = step_count > 10000

    # 2. BASE MAPPING
    intent = "General"
    d0 = 1000 # Default Radius (meters)

    if emotion.lower() == "happy":
        intent = "Exploration"
        d0 = 2500
    elif emotion.lower() == "sad":
        intent = "Comfort"
        d0 = 500
    elif emotion.lower() == "fear":
        intent = "Safety"
        d0 = 200

    # 3. FUSION OVERRIDES (The "Smart" Part)
    
    # Override A: Fatigue
    if is_tired:
        intent = f"Relaxing {intent}"
        d0 = d0 * 0.5 # Cut radius in half if tired
    
    # Override B: Late Night Safety
    if time_hour >= 22:
        intent = f"Late Night {intent}"
        d0 = min(d0, 400) # Force close proximity at night

    return intent, int(d0)

def calculate_vfm_score(place, d0, price_weight):
    """
    Thesis Equation: VFM = (Quality / Price) * Decay(Distance)
    """
    # 1. Distance Decay (The Emotion Component)
    # decay = e^(-distance / D0)
    decay = np.exp(-place['dist'] / d0)
    
    # 2. Quality Score (Normalized)
    qs = place['rating'] / 5.0
    
    # 3. Final Score
    # We multiply by price_weight (Feedback Loop)
    score = (qs * decay * 10) * price_weight
    
    return score, decay