"""
MultiTask ResNet-50 model architecture.
Copied from Sustainable-Vision repo – scene + attribute + emission heads.
"""
import torch
import torch.nn as nn
import torchvision.models as models


class MultiTaskResNet50(nn.Module):
    """
    ResNet-50 backbone with three prediction heads:
      - scene_head   : 365-class scene classification (Places365)
      - attr_head    : 4 binary attribute logits
      - emission_head: 5-class carbon-emission level (very_low → very_high)
    """

    def __init__(self, num_scenes: int = 365, num_attrs: int = 4, num_emission: int = 5):
        super().__init__()
        backbone = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
        self.features = nn.Sequential(*list(backbone.children())[:-1])  # [B, 2048, 1, 1]
        feature_dim = backbone.fc.in_features  # 2048

        self.scene_head = nn.Linear(feature_dim, num_scenes)
        self.attr_head = nn.Linear(feature_dim, num_attrs)
        self.emission_head = nn.Linear(feature_dim, num_emission)

    def forward(self, x):
        feats = self.features(x).flatten(1)          # [B, 2048]
        return self.scene_head(feats), self.attr_head(feats), self.emission_head(feats)
