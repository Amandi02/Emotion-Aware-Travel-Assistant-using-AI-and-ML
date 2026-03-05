# dataset.py
# Dataset utilities for the Sustainable Vision Multitask Scene Emission Estimation Model
# This module provides custom dataset classes and functions for loading Places365 data
# with additional labels for scene attributes and carbon emission estimates.

from typing import Dict

import torch
from torchvision.datasets import Places365
from torchvision import transforms

from config import SCENE_ATTR_MAPPING, INDOOR_SCENES, ATTRIBUTE_ORDER


# ============================================================================
# EMISSION ESTIMATION FUNCTIONS
# ============================================================================

# -------------------------------------------------
# Heuristic: scene name -> carbon emission category
#   0: very_low   (mostly natural, untouched)
#   1: low        (rural / parks / light human impact)
#   2: medium     (generic urban / indoor)
#   3: high       (transport hubs, heavy traffic)
#   4: very_high  (industrial / energy production)
# -------------------------------------------------

def scene_name_to_emission(scene_name: str) -> int:
    """
    Maps a scene name to a discrete carbon emission category based on heuristics.
    
    This function uses keyword matching to estimate the likely carbon emission
    intensity of a scene. The classification is based on typical energy consumption
    and human activity patterns associated with different scene types.
    
    Args:
        scene_name (str): The name of the scene (e.g., 'forest', 'highway', 'factory')
                         Case-insensitive matching is performed.
    
    Returns:
        int: An emission category from 0 to 4:
            0 = very_low:   Natural scenes with minimal human impact (forests, mountains)
            1 = low:        Rural/residential areas with light human activity (parks, villages)
            2 = medium:     Typical urban/indoor scenes (default category)
            3 = high:       Transport hubs and high-traffic areas (airports, highways)
            4 = very_high:  Industrial and energy production sites (factories, power plants)
    
    Note:
        - Evaluation is done in order: very_low -> low -> high -> very_high -> medium (default)
        - First matching category is returned
        - If no keywords match, defaults to 'medium' (category 2)
    """
    # Convert to lowercase for case-insensitive matching
    name = scene_name.lower()

    # Category 0: Very low emissions - pristine natural scenes
    # These are untouched or minimally impacted natural environments
    # with virtually no artificial energy consumption
    very_low_keywords = [
        "forest", "mountain", "river", "lake", "desert", "field",
        "canyon", "glacier", "cliff", "valley", "ocean", "coast",
        "island", "snowfield", "iceberg", "pasture", "savanna",
    ]
    if any(k in name for k in very_low_keywords):
        return 0

    # Category 1: Low emissions - rural and light human activity
    # These scenes have minimal energy infrastructure and low population density
    # Examples: parks, gardens, small villages
    low_keywords = [
        "park", "garden", "village", "residential", "courtyard",
        "farm", "meadow", "orchard", "campsite", "playground",
        "suburb",
    ]
    if any(k in name for k in low_keywords):
        return 1

    # Category 3: High emissions - transportation hubs and heavy traffic
    # These scenes involve significant vehicle emissions and energy-intensive
    # transport infrastructure (note: evaluated before medium to prioritize transport)
    high_keywords = [
        "highway", "traffic", "parking_garage", "parkinglot",
        "airport", "runway", "railroad", "train_station",
        "bus_station", "bus_interior", "bridge", "metro_station",
        "subway_station", "street",
    ]
    if any(k in name for k in high_keywords):
        return 3

    # Category 4: Very high emissions - industrial and energy production
    # These are the most energy-intensive scenes: factories, power plants,
    # extraction sites, and heavy industry
    very_high_keywords = [
        "industrial", "refinery", "power_plant", "powerplant",
        "factory", "smokestack", "oil", "gasworks", "mine",
        "mining", "warehouse", "construction_site",
    ]
    if any(k in name for k in very_high_keywords):
        return 4

    # Category 2: Medium emissions - default for typical urban/indoor scenes
    # This includes most commercial buildings, offices, residential interiors,
    # and general urban environments that don't fall into other categories
    return 2


def attribute_from_scene(scene: str) -> torch.Tensor:
    """
    Generates a multi-label attribute vector from a scene name using weak supervision.
    
    This function creates a 4-dimensional binary attribute vector for a given scene
    using heuristic rules defined in config.py. The attributes characterize the scene
    in terms of properties relevant to energy consumption and emissions.
    
    Args:
        scene (str): The scene name (e.g., 'cinema', 'airport_terminal', 'forest')
                    Case-insensitive matching is performed.
    
    Returns:
        torch.Tensor: A 4-dimensional float tensor with binary values (0.0 or 1.0)
                     in the order defined by ATTRIBUTE_ORDER:
                     [Indoor, Crowded, Bright_Lights, High_Tech_Equipment]
    
    Process:
        1. Initialize all attributes to 0 (absent)
        2. Check if scene is in INDOOR_SCENES set -> set Indoor=1 if present
        3. Apply scene-specific mappings from SCENE_ATTR_MAPPING if available
        4. Uses OR-style merge: once an attribute is set to 1, it stays 1
    
    Example:
        >>> attribute_from_scene('cinema')
        tensor([1., 0., 1., 1.])  # Indoor, not crowded, bright lights, high-tech equipment
    """
    # Convert to lowercase for case-insensitive matching
    scene = scene.lower()
    
    # Initialize all attributes to 0 (attribute absent/false)
    attr: Dict[str, int] = {k: 0 for k in ATTRIBUTE_ORDER}

    # Step 1: Apply general indoor heuristic
    # Check if this scene is in the predefined list of indoor scenes
    if scene in INDOOR_SCENES:
        attr["Indoor"] = 1

    # Step 2: Apply scene-specific attribute overrides from weak-supervision mapping
    # These provide more detailed attribute labels for specific scene types
    # (e.g., cinema -> Bright_Lights=1, High_Tech_Equipment=1)
    if scene in SCENE_ATTR_MAPPING:
        for k, v in SCENE_ATTR_MAPPING[scene].items():
            if k in attr:
                # OR-style merge: max(current, new) ensures once 1, stays 1
                # This prevents general heuristics from overriding specific rules
                attr[k] = max(attr[k], int(v))

    # Convert dictionary to ordered tensor following ATTRIBUTE_ORDER
    return torch.tensor([attr[k] for k in ATTRIBUTE_ORDER], dtype=torch.float32)


# ============================================================================
# CUSTOM DATASET CLASS
# ============================================================================

class Places365WithAttributes(Places365):
    """
    Extended Places365 dataset that provides multi-task labels for each sample.
    
    This class wraps torchvision's Places365 dataset and augments it with additional
    labels for training a multi-task model that predicts:
        1. Scene classification (365 classes)
        2. Scene attributes (4 binary attributes)
        3. Carbon emission estimates (5 ordinal categories)
    
    Each sample is returned as a dictionary with the following structure:
        {
            "image": Tensor [3, H, W]           - RGB image tensor (preprocessed)
            "scene_label": LongTensor scalar    - Scene class index (0 to 364)
            "attribute_label": FloatTensor [4]  - Binary attributes (Indoor, Crowded, etc.)
            "emission_label": LongTensor scalar - Emission category (0=very_low to 4=very_high)
        }
    
    This multi-label format enables joint training of all three tasks, allowing the
    model to learn shared representations across scene understanding, attribute
    recognition, and emission estimation.
    
    Inherits from:
        torchvision.datasets.Places365: Standard Places365 dataset loader
    """

    def __init__(self, *args, **kwargs):
        """
        Initializes the dataset by extending the base Places365 dataset.
        
        This constructor:
        1. Calls the parent Places365 __init__ to set up image loading
        2. Pre-computes emission labels for all 365 scene classes
        3. Stores the mapping in self.class_to_emission for efficient lookup
        
        Args:
            *args: Positional arguments passed to Places365.__init__
                  Typically: root (str), split (str), download (bool)
            **kwargs: Keyword arguments passed to Places365.__init__
                     Typically: transform, target_transform, small (bool)
        
        Attributes:
            class_to_emission (dict): Maps scene class index (int) to emission
                                     category (int 0-4) for all 365 classes
        
        Example:
            >>> dataset = Places365WithAttributes(
            ...     root='./data',
            ...     split='train',
            ...     transform=get_default_transforms(train=True),
            ...     download=True
            ... )
        """
        # Initialize the parent Places365 dataset
        # This sets up self.classes, image paths, and loading mechanisms
        super().__init__(*args, **kwargs)

        # Build emission label lookup table for all scene classes
        # self.classes contains entries like 'Places365-Standard/airport_terminal'
        # We extract the scene name (last part after '/') and map it to an emission category
        self.class_to_emission = {}
        for idx, raw_name in enumerate(self.classes):
            # Extract clean scene name from full class path
            scene_name = raw_name.split("/")[-1]
            # Pre-compute and store emission category for this scene class
            self.class_to_emission[idx] = scene_name_to_emission(scene_name)

    def __getitem__(self, idx: int):
        """
        Retrieves a single sample from the dataset with all labels.
        
        This method loads an image and generates all associated labels:
        scene classification, attributes, and emission estimates. It extends
        the base Places365 behavior to provide multi-task learning labels.
        
        Args:
            idx (int): Index of the sample to retrieve (0 to len(dataset)-1)
        
        Returns:
            dict: A dictionary containing:
                - "image" (Tensor): Preprocessed image tensor [3, H, W]
                                   Shape depends on transforms (typically 3x224x224)
                - "scene_label" (LongTensor): Scene class index [scalar] (0 to 364)
                - "attribute_label" (FloatTensor): Binary attribute vector [4]
                                                   Values are 0.0 or 1.0
                - "emission_label" (LongTensor): Emission category [scalar] (0 to 4)
        
        Process:
            1. Load image and scene label from parent dataset
            2. Extract clean scene name from class string
            3. Generate attribute labels using weak supervision heuristics
            4. Lookup pre-computed emission label
            5. Package all data into a dictionary
        
        Example:
            >>> sample = dataset[0]
            >>> print(sample['image'].shape)        # torch.Size([3, 224, 224])
            >>> print(sample['scene_label'])        # tensor(42)
            >>> print(sample['attribute_label'])    # tensor([1., 0., 1., 0.])
            >>> print(sample['emission_label'])     # tensor(2)
        """
        # Load image and scene label from parent Places365 dataset
        # img is already transformed according to self.transform
        img, scene_label = super().__getitem__(idx)

        # Extract the clean scene name from the full class path
        # Example: 'Places365-Standard/airport_terminal' -> 'airport_terminal'
        scene_name_raw = self.classes[scene_label]
        scene_name = scene_name_raw.split("/")[-1]

        # Generate the 4-dimensional attribute vector using weak supervision
        # Returns: [Indoor, Crowded, Bright_Lights, High_Tech_Equipment]
        attr_vec = attribute_from_scene(scene_name)
        
        # Retrieve pre-computed emission label from lookup table
        # This avoids redundant computation during training
        emission_label = self.class_to_emission[int(scene_label)]

        # Return all data as a dictionary for multi-task learning
        return {
            "image": img,
            "scene_label": torch.tensor(scene_label, dtype=torch.long),
            "attribute_label": attr_vec,  # Already a tensor from attribute_from_scene()
            "emission_label": torch.tensor(emission_label, dtype=torch.long),
        }


# ============================================================================
# IMAGE PREPROCESSING FUNCTIONS
# ============================================================================

def get_default_transforms(train: bool = True):
    """
    Returns standard image preprocessing transforms for Places365/ImageNet models.
    
    This function provides different transform pipelines for training and validation/testing.
    The transforms follow standard practices for scene recognition models and are compatible
    with models pre-trained on ImageNet or Places365.
    
    Args:
        train (bool): If True, returns training transforms with data augmentation
                     If False, returns validation/test transforms without augmentation
                     Default: True
    
    Returns:
        torchvision.transforms.Compose: A composition of image transforms that:
            - Resizes images to a standard size
            - Applies augmentation (training only)
            - Converts to tensor
            - Normalizes using ImageNet statistics
    
    Training Transforms (train=True):
        1. Resize to 256x256 pixels
        2. RandomResizedCrop to 224x224 (scale and aspect ratio augmentation)
        3. RandomHorizontalFlip (50% probability for left-right flip)
        4. ColorJitter (brightness ±20%, contrast ±20% for appearance variation)
        5. Convert PIL Image to Tensor [0, 1] range
        6. Normalize with ImageNet mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
    
    Validation/Test Transforms (train=False):
        1. Resize to 256x256 pixels
        2. CenterCrop to 224x224 (deterministic center crop)
        3. Convert PIL Image to Tensor [0, 1] range
        4. Normalize with ImageNet mean and std (same as training)
    
    Note:
        - Final output shape: [3, 224, 224] for both training and validation
        - Normalization statistics are from ImageNet (standard for transfer learning)
        - Training augmentation helps prevent overfitting and improves generalization
    
    Example:
        >>> train_transform = get_default_transforms(train=True)
        >>> val_transform = get_default_transforms(train=False)
        >>> train_dataset = Places365WithAttributes(
        ...     root='./data', split='train', transform=train_transform
        ... )
    """
    if train:
        # Training pipeline with data augmentation
        return transforms.Compose(
            [
                # Step 1: Resize to slightly larger than target to allow cropping
                transforms.Resize((256, 256)),
                
                # Step 2: Random crop with scale/aspect augmentation
                # Helps model learn scale and position invariance
                transforms.RandomResizedCrop(224),
                
                # Step 3: Random horizontal flip for left-right invariance
                # 50% probability, appropriate for most scene types
                transforms.RandomHorizontalFlip(),
                
                # Step 4: Color augmentation for lighting/appearance robustness
                # Brightness and contrast vary by ±20%
                transforms.ColorJitter(brightness=0.2, contrast=0.2),
                
                # Step 5: Convert PIL Image to PyTorch tensor [0, 1] range
                transforms.ToTensor(),
                
                # Step 6: Normalize using ImageNet statistics
                # Required for models pre-trained on ImageNet/Places365
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],  # Per-channel mean (RGB)
                    std=[0.229, 0.224, 0.225],   # Per-channel std deviation (RGB)
                ),
            ]
        )
    else:
        # Validation/test pipeline without augmentation (deterministic)
        return transforms.Compose(
            [
                # Step 1: Resize to slightly larger than target
                transforms.Resize((256, 256)),
                
                # Step 2: Deterministic center crop to final size
                # No randomness for reproducible evaluation
                transforms.CenterCrop(224),
                
                # Step 3: Convert PIL Image to PyTorch tensor [0, 1] range
                transforms.ToTensor(),
                
                # Step 4: Normalize using same statistics as training
                # Ensures consistent preprocessing for fair evaluation
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],  # ImageNet mean
                    std=[0.229, 0.224, 0.225],   # ImageNet std
                ),
            ]
        )
