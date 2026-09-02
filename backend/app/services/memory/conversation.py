from app.services.supabase import supabase


def create_session(user_id: str, title: str = "New Chat") -> dict:
    res = (
        supabase.table("chat_sessions")
        .insert({"user_id": user_id, "title": title})
        .execute()
    )
    if not res.data:
        raise RuntimeError("Failed to create chat session")
    return res.data[0]


def list_sessions(user_id: str) -> list[dict]:
    res = (
        supabase.table("chat_sessions")
        .select("id, title, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


def get_session(user_id: str, session_id: str) -> dict | None:
    res = (
        supabase.table("chat_sessions")
        .select("id, title, created_at")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return res.data


def rename_session(user_id: str, session_id: str, title: str) -> dict | None:
    res = (
        supabase.table("chat_sessions")
        .update({"title": title})
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    return res.data[0] if res.data else None


def delete_session(user_id: str, session_id: str) -> None:
    # chat_history rows cascade-delete via the FK's `on delete cascade` (see schema.sql)
    supabase.table("chat_sessions").delete().eq("id", session_id).eq("user_id", user_id).execute()


def get_history(session_id: str) -> list[dict]:
    res = (
        supabase.table("chat_history")
        .select("role, content")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    return res.data or []


def append_turn(session_id: str, user_id: str, user_message: str, model_reply: str) -> None:
    supabase.table("chat_history").insert(
        [
            {"session_id": session_id, "user_id": user_id, "role": "user", "content": user_message},
            {"session_id": session_id, "user_id": user_id, "role": "model", "content": model_reply},
        ]
    ).execute()
