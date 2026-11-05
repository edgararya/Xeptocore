"""Face detection and cropping for the detection pipeline.

Primary detector: YuNet (cv2.FaceDetectorYN, needs OpenCV >= 4.8). It reads the
model file ``backend/weights/face_detection_yunet_2023mar.onnx``.

If that file is missing or cannot be loaded, a Haar cascade is used instead so
the backend still starts. The cascade is configured much more strictly than the
detector used before (which accepted almost anything as a face), but it is still
a weaker detector, and a warning is printed at startup.
"""

import os
import threading
from typing import List, Optional, Tuple

import cv2
import numpy as np

_APP_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_APP_DIR)
YUNET_MODEL_PATH = os.path.join(_BACKEND_DIR, "weights", "face_detection_yunet_2023mar.onnx")

# YuNet: faces scoring below this are ignored. Raise it for fewer false
# detections, lower it to catch smaller or blurrier faces.
YUNET_SCORE_THRESHOLD = 0.8
YUNET_NMS_THRESHOLD = 0.3
YUNET_TOP_K = 5000

# Detection runs on a copy scaled down to this many pixels on the long side
# (large uploads would otherwise be slow); boxes are scaled back afterwards.
DETECT_MAX_SIDE = 960

# Faces smaller than this (in the original image) are ignored: after being
# resized for the models they carry too little detail for a meaningful score.
MIN_FACE_SIDE = 24

# The crop is a square around the face, this much larger than the face itself.
CROP_MARGIN = 1.35
MIN_CROP_SIDE = 20

# The detector objects are stateful and not safe to call from several threads.
_lock = threading.Lock()
_yunet = None
_cascade = None


def _load_yunet():
    if not os.path.exists(YUNET_MODEL_PATH):
        print(f"[WARN] YuNet model not found: {YUNET_MODEL_PATH}")
        return None
    try:
        detector = cv2.FaceDetectorYN.create(
            YUNET_MODEL_PATH,
            "",
            (320, 320),
            YUNET_SCORE_THRESHOLD,
            YUNET_NMS_THRESHOLD,
            YUNET_TOP_K,
        )
        # Probe once, so a corrupt or incompatible file fails here at startup
        # instead of on the first request.
        detector.setInputSize((64, 64))
        detector.detect(np.zeros((64, 64, 3), dtype=np.uint8))
        return detector
    except Exception as e:
        print(f"[WARN] Failed to load YuNet: {e}")
        return None


def _load_cascade():
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    return None if cascade.empty() else cascade


_yunet = _load_yunet()
if _yunet is not None:
    print("[OK] Face detector: YuNet")
else:
    _cascade = _load_cascade()
    if _cascade is not None:
        print(
            "[WARN] Face detector: Haar cascade fallback (weaker). "
            "Download face_detection_yunet_2023mar.onnx into backend/weights/ for better results."
        )
    else:
        print("[ERR] No face detector available")


def get_face_detector_name() -> str:
    if _yunet is not None:
        return "yunet"
    if _cascade is not None:
        return "haar"
    return "none"


def _as_bgr(frame: np.ndarray) -> np.ndarray:
    if frame.ndim == 2:
        return cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
    if frame.shape[2] == 4:
        return cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)
    return frame


def _detect_yunet(frame_bgr: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    ih, iw = frame_bgr.shape[:2]
    scale = min(1.0, DETECT_MAX_SIDE / max(ih, iw))
    if scale < 1.0:
        small = cv2.resize(
            frame_bgr,
            (max(1, round(iw * scale)), max(1, round(ih * scale))),
            interpolation=cv2.INTER_AREA,
        )
    else:
        small = frame_bgr

    sh, sw = small.shape[:2]
    with _lock:
        _yunet.setInputSize((sw, sh))
        _, faces = _yunet.detect(small)

    if faces is None or len(faces) == 0:
        return None

    # Each row is x, y, w, h, five landmark points, score. Take the largest face.
    best = max(faces, key=lambda f: f[2] * f[3])
    fx, fy, fw, fh = (float(v) / scale for v in best[:4])
    if min(fw, fh) < MIN_FACE_SIDE:
        return None
    return int(round(fx)), int(round(fy)), int(round(fw)), int(round(fh))


def _detect_haar(frame_bgr: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    with _lock:
        faces = _cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(max(MIN_FACE_SIDE, 40), max(MIN_FACE_SIDE, 40)),
        )
    if len(faces) == 0:
        return None
    fx, fy, fw, fh = max(faces, key=lambda b: b[2] * b[3])
    return int(fx), int(fy), int(fw), int(fh)


def detect_and_crop_face(frame_bgr: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[List[int]]]:
    """Find the largest face in a BGR image and return ``(face_crop, [x, y, w, h])``.

    The crop is a square around the face with a margin. ``(None, None)`` means no
    usable face was found. The box describes the crop, in original coordinates.
    """
    if frame_bgr is None or frame_bgr.size == 0:
        return None, None

    frame_bgr = _as_bgr(frame_bgr)

    if _yunet is not None:
        box = _detect_yunet(frame_bgr)
    elif _cascade is not None:
        box = _detect_haar(frame_bgr)
    else:
        box = None

    if box is None:
        return None, None

    fx, fy, fw, fh = box
    ih, iw = frame_bgr.shape[:2]

    center_x = fx + fw // 2
    center_y = fy + fh // 2
    half = int(max(fw, fh) * CROP_MARGIN) // 2

    left = max(0, center_x - half)
    top = max(0, center_y - half)
    right = min(iw, center_x + half)
    bottom = min(ih, center_y + half)

    if right - left < MIN_CROP_SIDE or bottom - top < MIN_CROP_SIDE:
        return None, None

    return frame_bgr[top:bottom, left:right], [left, top, right - left, bottom - top]
