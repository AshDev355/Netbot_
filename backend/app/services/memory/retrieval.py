from app.services.supabase import supabase
from app.services.rag.embeddings import embed_text


def retrieve_relevant_memories(user_id: str, query: str, top_k: int = 5, min_similarity: float = 0.5) -> list[dict]:
    """Embeds the query and pulls the closest long-term memories for this
    user via the match_long_term_memories Postgres function (see schema.sql)."""
    query_embedding = embed_text(query)

    res = supabase.rpc(
        "match_long_term_memories",
        {
            "query_embedding": query_embedding,
            "match_user_id": user_id,
            "match_count": top_k,
        },
    ).execute()

    matches = res.data or []
    return [m for m in matches if m.get("similarity", 0) >= min_similarity]


def format_memory_context(memories: list[dict]) -> str | None:
    if not memories:
        return None
    return "\n".join(f"- {m['content']}" for m in memories)
