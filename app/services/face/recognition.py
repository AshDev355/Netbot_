import time
from pathlib import Path

import numpy as np
import cv2
from deepface import DeepFace

from app.utils.exceptions import NetBotError

# DIAGNOSTIC (temporary): saves every frame that fails face detection here so
# you can open it and see exactly what the camera captured. Delete this and
# the save_debug_frame() call below once signup/login are working reliably.
DEBUG_FRAME_DIR = Path(__file__).resolve().parents[3] / "debug_faces"

# Facenet512 gives 512-dim embeddings and better accuracy than the 128-dim
# Facenet model. The face_embedding column in `profiles` is stored as JSONB
# (not pgvector) so the dimension only needs to be consistent across the
# enrol → verify round-trip, not matched to the document_chunks vector column.
FACE_MODEL = "Facenet512"

# Detector backends, tried in order. "opencv" (Haar cascade) is fast but
# genuinely weak -- it frequently misses faces that are off-angle, partly
# covered (glasses, hijab/headscarf edges, hair), or unevenly lit, and
# raises "no face detected" for perfectly usable photos. "ssd" (OpenCV's
# DNN-based detector) is far more forgiving and needs no extra pip package
# -- deepface auto-downloads its weights the same way it already downloaded
# the Facenet512 weights, so no new dependency risk. We still keep "opencv"
# as a last-resort fallback since it's instant and occasionally catches a
# frame ssd's confidence threshold rejects.
DETECTOR_BACKENDS = ["ssd", "opencv"]


class FaceDetectionError(NetBotError):
    pass


def _save_debug_frame(img: np.ndarray) -> str | None:
    """Best-effort save of a failing frame for visual debugging. Never raises
    -- a debug helper failing shouldn't turn into a 500 on top of the real error."""
    try:
        DEBUG_FRAME_DIR.mkdir(exist_ok=True)
        path = DEBUG_FRAME_DIR / f"failed_{int(time.time() * 1000)}.jpg"
        cv2.imwrite(str(path), img)
        return str(path)
    except Exception:
        return None


def extract_embedding(image_bytes: bytes) -> list[float]:
    """Decodes image bytes and extracts a face embedding vector.
    Raises FaceDetectionError if no face is detected (with every backend
    in DETECTOR_BACKENDS) or the image is invalid."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise FaceDetectionError(
            "Could not decode the face image. Make sure your camera is working and try again."
        )

    last_error: Exception | None = None
    for backend in DETECTOR_BACKENDS:
        try:
            result = DeepFace.represent(
                img_path=img,
                model_name=FACE_MODEL,
                enforce_detection=True,
                detector_backend=backend,
            )
            return result[0]["embedding"]
        except ValueError as e:
            last_error = e
            continue  # try the next backend before giving up
        except Exception as e:
            raise FaceDetectionError(f"Face processing failed: {e}")

    # DIAGNOSTIC (temporary): every backend failed. Log what the backend
    # actually received so we can tell a genuinely bad/blank frame apart
    # from a camera/upload bug -- a near-zero std_dev means a solid-colour
    # (black/blank) frame, which points at the camera not being ready when
    # the snapshot was taken rather than at the detector.
    h, w = img.shape[:2]
    mean_brightness = float(img.mean())
    std_dev = float(img.std())
    print(
        f"[face-debug] decoded image: {w}x{h}px, mean brightness={mean_brightness:.1f} "
        f"(0=black,255=white), std_dev={std_dev:.1f} (near 0 = solid/blank frame)"
    )
    debug_path = _save_debug_frame(img)
    if debug_path:
        print(f"[face-debug] saved the failing frame to: {debug_path} -- open it and look")

    raise FaceDetectionError(
        "No face detected in the image. Make sure your face is clearly visible, "
        f"well-lit, and centred in the frame. ({last_error})"
    )
