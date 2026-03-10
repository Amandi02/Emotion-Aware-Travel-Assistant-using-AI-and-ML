# 🚀 How to Run This Project

Complete step-by-step guide to set up and run the Sustainable Vision Multitask Scene Emission Estimation Model.

---

## 📋 Prerequisites

### Required Software:
- **Python 3.8+** (check with `python --version`)
- **CUDA 11.8** (for GPU training) - Optional but recommended
- **Git** (if cloning from repository)

### Hardware Requirements:
- **Minimum**: 16GB RAM, 4GB GPU VRAM (or CPU-only)
- **Recommended**: 32GB RAM, 8GB+ GPU VRAM (RTX 3060 or better)

---

## 🔧 Step 1: Setup Python Environment

### Option A: Using Virtual Environment (Recommended)

```bash
# Navigate to project directory
cd "C:\Users\Collective User\Documents\Repositories\feelio\Sustainable-Vision-Multitask-Scene-Emission-Estimation-Model"

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.venv\Scripts\Activate.ps1

# Windows CMD:
.venv\Scripts\activate.bat

# Linux/Mac:
source .venv/bin/activate
```

### Option B: Using Conda

```bash
# Create conda environment
conda create -n sustainable-vision python=3.10
conda activate sustainable-vision
```

---

## 📦 Step 2: Install Dependencies

```bash
# Make sure you're in the project directory and virtual environment is activated
pip install --upgrade pip

# Install all dependencies
pip install -r requirements.txt
```

**Note**: If you encounter issues with PyTorch CUDA installation, install PyTorch separately:

```bash
# For CUDA 11.8
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# For CPU-only (slower, but works)
pip install torch torchvision torchaudio
```

**Verify Installation**:
```bash
python -c "import torch; print(f'PyTorch: {torch.__version__}'); print(f'CUDA Available: {torch.cuda.is_available()}')"
```

---

## 📁 Step 3: Prepare Datasets

### 3.1 Places365 Dataset (Required for Training)

The Places365 dataset will be **automatically downloaded** when you first run training. However, you can prepare it manually:

**Option A: Automatic Download (Recommended)**
- The dataset will download automatically on first training run
- Default location: `D:\datasets\torchvision_places365`
- Size: ~50GB (256x256 version) or ~200GB (full resolution)

**Option B: Manual Download**
1. Download Places365 from: http://places2.csail.mit.edu/
2. Extract to: `D:\datasets\torchvision_places365\`
3. Structure should be:
   ```
   D:\datasets\torchvision_places365\
   └── data_256_standard\  (or data_large_standard)
       ├── train-standard\
       └── val\
   ```

**To change dataset location**, edit `train.py`:
```python
DATA_ROOT = r"D:\datasets\torchvision_places365"  # Change this path
```

### 3.2 Intel Image Classification Dataset (Optional, for Fine-tuning)

1. Download from Kaggle: https://www.kaggle.com/datasets/puneet6060/intel-image-classification
2. Extract to: `C:\Users\Collective User\Documents\Datasets\Intel Image Classification Dataset\`
3. Structure:
   ```
   Intel Image Classification Dataset\
   ├── seg_train\
   │   ├── buildings\
   │   ├── forest\
   │   ├── glacier\
   │   ├── mountain\
   │   ├── sea\
   │   └── street\
   └── seg_test\
       └── (same structure)
   ```

**To change Intel dataset location**, edit `inference.py`:
```python
DEFAULT_INTEL_ROOT = r"C:\Users\Collective User\Documents\Datasets\Intel Image Classification Dataset"
```

---

## 🏋️ Step 4: Training the Model

### 4.1 Quick Start (Using Pre-configured Settings)

```bash
# Make sure virtual environment is activated
python train.py
```

This will:
- Download Places365 dataset automatically (if not present)
- Train for 15 epochs with batch size 32
- Save best model to `checkpoints/best_multitask_resnet50_emission.pt`
- Generate training curves in `checkpoints/` folder

**Expected Training Time**:
- GPU (RTX 3060): ~8-12 hours for 15 epochs
- CPU: ~3-5 days (not recommended)

### 4.2 Customize Training Parameters

Edit `train.py` to modify:

```python
# Training config
BASE_BATCH_SIZE = 32          # Reduce if GPU memory issues (try 16 or 8)
BASE_NUM_EPOCHS = 15          # Number of training epochs
PATIENCE = 5                  # Early stopping patience

# Loss weights
LAMBDA_ATTR = 1.369           # Attribute loss weight
LAMBDA_EMISSION = 1.0         # Emission loss weight

# Dataset limits (for faster testing)
MAX_TRAIN_SAMPLES = 300_000   # Limit training samples
MAX_VAL_SAMPLES = 30_000      # Limit validation samples
```

### 4.3 Enable Hyperparameter Tuning (Optuna)

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

---

## 🔍 Step 5: Running Inference

### 5.1 Single Image Inference

**Local Image**:
```bash
python inference.py -i "path/to/your/image.jpg"
```

**Image URL**:
```bash
python inference.py -i "https://example.com/image.jpg"
```

**Using Intel Fine-tuned Model** (Recommended):
```bash
python inference.py -i "path/to/image.jpg" --use-intel-ckpt
```

**Custom Top-K Predictions**:
```bash
python inference.py -i "path/to/image.jpg" --topk 10
```

### 5.2 Evaluate on Folder

```bash
# Evaluate any folder of images
python inference.py --eval-folder "path/to/images/" --num-images 20
```

### 5.3 Evaluate on Intel Dataset

```bash
# Quick evaluation
python inference.py --eval-intel --num-images 30

# With custom Intel dataset path
python inference.py --eval-intel --intel-root "D:/datasets/Intel" --num-images 30
```

### 5.4 Fine-tune Emission Head on Intel Dataset

```bash
# Fine-tune for 3 epochs
python inference.py --finetune-intel --ft-epochs 3 --num-images 30

# Custom parameters
python inference.py --finetune-intel \
    --ft-epochs 5 \
    --ft-batch 32 \
    --ft-lr 1e-4 \
    --num-images 50
```

### 5.5 Dual Model Comparison

Compare base and Intel-tuned models:

```bash
# Single image
python dual_inference_portable.py -i "path/to/image.jpg"

# Folder of images
python dual_inference_portable.py --folder "path/to/images/" --num-images 10
```

---

## 📊 Step 6: Checkpoint Evaluation

Evaluate multiple checkpoints systematically:

```bash
python eval_checkpoints_intel.py
```

---

## 🐛 Troubleshooting

### Issue: CUDA Out of Memory

**Solution**: Reduce batch size in `train.py`:
```python
BASE_BATCH_SIZE = 16  # or 8, or 4
```

### Issue: Dataset Not Found

**Solution**: 
1. Check `DATA_ROOT` path in `train.py`
2. Ensure Places365 is downloaded or will auto-download
3. For Intel dataset, check `DEFAULT_INTEL_ROOT` in `inference.py`

### Issue: ModuleNotFoundError

**Solution**:
```bash
# Make sure virtual environment is activated
# Reinstall dependencies
pip install -r requirements.txt
```

### Issue: Slow Training on CPU

**Solution**: 
- Use GPU if available (install CUDA 11.8)
- Reduce `MAX_TRAIN_SAMPLES` for faster testing
- Use smaller batch size: `BASE_BATCH_SIZE = 8`

### Issue: Checkpoint Not Found

**Solution**:
- Train the model first: `python train.py`
- Or download pre-trained checkpoint and place in `checkpoints/` folder
- Check checkpoint path in `inference.py`:
  ```python
  BASE_CKPT_PATH = os.path.join("checkpoints", "best_multitask_resnet50_emission.pt")
  ```

### Issue: Windows Path Issues

**Solution**: Use raw strings or forward slashes:
```python
DATA_ROOT = r"D:\datasets\torchvision_places365"  # Raw string
# or
DATA_ROOT = "D:/datasets/torchvision_places365"    # Forward slashes
```

---

## 📝 Quick Reference Commands

```bash
# Setup
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Training
python train.py

# Inference
python inference.py -i "image.jpg"
python inference.py -i "image.jpg" --use-intel-ckpt

# Fine-tuning
python inference.py --finetune-intel --ft-epochs 3

# Evaluation
python inference.py --eval-folder "path/to/images/"
python eval_checkpoints_intel.py
```

---

## ✅ Verification Checklist

Before running, ensure:

- [ ] Python 3.8+ installed
- [ ] Virtual environment created and activated
- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] PyTorch with CUDA working (if using GPU)
- [ ] Dataset paths configured correctly
- [ ] Sufficient disk space (~50GB for Places365)
- [ ] GPU drivers updated (if using GPU)

---

## 🎯 Expected Outputs

### Training Output:
```
Using device: cuda
Train size: 300000 images (limited)
Val   size: 30000 images (limited)
Number of scene classes: 365

Epoch 01 | 1234.5s
  Train: loss=2.3456, scene_acc=0.234, emission_acc=0.456, attr_f1=0.567
  Val  : loss=2.1234, scene_acc=0.345, emission_acc=0.567, attr_f1=0.678
  ✅ Saved best model to checkpoints/best_multitask_resnet50_emission.pt
```

### Inference Output:
```
=== Scene prediction (top-5) ===
1. Places365-Standard/airport_terminal  (45.23%)
2. Places365-Standard/train_station  (23.45%)
...

=== Attribute probabilities ===
attr_0: 0.923 (Indoor)
attr_1: 0.756 (Crowded)
...

=== Estimated carbon emission level ===
Predicted: high  (78.45%)
Full distribution:
  0: very_low   5.23%
  1: low        8.12%
  2: medium     12.34%
  3: high       78.45%
  4: very_high   1.86%
```

---

## 📚 Additional Resources

- **Places365**: http://places2.csail.mit.edu/
- **Intel Dataset**: https://www.kaggle.com/datasets/puneet6060/intel-image-classification
- **PyTorch Docs**: https://pytorch.org/docs/
- **Project README**: See `README.md` for detailed documentation

---

**Need Help?** Check the `README.md` file for more detailed information about the project architecture and methodology.
