from app.services.supabase import supabase
from app.services.rag.embeddings import embed_text

# Explicit trigger phrases -- user is directly asking the bot to remember something.
# Matched anywhere in the lowercased message (not just at the start).
REMEMBER_TRIGGERS = (
    "remember that ",
    "remember: ",
    "please remember ",
    "keep in mind that ",
    "note that ",
    "don't forget that ",
    "make a note that ",
    "save this: ",
    "store this: ",
)


def extract_explicit_memory(user_message: str) -> str | None:
    """Returns the content to store as a long-term memory, or None."""
    lowered = user_message.lower()
    for trigger in REMEMBER_TRIGGERS:
        idx = lowered.find(trigger)
        if idx != -1:
            return user_message[idx + len(trigger):].strip()
    return None


def save_memory(user_id: str, content: str) -> dict:
    # embed_text returns a plain list[float] -- pgvector accepts it directly
    embedding = embed_text(content)
    res = (
        supabase.table("long_term_memories")
        .insert({"user_id": user_id, "content": content, "embedding": embedding})
        .execute()
    )
    return res.data[0] if res.data else {}


def list_memories(user_id: str) -> list[dict]:
    res = (
        supabase.table("long_term_memories")
        .select("id, content, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


def delete_memory(user_id: str, memory_id: str) -> None:
    supabase.table("long_term_memories").delete().eq("id", memory_id).eq("user_id", user_id).execute()
