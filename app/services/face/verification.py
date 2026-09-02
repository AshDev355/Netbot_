import json

import numpy as np

from app.services.face.recognition import extract_embedding, FaceDetectionError
from app.services.supabase import supabase

# Cosine-similarity threshold for Facenet512.
# 0.70 is a conservative starting point — increase toward 0.80 to be stricter,
# decrease toward 0.60 to be more permissive (tradeoff: false-accepts vs false-rejects).
FACE_MATCH_THRESHOLD = 0.70


class FaceVerificationError(Exception):
    pass


def verify_face(email: str, image_bytes: bytes) -> dict:
    """Verifies a live face against the stored enrolment embedding.
    Returns the matched profile dict on success; raises FaceVerificationError on failure."""
    try:
        profile_res = (
            supabase.table("profiles")
            .select("id, email, face_embedding")
            .eq("email", email)
            .single()
            .execute()
        )
        profile = profile_res.data
    except Exception:
        profile = None

    if not profile or not profile.get("face_embedding"):
        raise FaceVerificationError(
            "No face profile found for this email. "
            "Sign up first or use password login if you haven't enrolled your face."
        )

    stored_embedding = np.array(json.loads(profile["face_embedding"]), dtype=np.float32)

    try:
        live_embedding = np.array(extract_embedding(image_bytes), dtype=np.float32)
    except FaceDetectionError as e:
        raise FaceVerificationError(str(e))

    norm_stored = np.linalg.norm(stored_embedding)
    norm_live = np.linalg.norm(live_embedding)
    if norm_stored == 0 or norm_live == 0:
        raise FaceVerificationError("Face embedding is invalid. Please re-enrol your face.")

    similarity = float(np.dot(stored_embedding, live_embedding) / (norm_stored * norm_live))

    if similarity < FACE_MATCH_THRESHOLD:
        raise FaceVerificationError(
            "Face did not match. Make sure you are well-lit, your face is centred, "
            "and you are using the same account you enrolled with."
        )

    return {"id": profile["id"], "email": profile["email"], "similarity": similarity}
