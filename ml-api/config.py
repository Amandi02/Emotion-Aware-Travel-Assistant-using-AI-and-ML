"""ML API Configuration – all paths come from environment variables."""
import os

# ── Emotion Model ─────────────────────────────────────────────────────────────
# Directory containing config.json + model.safetensors + preprocessor_config.json
EMOTION_MODEL_PATH = os.environ.get(
    "EMOTION_MODEL_PATH",
    r"C:\Users\Collective User\Documents\Repositories\feelio\emotion detection module pckg - Copy\vit-Facial-Expression-Recognition",
)

# ── Emission Model ────────────────────────────────────────────────────────────
# Path to the .pt checkpoint file
EMISSION_CHECKPOINT_PATH = os.environ.get(
    "EMISSION_CHECKPOINT_PATH",
    r"C:\Users\Collective User\Documents\Repositories\feelio\Sustainable-Vision-Multitask-Scene-Emission-Estimation-Model\checkpoints\best_multitask_resnet50_emission.pt",
)
EMISSION_INTEL_CHECKPOINT_PATH = os.environ.get(
    "EMISSION_INTEL_CHECKPOINT_PATH",
    r"C:\Users\Collective User\Documents\Repositories\feelio\Sustainable-Vision-Multitask-Scene-Emission-Estimation-Model\checkpoints\best_multitask_resnet50_emission_intel.pt",
)

# Path to categories_places365.txt (used for scene class names)
PLACES365_CATEGORIES_PATH = os.environ.get(
    "PLACES365_CATEGORIES_PATH",
    r"C:\Users\Collective User\Documents\Repositories\feelio\Sustainable-Vision-Multitask-Scene-Emission-Estimation-Model\assets\categories_places365.txt",
)

# ── Hybrid Recommender (Context + Venue Emotions) ───────────────────────────
# Path to your Random Forest model and Label Encoder
CONTEXT_MODEL_PATH = os.environ.get(
    "CONTEXT_MODEL_PATH",
    r"C:\Users\Collective User\Documents\Repositories\Emotion-Aware-Travel-Assistant-using-AI-and-ML\models\context_brain.pkl",
)
LABEL_ENCODER_PATH = os.environ.get(
    "LABEL_ENCODER_PATH",
    r"C:\Users\Collective User\Documents\Repositories\Emotion-Aware-Travel-Assistant-using-AI-and-ML\models\le_category.pkl",
)

# Path to your Yelp-derived Venue Emotions CSV
VENUE_EMOTIONS_PATH = os.environ.get(
    "VENUE_EMOTIONS_PATH",
    r"C:\Users\Collective User\Documents\Repositories\feelio\ml-api\data\venue_6emotions_lookup.csv",
)

# ── Server ────────────────────────────────────────────────────────────────────
ML_API_PORT = int(os.environ.get("ML_API_PORT", "8003"))
ML_API_HOST = os.environ.get("ML_API_HOST", "0.0.0.0")
