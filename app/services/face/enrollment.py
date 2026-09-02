import json

from app.services.face.recognition import extract_embedding
from app.services.supabase import supabase


def enroll_face(user_id: str, image_bytes: bytes) -> None:
    """Overwrites the stored face embedding for a user. Used at signup, and
    could be reused for a 're-enroll my face' settings flow later."""
    embedding = extract_embedding(image_bytes)
    supabase.table("profiles").update({"face_embedding": json.dumps(embedding)}).eq("id", user_id).execute()


def enroll_face_new_user(email: str, password_hash: str, image_bytes: bytes) -> dict:
    embedding = extract_embedding(image_bytes)
    res = (
        supabase.table("profiles")
        .insert({"email": email, "password_hash": password_hash, "face_embedding": json.dumps(embedding)})
        .execute()
    )
    if not res.data:
        raise RuntimeError("Failed to create profile")
    return res.data[0]
