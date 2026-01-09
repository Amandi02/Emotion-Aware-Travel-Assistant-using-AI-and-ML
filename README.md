# Emotion-Aware-Travel-Assistant-using-AI-and-ML
Author: K A L M Wijerathna (IT22891990)
Component: Facial Emotion Recognition 

# ViT Facial Emotion Recognition 

## What This  Does
This notebook trains a Vision Transformer (ViT) model to recognize 7 emotions from facial images:
- Angry
- Disgust
- Fear
- Happy
- Neutral
- Sad
- Surprise

# Facial Emotion Recognition System 

This notebook provides a complete facial emotion recognition system using Vision Transformer (ViT) model.

## Overview
- Detects faces in video frames
- Recognizes 7 emotions: anger, disgust, fear, happy, neutral, sad, surprise
- Live video window with real-time emotion overlays (only local support not in colab remote server)
- Provides optimized versions for both CPU and GPU
- Generates detailed reports and visualizations

###  Process Overview:

1. **Downloads 3 datasets from Kaggle** (~574MB total):
   - AffectNet Training Data (314MB)
   - FER2013 Dataset (60MB)
   - MMA Facial Expression Dataset (166MB)

2. **Combines ~148,000 images** from all datasets

3. **Fine-tunes a pre-trained ViT model** from HuggingFace

4. **Evaluates performance** with metrics and visualizations

5. **Saves the trained model** for later use

---

## Prerequisites

### 1. Hardware Requirements
- **Recommended**: GPU (Google Colab free tier works well)
- **Minimum**: 12GB RAM
- **Storage**: ~3GB free space

### 2. Accounts Needed
- **Kaggle Account**: To download datasets
- **HuggingFace Account**: To push the model (optional)

### 3. Get API Keys

#### Kaggle API Key:
1. Go to https://www.kaggle.com/settings
2. Scroll to "API" section
3. Click "Create New API Token"
4. Download `kaggle.json` file

#### HuggingFace Token (Optional):
1. Go to https://huggingface.co/settings/tokens
2. Create a new token with "Write" permissions
3. Copy the token

---

**Setup & Installation**
**Prerequisites**
ReactNative
Python 3.9+
FastAPI 
MongoDB instance (local or cloud)

**Libraries** 
transformers 
torch 
opencv-python
pillow
pandas 
matplotlib

## Credits

**Base Model:** [motheecreator/vit-Facial-Expression-Recognition](https://huggingface.co/motheecreator/vit-Facial-Expression-Recognition)

**Datasets:**
- [AffectNet Training Data](https://www.kaggle.com/datasets/noamsegal/affectnet-training-data)
- [FER2013](https://www.kaggle.com/datasets/msambare/fer2013)
- [MMA Facial Expression](https://www.kaggle.com/datasets/mahmoudima/mma-facial-expression)

---
