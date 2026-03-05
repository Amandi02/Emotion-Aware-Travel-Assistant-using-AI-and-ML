# config.py
# Configuration file for Sustainable Vision Multitask Scene Emission Estimation Model
# This file defines the scene attributes, class counts, and weak-supervision mappings
# used for training a multi-task learning model that predicts both scene categories
# and environmental attributes related to energy consumption and emissions.

# ============================================================================
# ATTRIBUTE CONFIGURATION
# ============================================================================

# ATTRIBUTE_ORDER: List defining the order of attributes in the multi-label output head
# These attributes are used to characterize scenes in terms of their environmental
# and energy-related properties:
#   - Indoor: Whether the scene is indoors (1) or outdoors (0)
#   - Crowded: Whether the scene typically has many people (affects HVAC load)
#   - Bright_Lights: Whether the scene has significant artificial lighting
#   - High_Tech_Equipment: Whether the scene contains energy-intensive tech equipment
# This order must match the model's output layer and training labels
ATTRIBUTE_ORDER = ["Indoor", "Crowded", "Bright_Lights", "High_Tech_Equipment"]

# NUM_SCENES: Total number of scene categories in the Places365 dataset
# Places365 is a scene recognition dataset with 365 diverse scene categories
# ranging from natural environments to urban settings
NUM_SCENES = 365

# NUM_ATTRIBUTES: Number of binary attributes predicted by the model
# Automatically derived from the ATTRIBUTE_ORDER list length
# Currently: 4 attributes (Indoor, Crowded, Bright_Lights, High_Tech_Equipment)
NUM_ATTRIBUTES = len(ATTRIBUTE_ORDER)

# ============================================================================
# WEAK-SUPERVISION MAPPING
# ============================================================================

# SCENE_ATTR_MAPPING: Dictionary providing weak supervision labels for training
# Maps specific scene names to their expected attribute values (0 or 1)
# Used when ground-truth attribute labels are not available for all samples
# This enables semi-supervised learning by providing noisy labels based on
# domain knowledge and common-sense heuristics
#
# Structure: {scene_name: {attribute_name: binary_value, ...}, ...}
# Values: 0 = attribute absent/false, 1 = attribute present/true
#
# These mappings help the model learn attribute patterns even when only
# scene labels are available in the training data
SCENE_ATTR_MAPPING = {
    # High_Tech_Equipment scenes with bright lighting
    # These scenes typically contain projectors, screens, sound systems, etc.
    "cinema":              {"High_Tech_Equipment": 1, "Crowded": 0, "Indoor": 1, "Bright_Lights": 1},
    "gym":                 {"High_Tech_Equipment": 1, "Crowded": 0, "Indoor": 1, "Bright_Lights": 0},
    "arcade":              {"High_Tech_Equipment": 1, "Crowded": 1, "Indoor": 1, "Bright_Lights": 1},
    "server_room":         {"High_Tech_Equipment": 1, "Crowded": 0, "Indoor": 1, "Bright_Lights": 0},

    # Crowded locations with high occupancy
    # These scenes typically have many people, affecting HVAC and energy needs
    "stadium":             {"High_Tech_Equipment": 0, "Crowded": 1, "Indoor": 0, "Bright_Lights": 1},
    "convention_center":   {"High_Tech_Equipment": 0, "Crowded": 1, "Indoor": 1, "Bright_Lights": 1},
    "market":              {"High_Tech_Equipment": 0, "Crowded": 1, "Indoor": 0, "Bright_Lights": 0},
    "train_station":       {"High_Tech_Equipment": 0, "Crowded": 1, "Indoor": 1, "Bright_Lights": 0},

    # Entertainment venues with bright lights and equipment
    # These are indoor public spaces with both crowds and technology
    "theater":             {"High_Tech_Equipment": 1, "Crowded": 1, "Indoor": 1, "Bright_Lights": 1},
    "mall":                {"High_Tech_Equipment": 1, "Crowded": 1, "Indoor": 1, "Bright_Lights": 1},
    "studio":              {"High_Tech_Equipment": 1, "Crowded": 0, "Indoor": 1, "Bright_Lights": 1},
    "stage":               {"High_Tech_Equipment": 1, "Crowded": 1, "Indoor": 1, "Bright_Lights": 1},
}

# ============================================================================
# INDOOR SCENE CLASSIFICATION
# ============================================================================

# INDOOR_SCENES: Set of scene names that are typically indoor environments
# Used for filtering, validation, or as a heuristic for the "Indoor" attribute
# Names should match the class names in the Places365 dataset
# This list helps distinguish between indoor and outdoor scenes, which is
# important for estimating different emission profiles (HVAC vs no climate control)
INDOOR_SCENES = {
    "cinema", "gym", "arcade", "server_room",
    "convention_center", "mall", "studio", "stage",
    "theater", "classroom", "office", "airport_terminal",
    "train_station", "living_room", "bedroom",
    "corridor", "library", "dining_room", "conference_room"
}
