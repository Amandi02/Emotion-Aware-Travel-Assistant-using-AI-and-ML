# ViT Facial Emotion Recognition - Training Guide

## What This Notebook Does

This notebook trains a Vision Transformer (ViT) model to recognize 7 emotions from facial images:
- Angry
- Disgust
- Fear
- Happy
- Neutral
- Sad
- Surprise

### Training Process Overview:

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

## Step-by-Step Setup Instructions

### Option 1: Google Colab (Recommended for Beginners)

#### Step 1: Upload the Notebook
1. Go to https://colab.research.google.com/
2. Click "File" → "Upload notebook"
3. Upload `visual_emotion_detection_notebook_(1) (3).ipynb`

#### Step 2: Enable GPU
1. Click "Runtime" → "Change runtime type"
2. Select "T4 GPU" under "Hardware accelerator"
3. Click "Save"

#### Step 3: Setup Kaggle API
Run this in a code cell:
```python
from google.colab import files
uploaded = files.upload()  # Upload your kaggle.json file

!mkdir -p ~/.kaggle
!cp kaggle.json ~/.kaggle/
!chmod 600 ~/.kaggle/kaggle.json
```

#### Step 4: Run All Cells
1. Click "Runtime" → "Run all"
2. Wait ~2-3 hours for training to complete
3. Download the trained model from the files panel

---

### Option 2: Local Machine (Advanced Users)

#### Step 1: Install Dependencies
```bash
# Create a virtual environment (optional but recommended)
python -m venv vit_env
source vit_env/bin/activate  # On Windows: vit_env\Scripts\activate

# Install required packages
pip install transformers torch torchvision datasets evaluate
pip install opencv-python pillow matplotlib seaborn pandas
pip install kagglehub huggingface-hub scikit-learn
```

#### Step 2: Setup Kaggle Credentials
```bash
# Linux/Mac
mkdir -p ~/.kaggle
cp /path/to/kaggle.json ~/.kaggle/
chmod 600 ~/.kaggle/kaggle.json

# Windows
mkdir %USERPROFILE%\.kaggle
copy C:\path\to\kaggle.json %USERPROFILE%\.kaggle\
```

#### Step 3: Run the Notebook
```bash
jupyter notebook visual_emotion_detection_notebook_\(1\)\ \(3\).ipynb
```

Or convert to Python script and run:
```bash
jupyter nbconvert --to script notebook.ipynb
python notebook.py
```

---

## Understanding the Code Flow

### Phase 1: Data Loading (Cells 1-26)
```
Downloads 3 datasets → Removes 'contempt' class → Renames 'anger' to 'angry'
→ Combines all datasets → Creates single training dataset
```

**What happens:**
- Downloads images from Kaggle
- Filters and standardizes labels
- Combines into 147,848 images

### Phase 2: Data Preparation (Cells 27-40)
```
Creates label mappings → Loads pre-trained model → Splits data (80/20)
→ Applies data augmentation
```

**What happens:**
- Maps emotion names to numbers (0-6)
- Loads base ViT model
- Splits into 118,278 training + 29,570 validation images
- Adds augmentation (rotation, flip, sharpness)

### Phase 3: Model Training (Cells 41-47)
```
Configures training parameters → Trains for 2.3 epochs → Saves checkpoints
```

**Training Parameters:**
- Batch size: 256 per device
- Learning rate: 3e-5
- Epochs: 2.3
- Evaluation every 250 steps

**Expected Time:**
- With GPU: ~2-3 hours
- With CPU: ~12-24 hours (not recommended)

### Phase 4: Evaluation (Cells 48-56)
```
Generates loss plots → Creates ROC curves → Calculates metrics
→ Shows confusion matrix
```

**Metrics Displayed:**
- Accuracy
- Precision, Recall, F1-Score per emotion
- Confusion Matrix
- ROC-AUC curves

### Phase 5: Model Saving (Cells 49, 52-53)
```
Saves model files → Creates ZIP archives → Ready for deployment
```

**Output Files:**
- `saved_model/` - Model weights and config
- `saved_model.zip` - Compressed model
- `vit-Facial-Expression-Recognition/` - Training checkpoints
- `logs/` - Training logs

---

## Important Configuration

### Cell 6: Base Model
```python
model_checkpoint = "motheecreator/vit-Facial-Expression-Recognition"
```
This is the pre-trained model that will be fine-tuned.

### Cell 43: Training Arguments
```python
args = TrainingArguments(
    f"{model_name}",
    per_device_train_batch_size=256,  # Reduce if out of memory
    per_device_eval_batch_size=256,   # Reduce if out of memory
    num_train_epochs=2.3,             # Number of training epochs
    learning_rate=3e-5,               # Learning rate
    warmup_steps=1000,                # Warmup steps
    eval_steps=250,                   # Evaluate every 250 steps
    push_to_hub=True,                 # Upload to HuggingFace (set False if not needed)
)
```

### Memory Issues?
If you get "Out of Memory" errors, reduce batch sizes:
```python
per_device_train_batch_size=128,  # Was 256
per_device_eval_batch_size=128,   # Was 256
```

---

## Expected Results

After training completes, you should see:

**Final Metrics:**
- Validation Accuracy: ~88.5%
- Validation Loss: ~0.34

**Per-Emotion Performance:**
| Emotion  | Precision | Recall | F1-Score |
|----------|-----------|--------|----------|
| Angry    | ~0.85     | ~0.82  | ~0.83    |
| Disgust  | ~0.90     | ~0.88  | ~0.89    |
| Fear     | ~0.82     | ~0.80  | ~0.81    |
| Happy    | ~0.93     | ~0.95  | ~0.94    |
| Neutral  | ~0.87     | ~0.89  | ~0.88    |
| Sad      | ~0.84     | ~0.83  | ~0.83    |
| Surprise | ~0.91     | ~0.92  | ~0.91    |

---

## Using the Trained Model

After training, you can use the model in two ways:

### Method 1: Load from Local Files
```python
from transformers import pipeline

# Load the saved model
pipe = pipeline("image-classification", model="./saved_model/")

# Predict emotion from image
result = pipe("path/to/image.jpg")
print(result)
```

### Method 2: Load from HuggingFace Hub
```python
from transformers import pipeline

# If you pushed to HuggingFace
pipe = pipeline("image-classification",
                model="your-username/vit-Facial-Expression-Recognition")

result = pipe("path/to/image.jpg")
print(result)
```

---

## Troubleshooting

### Issue 1: Kaggle API Not Working
**Error:** `403 Forbidden` or `Dataset not found`

**Solution:**
```bash
# Verify kaggle.json is in the right place
cat ~/.kaggle/kaggle.json  # Linux/Mac
type %USERPROFILE%\.kaggle\kaggle.json  # Windows

# Check permissions
chmod 600 ~/.kaggle/kaggle.json
```

### Issue 2: Out of Memory
**Error:** `CUDA out of memory` or `RuntimeError: out of memory`

**Solution:**
- Reduce batch size to 128 or 64
- Use gradient accumulation
- Clear cache: `torch.cuda.empty_cache()`

### Issue 3: Dataset Download Fails
**Error:** `Connection timeout` or `Download interrupted`

**Solution:**
- Use Google Colab (more stable internet)
- Download datasets manually from Kaggle and upload to Colab

### Issue 4: Training Takes Too Long
**Solution:**
- Reduce `num_train_epochs` to 1.5 or 2
- Increase `eval_steps` to 500 (evaluate less frequently)
- Use GPU if on CPU

---

## Modifying the Training

### To Train with Your Own Dataset:

1. **Organize images** in folders by emotion:
```
your_dataset/
├── angry/
│   ├── img1.jpg
│   ├── img2.jpg
├── happy/
│   ├── img1.jpg
│   ├── img2.jpg
└── ...
```

2. **Load custom dataset** (replace cells 9-23):
```python
from datasets import load_dataset

# Load from local folder
custom_dataset = load_dataset("imagefolder", data_dir="/path/to/your_dataset/")

# Use in training
dataset = custom_dataset
```

3. **Update label mappings** (cell 29):
```python
labels = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
label2id = {label: i for i, label in enumerate(labels)}
id2label = {i: label for i, label in enumerate(labels)}
```

### To Change Number of Epochs:
```python
# Cell 43
num_train_epochs=3.0,  # Increase for better accuracy
```

### To Adjust Learning Rate:
```python
# Cell 43
learning_rate=5e-5,  # Higher = faster learning (but less stable)
learning_rate=1e-5,  # Lower = more stable (but slower)
```

---

## Frequently Asked Questions

**Q: How long does training take?**
A: 2-3 hours on Google Colab T4 GPU, 12-24 hours on CPU.

**Q: Can I stop and resume training?**
A: Yes, if you enable checkpointing:
```python
save_steps=500,  # Save every 500 steps
```
Then resume with:
```python
trainer.train(resume_from_checkpoint=True)
```

**Q: How much does it cost?**
A: Free on Google Colab! Kaggle also offers free GPU notebooks.

**Q: Can I use fewer datasets?**
A: Yes, comment out datasets you don't want in cell 23:
```python
# Use only FER2013
dataset['train'] = fer_dataset['train']
```

**Q: Do I need to push to HuggingFace?**
A: No, set `push_to_hub=False` in cell 43.

---

## Next Steps

1. ✅ Train the model using this notebook
2. ✅ Save the trained model locally
3. ✅ Use the clean inference notebook (`visual_emotion_detection_CLEAN.ipynb`)
4. ✅ Deploy for video emotion analysis

---

## Credits

**Base Model:** [motheecreator/vit-Facial-Expression-Recognition](https://huggingface.co/motheecreator/vit-Facial-Expression-Recognition)

**Datasets:**
- [AffectNet Training Data](https://www.kaggle.com/datasets/noamsegal/affectnet-training-data)
- [FER2013](https://www.kaggle.com/datasets/msambare/fer2013)
- [MMA Facial Expression](https://www.kaggle.com/datasets/mahmoudima/mma-facial-expression)

---

**Last Updated:** December 31, 2025
**Tested On:** Google Colab, Python 3.10, PyTorch 2.0+
