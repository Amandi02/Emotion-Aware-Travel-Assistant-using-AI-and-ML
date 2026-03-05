# Sustainable Vision: Multitask Scene + Emission Estimation Model

**Ranasinghe R A A K IT22894892 - Integrated Carbon Footprint Estimation and Carbon Wallet Module**


## 🌍 Overview

A cutting-edge multitask deep learning project that leverages a custom ResNet-50 architecture to simultaneously perform:

1. **Scene Classification** - 365 diverse scene categories (Places365)
2. **Attribute Prediction** - 4 binary environmental attributes (Indoor, Crowded, Bright_Lights, High_Tech_Equipment)
3. **Carbon Emission Estimation** - 5-class classification (very_low → very_high)

This model enables real-time environmental impact assessment by analyzing scene characteristics and estimating carbon footprint levels based on visual context. The system supports fine-tuning and evaluation on both the Places365 and Intel Image Classification datasets.

---

## ✨ Features

- **Multi-Task Learning**: Single model predicts multiple outputs simultaneously
- **Transfer Learning**: Built on ResNet-50 with ImageNet pre-training
- **Dual Model Support**: Base (Places365) and Intel-tuned checkpoints
- **Flexible Inference**: Support for single images, folders, and URLs
- **Fine-Tuning Ready**: Easy adaptation to new datasets
- **EPA-Standard Emission Estimates**: Based on real-world carbon emission standards
- **Portable Inference**: No dataset dependency for deployment
- **Web Interfaces**: Gradio and Streamlit support for easy demos
- **Optuna Hyperparameter Tuning**: Automated optimization capabilities

---

## 🎯 Problem Statement

Climate change and carbon emissions are critical global challenges. Understanding the carbon footprint of different environments and activities is essential for:

- **Urban Planning**: Identifying high-emission areas and optimizing infrastructure
- **Sustainability Assessment**: Evaluating environmental impact of buildings and spaces
- **Smart City Applications**: Real-time monitoring of urban carbon footprint
- **Consumer Awareness**: Helping individuals understand the environmental impact of their surroundings

This project addresses the need for **automated, visual-based carbon emission estimation** by combining scene understanding with environmental impact prediction. By analyzing images, the model can estimate carbon emission levels associated with different environments, enabling data-driven sustainability decisions.

---

## 🧠 Model Architecture

The model is based on **ResNet-50** (Residual Neural Network with 50 layers) and includes three specialized prediction heads:

```
Input Image (224×224×3)
         ↓
ResNet-50 Backbone (ImageNet pre-trained)
         ↓
Feature Vector (2048-dim)
         ↓
    ┌────┴────┬─────────────┬──────────────┐
    ↓         ↓             ↓              ↓
Scene Head  Attr Head  Emission Head
(365 cls)   (4 binary)   (5 classes)
```

### Architecture Details:

- **Backbone**: ResNet-50 with ImageNet V2 weights
- **Feature Dimension**: 2048
- **Scene Head**: Linear layer (2048 → 365) for Places365 classification
- **Attribute Head**: Linear layer (2048 → 4) for binary attributes:
  - `Indoor`: Indoor (1) vs Outdoor (0)
  - `Crowded`: High occupancy (1) vs Low occupancy (0)
  - `Bright_Lights`: Significant artificial lighting (1) vs Natural/low light (0)
  - `High_Tech_Equipment`: Energy-intensive equipment present (1) vs absent (0)
- **Emission Head**: Linear layer (2048 → 5) for carbon level classification:
  - Classes: `very_low`, `low`, `medium`, `high`, `very_high`

### Training Strategy:

- **Multi-task Loss**: Weighted combination of CrossEntropy (scene), BCE (attributes), and CrossEntropy (emission)
- **Loss Weights**: λ_scene=1.0, λ_attr=1.369, λ_emission=1.0 (Optuna-optimized)
- **Fine-tuning**: Intel dataset fine-tuning focuses on emission head only
- **Early Stopping**: Patience of 5 epochs to prevent overfitting

---

## 📊 Datasets

### 1. Places365 Dataset

- **Size**: ~1.8M training images, 36,500 validation images
- **Classes**: 365 diverse scene categories (indoor and outdoor)
- **Purpose**: Primary training for scene classification and attribute prediction
- **Download**: Automatically downloaded via TorchVision
- **Path**: `D:/datasets/torchvision_places365`
- **Reference**: [Places365 Project](http://places2.csail.mit.edu/)

**Scene Examples**: street, forest, bedroom, office, restaurant, stadium, airport, etc.

### 2. Intel Image Classification Dataset

- **Size**: ~14,000 training images, ~3,000 test images
- **Classes**: 6 categories (buildings, forest, glacier, mountain, sea, street)
- **Purpose**: Fine-tuning emission head for specific scene types
- **Download**: Available on [Kaggle](https://www.kaggle.com/datasets/puneet6060/intel-image-classification)
- **Path**: `D:/datasets/Intel Image Classification Dataset`
- **Image Size**: 150×150 (resized to 224×224 for model input)

### Emission Label Mapping:

The model uses weak supervision to map scene types to emission levels:

- **very_low**: Natural scenes (forest, glacier, mountain, sea)
- **low**: Outdoor low-energy scenes (park, field, coast)
- **medium**: Residential and light commercial (street, building)
- **high**: High-traffic urban areas (downtown, highway, airport)
- **very_high**: Energy-intensive facilities (server room, industrial, stadium with lights)

---

## 🔧 Setup

### 2. Create Virtual Environment

```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
# or
source .venv/bin/activate  # Linux/Mac
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Organize Datasets

Create the following directory structure:

```
D:/datasets/
├── torchvision_places365/          # Auto-downloaded by TorchVision
└── Intel Image Classification Dataset/
    ├── seg_train/
    │   ├── buildings/
    │   ├── forest/
    │   ├── glacier/
    │   ├── mountain/
    │   ├── sea/
    │   └── street/
    └── seg_test/
        ├── buildings/
        ├── forest/
        └── ...
```

### 5. Download Pre-trained Checkpoints

Place your trained model checkpoints in the `checkpoints/` directory:

```
checkpoints/
├── best_multitask_resnet50_emission.pt         # Base model (Places365)
├── best_multitask_resnet50_emission_intel.pt  # Intel fine-tuned version
└── other versions (v1, v2, final)
```

---

## 📦 Dependencies

The project requires **Python 3.8+** and the following key packages:

### Core Deep Learning:
- `torch==2.5.1+cu118` - PyTorch with CUDA 11.8 support
- `torchvision==0.20.1+cu118` - Vision utilities and models
- `torchaudio==2.5.1+cu118` - Audio processing

### Data Science & Visualization:
- `numpy==2.3.3` - Numerical computing
- `pandas==2.3.3` - Data manipulation
- `matplotlib==3.10.7` - Plotting and visualization
- `pillow==11.3.0` - Image processing

### Web Interfaces:
- `gradio==6.0.0` - Interactive ML demos
- `streamlit==1.51.0` - Data apps
- `fastapi==0.121.3` - Modern web APIs

### Hyperparameter Optimization:
- `optuna==4.6.0` - Automated hyperparameter tuning

### Data Management:
- `kaggle==1.8.2` - Kaggle dataset downloads

### Installation:

```bash
pip install -r requirements.txt
```

For a complete list of all dependencies, see [`requirements.txt`](requirements.txt).

---

## 💻 Hardware Requirements

### Minimum Requirements:
- **GPU**: NVIDIA GPU with CUDA 11.8 support (4GB VRAM minimum)
- **RAM**: 16GB system memory
- **Storage**: 50GB free space (datasets + checkpoints)
- **OS**: Windows 10/11, Linux (Ubuntu 20.04+), or macOS

### Recommended Specifications:
- **GPU**: NVIDIA RTX 3060 or better (8GB+ VRAM)
- **RAM**: 32GB system memory
- **Storage**: 100GB SSD
- **CPU**: Intel i7/AMD Ryzen 7 or better

### Training Time Estimates:
- **Places365 (15 epochs)**: ~8-12 hours on RTX 3060
- **Intel fine-tuning (3 epochs)**: ~30-45 minutes on RTX 3060
- **Inference**: ~50-100ms per image on GPU

---

## 🚀 Usage

### 1. Inference on a Single Image

Run the model on a local image:

```bash
python inference.py -i "path/to/image.jpg"
```

Using a URL:

```bash
python inference.py -i "https://example.com/image.jpg"
```

Use the Intel fine-tuned model (recommended):

```bash
python inference.py -i "path/to/image.jpg" --use-intel-ckpt
```

### 2. Dual Model Inference (Portable)

Compare predictions from both base and Intel-tuned models:

```bash
python dual_inference_portable.py -i "path/to/image.jpg"
```

Process a folder of images:

```bash
python dual_inference_portable.py --folder "path/to/images/" --num-images 10
```

### 3. Evaluate on Intel Dataset

Quick qualitative test on multiple images:

```bash
python inference.py --eval-intel --intel-root "D:/datasets/Intel Image Classification Dataset" --num-images 30
```

### 4. Fine-tune Emission Head

Use Intel data to fine-tune the carbon emission head:

```bash
python inference.py --finetune-intel --intel-root "D:/datasets/Intel Image Classification Dataset" --ft-epochs 3 --num-images 30
```

### 5. Checkpoint Evaluation

Evaluate multiple checkpoints systematically:

```bash
python eval_checkpoints_intel.py
```

---

## 🏋️ Training

### Train from Scratch

To train the model on Places365:

```bash
python train.py
```

### Configuration Options (in `train.py`):

- `DATA_ROOT`: Path to Places365 dataset (default: `D:\datasets\torchvision_places365`)
- `BASE_BATCH_SIZE`: Batch size for training (default: 32)
- `BASE_NUM_EPOCHS`: Number of training epochs (default: 15)
- `PATIENCE`: Early stopping patience (default: 5)
- `LAMBDA_ATTR`: Loss weight for attribute prediction (default: 1.369)
- `LAMBDA_EMISSION`: Loss weight for emission prediction (default: 1.0)

### Hyperparameter Tuning with Optuna:

Enable automatic hyperparameter optimization:

```python
# In train.py, set:
USE_OPTUNA = True
N_TRIALS = 10
TUNE_EPOCHS = 8
```

Then run:

```bash
python train.py
```

### Training Outputs:

The training script saves:
- **Checkpoints**: `checkpoints/best_multitask_resnet50_emission.pt`
- **Loss Plots**: `checkpoints/loss_plot.png`
- **Optuna Study**: `checkpoints/optuna_study.db` (if enabled)

---

## 📁 Project Structure

```
Sustainable-Vision-Multitask-Scene-Emission-Estimation-Model/
│
├── train.py                        # Main training script for Places365
├── inference.py                    # Single image inference + fine-tuning
├── dual_inference_portable.py      # Dual model comparison (portable)
├── eval_checkpoints_intel.py       # Checkpoint evaluation utility
│
├── model.py                        # MultiTaskResNet50 architecture
├── dataset.py                      # Dataset loaders and transforms
├── config.py                       # Scene attributes and mappings
├── make_split.py                   # Dataset splitting utility
│
├── requirements.txt                # Python dependencies
├── README.md                       # This file
├── .gitignore                      # Git ignore rules
│
├── checkpoints/                    # Saved model weights
│   ├── best_multitask_resnet50_emission.pt
│   └── best_multitask_resnet50_emission_intel.pt
│
├── assets/                         # Supporting files
│   └── categories_places365.txt    # Places365 class names
│
└── .venv/                          # Virtual environment (not in repo)
```

---

## 🌡️ Emission Estimation Methodology

The carbon emission estimation is based on **EPA standards** and environmental factors:

### Reference Standards:

1. **Transportation (EPA 2024)**:
   - Passenger car: 0.313 kg CO₂ per vehicle-mile
   - Converted: ~194.5 g CO₂/km

2. **Buildings (EIA)**:
   - Default grid intensity: 445 g CO₂/kWh
   - Building EUI: 120 kWh/m²/year

### Emission Classification:

The model classifies scenes into 5 carbon emission levels:

| Level | Description | Example Scenes | Est. Impact |
|-------|-------------|----------------|-------------|
| **very_low** | Natural environments | forest, glacier, coast | < 50 g CO₂/hr |
| **low** | Outdoor low-energy | park, residential street | 50-150 g CO₂/hr |
| **medium** | Mixed urban | commercial street, small buildings | 150-400 g CO₂/hr |
| **high** | High-traffic urban | downtown, highway, airport | 400-1000 g CO₂/hr |
| **very_high** | Energy-intensive | data center, stadium, industrial | > 1000 g CO₂/hr |

### Attribute-Based Estimation:

The model uses scene attributes to refine emission estimates:

- **Indoor**: Buildings require HVAC (heating/cooling)
- **Crowded**: Higher occupancy → increased HVAC load
- **Bright_Lights**: Artificial lighting increases electricity consumption
- **High_Tech_Equipment**: Computers, servers, displays consume significant power

### Calculation Example:

For a scene classified as "office building":
- **Indoor**: +30% (HVAC)
- **Bright_Lights**: +20% (lighting)
- **High_Tech_Equipment**: +25% (computers)
- **Crowded**: +15% (occupancy)

Total multiplier: ~1.9× baseline → Classified as **high** emission

---

## 📈 Performance Metrics

### Base Model (Places365 trained):

| Task | Metric | Performance |
|------|--------|-------------|
| Scene Classification | Top-1 Accuracy | ~54% |
| Scene Classification | Top-5 Accuracy | ~83% |
| Attribute Prediction | BCE Loss | ~0.25 |
| Emission Estimation | Accuracy | ~62% |

### Intel Fine-Tuned Model:

| Task | Metric | Performance |
|------|--------|-------------|
| Scene Classification | Top-1 Accuracy | ~54% (unchanged) |
| Scene Classification | Top-5 Accuracy | ~83% (unchanged) |
| Attribute Prediction | BCE Loss | ~0.25 (unchanged) |
| **Emission Estimation** | **Accuracy** | **~78%** ⬆️ (+16%) |

### Key Findings:

✅ **Intel fine-tuning significantly improves emission prediction** (+16% accuracy)  
✅ **Scene and attribute predictions remain stable** (no catastrophic forgetting)  
✅ **Top-5 scene accuracy is robust** (~83% covers most use cases)  
✅ **Recommended for deployment**: `best_multitask_resnet50_emission_intel.pt`

### Training Curves:

Training and validation loss plots are saved to `checkpoints/loss_plot.png` after training.

---

**Last Updated**: January 2026  
**Version**: 1.0.0  
**Status**: Active Development
