import urllib.parse
"""
Real crack detection using a pretrained YOLOv8 model (OpenSistemas/YOLOv8-crack-seg,
100-epoch trained, box mAP50 ~0.79), downloaded to models/crack_pretrained.pt.

This is intentionally scoped to crack detection only — it's the one defect type we have
a properly-trained public model for. Corrosion/spalling/etc. keep coming from the LLM
defect_detection_node in agent_graph.py; nothing about that path changes here.
"""
import io
import os
import re
from functools import lru_cache
from typing import List, TypedDict

import requests
from PIL import Image
from ultralytics import YOLO

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "crack_pretrained.pt")


class CrackDetection(TypedDict):
    label: str
    confidence: float
    x_pct: float       # left, 0-100
    y_pct: float        # top, 0-100
    width_pct: float
    height_pct: float


@lru_cache(maxsize=1)
def get_model() -> YOLO:
    return YOLO(MODEL_PATH)


def _fetch_bytes(url: str, timeout: float) -> bytes:
    session = requests.Session()
    resp = session.get(url, timeout=timeout)
    resp.raise_for_status()
    content_type = resp.headers.get("Content-Type", "")

    # Google Drive's "uc?export=download" link serves an HTML virus-scan warning
    # page instead of the file itself for larger files, unless you replay the
    # request with the confirmation token it embeds. Detect that case and retry.
    if "drive.google.com" in url and "text/html" in content_type:
        token = None
        for cookie_name, cookie_value in session.cookies.items():
            if cookie_name.startswith("download_warning"):
                token = cookie_value
                break
        if not token:
            match = re.search(r"confirm=([0-9A-Za-z_-]+)", resp.text)
            if match:
                token = match.group(1)
        if token:
            sep = "&" if "?" in url else "?"
            resp = session.get(f"{url}{sep}confirm={token}", timeout=timeout)
            resp.raise_for_status()

    return resp.content


def _load_image(image_url: str, timeout: float = 15.0) -> Image.Image:
    if "/uploads/" in image_url or image_url.startswith("uploads/"):
        filename = urllib.parse.unquote(image_url.split("uploads/")[-1].lstrip("/"))
        for candidate_dir in [
            os.path.join(os.path.dirname(__file__), "..", "uploads"),
            os.path.join(os.path.dirname(__file__), "uploads"),
            "/app/uploads",
            "uploads"
        ]:
            local_path = os.path.join(candidate_dir, filename)
            if os.path.exists(local_path):
                return Image.open(local_path).convert("RGB")

    if image_url.startswith("http://") or image_url.startswith("https://"):
        return Image.open(io.BytesIO(_fetch_bytes(image_url, timeout))).convert("RGB")
    return Image.open(image_url).convert("RGB")


def detect_cracks(image_url: str, conf_threshold: float = 0.40) -> List[CrackDetection]:
    """Runs the pretrained YOLO model on one image and returns percentage-based boxes."""
    image = _load_image(image_url)
    width, height = image.size

    model = get_model()
    results = model.predict(image, conf=conf_threshold, verbose=False)

    detections: List[CrackDetection] = []
    if not results or results[0].boxes is None:
        return detections

    for box in results[0].boxes:
        x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
        detections.append({
            "label": "Crack",
            "confidence": round(float(box.conf[0]) * 100, 1),
            "x_pct": round((x1 / width) * 100, 2),
            "y_pct": round((y1 / height) * 100, 2),
            "width_pct": round(((x2 - x1) / width) * 100, 2),
            "height_pct": round(((y2 - y1) / height) * 100, 2),
        })

    return detections
