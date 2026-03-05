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

# ── Server ────────────────────────────────────────────────────────────────────
ML_API_PORT = int(os.environ.get("ML_API_PORT", "8003"))
ML_API_HOST = os.environ.get("ML_API_HOST", "0.0.0.0")
