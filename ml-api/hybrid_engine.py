import pandas as pd
import numpy as np
import joblib
import os
import skfuzzy as fuzz
from skfuzzy import control as ctrl

class HybridRecommender:
    def __init__(self):
        print("🧠 Initializing Hybrid Neuro-Symbolic AI...")
        
        # 1. Load the ML Context Model (Random Forest)
        try:
            self.model = joblib.load("models/context_brain.pkl")
            self.le_cat = joblib.load("models/le_category.pkl")
            print(" ✅ ML Models loaded successfully.")
        except FileNotFoundError:
            print(" ❌ Error: context_brain.pkl or le_category.pkl not found!")

        # 2. Dynamically Load Venue Emotions from your Phase 2 CSV
        try:
            df_emotions = pd.read_csv("data/venue_6emotions_lookup.csv")
            # Clean category strings to ensure matching
            df_emotions['Category'] = df_emotions['Category'].astype(str).str.lower().str.strip()
            # Convert to a dictionary for O(1) fast lookups during live API requests
            self.venue_emotions = df_emotions.set_index('Category').to_dict('index')
            print(f" ✅ Loaded emotional signatures for {len(self.venue_emotions)} venue types.")
        except FileNotFoundError:
            print(" ❌ Error: venue_6emotions_lookup.csv not found!")
            self.venue_emotions = {}

        # 3. The Psychological Rules (Mood Regulation Matrix)
        # Weights range from -2.0 (Heavy Penalty) to +2.0 (Heavy Reward)
        self.mood_weights = {
            "sadness":  {"emo_joy": 1.0, "emo_sadness": 0.5, "emo_fear": -1.0, "emo_surprise": -1.0, "emo_anger": -1.0, "emo_disgust": -0.5},
            "joy":      {"emo_joy": 1.0, "emo_surprise": 0.8, "emo_sadness": -1.0, "emo_anger": -1.0, "emo_fear": -0.5, "emo_disgust": -1.0},
            "anger":    {"emo_joy": 1.0, "emo_anger": 0.8, "emo_disgust": -1.5, "emo_sadness": -0.5, "emo_fear": -0.5, "emo_surprise": 0.0},
            "fear":     {"emo_joy": 1.0, "emo_fear": -2.0, "emo_surprise": -1.5, "emo_anger": -1.0, "emo_sadness": 0.0, "emo_disgust": -0.5},
            "disgust":  {"emo_joy": 1.2, "emo_disgust": -2.0, "emo_anger": -0.5, "emo_fear": -0.5, "emo_sadness": 0.0, "emo_surprise": 0.0},
            "surprise": {"emo_surprise": 1.5, "emo_joy": 1.0, "emo_sadness": -1.0, "emo_fear": -0.5, "emo_anger": 0.0, "emo_disgust": 0.0}
        }

        # ... (Keep your ML loading and mood_weights code here) ...

        # 4. Initialize WESAD Fuzzy Logic System for Radius
        print(" ⚙️ Initializing Fuzzy Inference System for Fatigue...")
        
        # Antecedent (Input): Steps from 0 to 20,000
        self.step_input = ctrl.Antecedent(np.arange(0, 20001, 1), 'steps')
        
        # Consequent (Output): Radius from 100m to 3000m
        self.radius_output = ctrl.Consequent(np.arange(100, 3001, 1), 'radius')

        # Membership Functions for Steps (Fatigue)
        self.step_input['low'] = fuzz.trimf(self.step_input.universe, [0, 0, 8000])
        self.step_input['moderate'] = fuzz.trimf(self.step_input.universe, [5000, 10000, 15000])
        self.step_input['high'] = fuzz.trimf(self.step_input.universe, [12000, 20000, 20000])

        # Membership Functions for Radius (Distance)
        self.radius_output['short'] = fuzz.trimf(self.radius_output.universe, [100, 100, 1000])
        self.radius_output['medium'] = fuzz.trimf(self.radius_output.universe, [500, 1500, 2500])
        self.radius_output['long'] = fuzz.trimf(self.radius_output.universe, [2000, 3000, 3000])

        # The WESAD Biological Rules
        rule1 = ctrl.Rule(self.step_input['high'], self.radius_output['short'])
        rule2 = ctrl.Rule(self.step_input['moderate'], self.radius_output['medium'])
        rule3 = ctrl.Rule(self.step_input['low'], self.radius_output['long'])

        # Build the Simulator
        self.radius_ctrl = ctrl.ControlSystem([rule1, rule2, rule3])
        self.radius_sim = ctrl.ControlSystemSimulation(self.radius_ctrl)

    def get_top_categories(self, hour, temp, precip, cloud, user_emotion, step_count, top_n=3):
        user_emotion = user_emotion.lower().strip()
        
        # --- PHASE 1: ML CONTEXT PREDICTION ---
        # Ask the Random Forest for the top 5 logical places based purely on environment
        X_input = pd.DataFrame([[hour, temp, precip, cloud]], 
                               columns=['Hour', 'Temperature_C', 'Precipitation_mm', 'Cloud_Cover_pct'])
        
        probs = self.model.predict_proba(X_input)[0]
        top_indices = np.argsort(probs)[::-1][:5]
        ml_candidates = self.le_cat.inverse_transform(top_indices)
        
        # --- PHASE 2: WESAD FATIGUE MODIFIER ---
        # Normalize steps. 15,000+ steps = 1.0 (Max Fatigue)
        fatigue_factor = min(1.0, step_count / 15000.0) 

        # --- PHASE 3: PSYCHOLOGICAL EXPERT SYSTEM ---
        scored_candidates = []
        weights = self.mood_weights.get(user_emotion, self.mood_weights["joy"]) # Fallback to joy if input is weird

        for venue in ml_candidates:
            venue_clean = str(venue).lower().strip()
            v_emo = self.venue_emotions.get(venue_clean)
            
            if not v_emo:
                # If we don't have Yelp data for it, give it a neutral score
                scored_candidates.append((venue_clean, 0.0))
                continue
                
            # Calculate Emotional Match Score
            match_score = 0.0
            for emo, weight in weights.items():
                match_score += (v_emo.get(emo, 0.0) * weight)
                
            # Apply Fatigue Penalty (Penalize high arousal places if the user is exhausted)
            arousal_level = v_emo.get("emo_anger", 0.0) + v_emo.get("emo_surprise", 0.0)
            fatigue_penalty = fatigue_factor * arousal_level * 2.0 
            
            final_score = match_score - fatigue_penalty
            scored_candidates.append((venue_clean, final_score))

        # Sort by final hybrid score (highest to lowest)
        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        
        # Return just the category names for the top N winners
        return [item[0] for item in scored_candidates[:top_n]]

    def calculate_dynamic_radius(self, step_count):
        """Calculates search radius using Fuzzy Logic based on WESAD fatigue heuristics."""
        
        # Cap steps at 20,000 so the fuzzy math doesn't crash if someone runs a marathon
        capped_steps = min(max(step_count, 0), 20000)
        
        # Feed the input into the Fuzzy Engine
        self.radius_sim.input['steps'] = capped_steps
        
        try:
            # Crunch the math (Centroid Defuzzification)
            self.radius_sim.compute()
            final_radius = self.radius_sim.output['radius']
            
            # Print for your server logs to prove it's working
            print(f" 📏 Fuzzy Engine calculated radius: {int(final_radius)}m (Steps: {capped_steps})")
            
            return int(final_radius)
            
        except Exception as e:
            print(f" ⚠️ Fuzzy computation failed: {e}. Defaulting to 2000m.")
            return 2000