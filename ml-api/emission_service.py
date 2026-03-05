"""
Emission estimation service.
Wraps MultiTaskResNet50 for scene / attribute / carbon-emission inference.

The emission head tends to collapse to "medium" due to training imbalance.
We correct this with a scene-calibrated hybrid approach:
  • The Places365 scene head is well-trained and reliably identifies scene types.
  • Each scene type has a well-known emission profile (see SCENE_TIER_KEYWORDS).
  • We derive a scene-based emission prior and blend it with the model's output.
  • Result: accurate differentiation between forests (very_low) and airports (high).
"""
from __future__ import annotations

from collections import OrderedDict
from io import BytesIO
from typing import Optional

import httpx
import torch
import torchvision.transforms as T
from PIL import Image

from emission_model import MultiTaskResNet50

EMISSION_LABELS = ["very_low", "low", "medium", "high", "very_high"]
ATTRIBUTE_NAMES = ["Indoor", "Crowded", "Bright_Lights", "High_Tech_Equipment"]

# Representative annual CO₂ midpoints (kg CO₂e / year) per emission tier.
EMISSION_CO2_KG: dict[str, float] = {
    "very_low":  50.0,
    "low":       250.0,
    "medium":    1_000.0,
    "high":      5_000.0,
    "very_high": 15_000.0,
}

# ── Scene → Emission tier keywords ────────────────────────────────────────────
# Keyword substring matching against Places365 scene labels (lower-cased).
# Order matters: checked top-to-bottom; first match wins.
SCENE_TIER_KEYWORDS: list[tuple[str, list[str]]] = [
    # ── very_high: heavy industry, large energy infrastructure ────────────────
    ("very_high", [
        "power plant", "power station", "nuclear", "oil refinery", "refinery",
        "chemical plant", "steel mill", "foundry", "forge", "smelter",
        "mine", "quarry", "construction site", "shipyard",
        "data center", "server room", "manufacturing",
        "industrial area", "industrial zone",
    ]),

    # ── high: major transport hubs, large-scale commercial ────────────────────
    ("high", [
        "airport", "airplane cabin", "runway",
        "train station", "railway", "subway station", "bus station",
        "highway", "freeway", "toll",
        "stadium", "arena", "race track", "racetrack",
        "amusement park", "theme park", "fair",
        "shopping mall", "mall", "department store",
        "parking garage", "parking lot",
        "hospital", "emergency room",
        "nightclub", "disco", "casino",
        "warehouse", "freight", "dock", "container",
        "convention center", "exhibition",
    ]),

    # ── very_low: wilderness, nature, agriculture ─────────────────────────────
    ("very_low", [
        "forest", "jungle", "rainforest", "woodland",
        "mountain", "alp", "glacier", "snowfield", "tundra", "arctic",
        "beach", "shore", "coast", "cliff", "reef", "ocean", "sea",
        "river", "lake", "waterfall", "stream", "brook", "wetland",
        "marsh", "swamp", "bog", "lagoon",
        "desert", "dune", "badlands", "butte", "mesa", "canyon",
        "valley", "plain", "prairie", "grassland", "steppe", "savanna",
        "field", "meadow", "pasture", "farm", "orchard", "vineyard",
        "rice paddy", "hayfield", "lavender",
        "park", "garden", "botanical", "nature", "trail", "campsite",
        "volcano", "geyser", "hot spring", "cave",
        "sky", "aurora",
    ]),

    # ── low: residential, quiet indoor, small-scale ───────────────────────────
    ("low", [
        "bedroom", "living room", "dining room", "kitchen", "bathroom",
        "home", "house", "cottage", "cabin", "bungalow",
        "porch", "balcony", "patio", "veranda", "yard", "backyard",
        "attic", "basement", "garage", "closet",
        "library", "reading room", "study",
        "classroom", "lecture room", "school",
        "church", "chapel", "monastery", "cloister", "temple", "mosque",
        "museum", "gallery", "art studio",
        "dorm room", "dormitory",
        "nursery", "kindergarten",
        "bookstore", "pharmacy", "laundromat",
    ]),

    # ── medium: everyday commercial, entertainment, urban services ────────────
    ("medium", [
        "restaurant", "diner", "cafeteria", "food court", "canteen",
        "cafe", "coffee shop", "bakery", "bar", "pub", "tavern",
        "office", "conference room", "cubicle", "reception",
        "gym", "fitness", "yoga", "sport",
        "hotel", "motel", "inn", "lobby",
        "supermarket", "grocery", "market", "shop", "store",
        "hair salon", "beauty salon", "spa",
        "theater", "cinema", "auditorium",
        "swimming pool", "aquatic",
        "arcade", "bowling",
        "community center", "recreation",
        "street", "plaza", "square", "promenade",
    ]),
]

TOP_K_SCENES = 5

# Weight given to scene-based prior when blending with model emission output.
# 1.0 = use scene only; 0.0 = use model only.
SCENE_WEIGHT = 0.75

# ── Image transform ───────────────────────────────────────────────────────────
_TRANSFORM = T.Compose([
    T.Resize((256, 256)),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_class_names(txt_path: str) -> list[str]:
    """
    Parse categories_places365.txt.
    Each line: '/a/abbey 0'  →  returns ['abbey', 'airplane cabin', ...]
    """
    try:
        with open(txt_path, encoding="utf-8") as f:
            lines = f.read().strip().split("\n")
        classes: list[str] = [""] * len(lines)
        for line in lines:
            parts = line.strip().split()
            if not parts:
                continue
            raw_name = parts[0]
            idx = int(parts[1]) if len(parts) > 1 else len(classes)
            clean = raw_name.split("/")[-1].replace("_", " ")
            if idx < len(classes):
                classes[idx] = clean
        return classes
    except Exception:
        return [f"scene_{i}" for i in range(365)]


def _scene_to_tier(scene_label: str) -> str | None:
    """
    Map a Places365 scene label to an emission tier using keyword matching.
    Returns None if the scene doesn't match any known keyword.
    """
    label_lower = scene_label.lower()
    for tier, keywords in SCENE_TIER_KEYWORDS:
        if any(kw in label_lower for kw in keywords):
            return tier
    return None


def _scene_prior(scenes: list[dict]) -> dict[str, float] | None:
    """
    Derive an emission distribution from the top-5 scene predictions.
    Uses a weighted vote: scene_confidence × tier_weight for each matched scene.
    Returns None if no scene matched any keyword.
    """
    votes: dict[str, float] = {label: 0.0 for label in EMISSION_LABELS}
    total_weight = 0.0

    for scene in scenes:
        tier = _scene_to_tier(scene["label"])
        if tier is None:
            continue
        weight = scene["confidence"]
        votes[tier] += weight
        total_weight += weight

    if total_weight == 0.0:
        return None

    # Spread a small probability to neighbours for smoothness
    smoothed: dict[str, float] = {label: 0.0 for label in EMISSION_LABELS}
    tier_order = EMISSION_LABELS
    for i, label in enumerate(tier_order):
        p = votes[label] / total_weight
        smoothed[label]                            += p * 0.80
        if i > 0:     smoothed[tier_order[i - 1]] += p * 0.10
        if i < 4:     smoothed[tier_order[i + 1]] += p * 0.10

    total = sum(smoothed.values())
    return {k: round(v / total, 4) for k, v in smoothed.items()}


def _blend_distributions(
    model_dist: dict[str, float],
    scene_dist: dict[str, float],
    scene_weight: float,
) -> dict[str, float]:
    """Linearly blend model and scene distributions."""
    blended = {
        label: round(
            (1 - scene_weight) * model_dist.get(label, 0.0)
            + scene_weight      * scene_dist.get(label, 0.0),
            4,
        )
        for label in EMISSION_LABELS
    }
    total = sum(blended.values())
    return {k: round(v / total, 4) for k, v in blended.items()}


# ── Service ───────────────────────────────────────────────────────────────────

class EmissionService:
    """Loads the MultiTaskResNet50 once and runs inference."""

    def __init__(self, checkpoint_path: str, categories_txt: str, use_intel: bool = False) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.class_names = _load_class_names(categories_txt)
        num_scenes = len(self.class_names)

        model = MultiTaskResNet50(num_scenes=num_scenes)
        ckpt = torch.load(checkpoint_path, map_location=self.device)
        state_dict = ckpt.get("model_state_dict", ckpt)
        if any(k.startswith("module.") for k in state_dict):
            state_dict = OrderedDict(
                (k.replace("module.", "", 1), v) for k, v in state_dict.items()
            )
        model.load_state_dict(state_dict)
        model.to(self.device)
        model.eval()
        self.model = model
        self.use_intel = use_intel

    @torch.no_grad()
    def predict_bytes(self, image_bytes: bytes) -> dict:
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        x = _TRANSFORM(img).unsqueeze(0).to(self.device)
        return self._run(x)

    async def predict_url(self, url: str) -> dict:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        return self.predict_bytes(resp.content)

    def _run(self, x: torch.Tensor) -> dict:
        scene_logits, attr_logits, emission_logits = self.model(x)

        # ── Scene top-K ───────────────────────────────────────────────────────
        scene_probs = torch.softmax(scene_logits[0], dim=0)
        top_probs, top_idxs = torch.topk(scene_probs, k=min(TOP_K_SCENES, len(self.class_names)))
        scenes = [
            {"label": self.class_names[int(i)], "confidence": round(float(p), 4), "rank": r}
            for r, (p, i) in enumerate(
                zip(top_probs.cpu().tolist(), top_idxs.cpu().tolist()), start=1
            )
        ]

        # ── Binary attributes ─────────────────────────────────────────────────
        attr_probs = torch.sigmoid(attr_logits[0]).cpu().tolist()
        attributes = [
            {"name": ATTRIBUTE_NAMES[i], "probability": round(p, 4)}
            for i, p in enumerate(attr_probs)
        ]

        # ── Raw model emission distribution ───────────────────────────────────
        emission_probs = torch.softmax(emission_logits[0], dim=0).cpu().tolist()
        model_dist = {
            EMISSION_LABELS[i] if i < len(EMISSION_LABELS) else f"class_{i}": round(p, 4)
            for i, p in enumerate(emission_probs)
        }

        # ── Scene-calibrated blending ──────────────────────────────────────────
        # The emission head collapses to "medium" due to training imbalance.
        # We correct by deriving an emission prior from the scene classification,
        # then blending: final = (1 - w) × model + w × scene_prior
        scene_prior = _scene_prior(scenes)

        if scene_prior is not None:
            final_dist = _blend_distributions(model_dist, scene_prior, SCENE_WEIGHT)
            calibration = "scene_blended"
        else:
            # No scene keyword matched – fall back to model output as-is
            final_dist = model_dist
            calibration = "model_only"

        best_label = max(final_dist, key=final_dist.get)
        best_conf  = final_dist[best_label]

        # ── Weighted CO₂ estimate ─────────────────────────────────────────────
        co2_kg_estimate = round(
            sum(p * EMISSION_CO2_KG.get(label, 0.0) for label, p in final_dist.items()),
            1,
        )

        emission = {
            "label":        best_label,
            "confidence":   round(best_conf, 4),
            "distribution": final_dist,
            "co2_kg_year":  co2_kg_estimate,
            # Debug field – visible in /api/emission/* responses
            "calibration":  calibration,
        }

        return {
            "scenes":     scenes,
            "attributes": attributes,
            "emission":   emission,
            "model_used": "intel" if self.use_intel else "base",
        }


# ── Lazy singletons ───────────────────────────────────────────────────────────

_base_service:  Optional[EmissionService] = None
_intel_service: Optional[EmissionService] = None


def get_emission_service(
    checkpoint_path: str,
    categories_txt: str,
    use_intel: bool = False,
) -> EmissionService:
    global _base_service, _intel_service
    if use_intel:
        if _intel_service is None:
            _intel_service = EmissionService(checkpoint_path, categories_txt, use_intel=True)
        return _intel_service
    if _base_service is None:
        _base_service = EmissionService(checkpoint_path, categories_txt, use_intel=False)
    return _base_service
