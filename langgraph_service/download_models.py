"""
One-time setup: downloads the pretrained crack-detection YOLOv8 model used by
yolo_detector.py. *.pt files are gitignored, so run this after cloning / on a fresh
machine:

    ./venv/bin/python download_models.py
"""
import os
import shutil

from huggingface_hub import hf_hub_download

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
DEST = os.path.join(MODELS_DIR, "crack_pretrained.pt")

if __name__ == "__main__":
    os.makedirs(MODELS_DIR, exist_ok=True)
    if os.path.exists(DEST):
        print(f"Already present: {DEST}")
    else:
        path = hf_hub_download(
            repo_id="OpenSistemas/YOLOv8-crack-seg",
            filename="yolov8n/weights/best.pt",
        )
        shutil.copy(path, DEST)
        print(f"Downloaded pretrained crack model to {DEST}")
