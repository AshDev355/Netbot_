from app.services.supabase import supabase
from app.services.rag.embeddings import embed_text


def retrieve_chunks(document_id: str, user_id: str, question: str, top_k: int = 5) -> list[dict]:
    query_embedding = embed_text(question)

    matches = supabase.rpc(
        "match_document_chunks",
        {
            "query_embedding": query_embedding,
            "match_document_id": document_id,
            "match_user_id": user_id,
            "match_count": top_k,
        },
    ).execute()

    return matches.data or []


def retrieve_chunks_for_user(user_id: str, question: str, top_k: int = 5) -> list[dict]:
    """Like retrieve_chunks, but searches across every 'ready' document the
    user has uploaded instead of one specific document. Used to ground
    general /chat conversation in the user's document library."""
    query_embedding = embed_text(question)

    matches = supabase.rpc(
        "match_chunks_for_user",
        {
            "query_embedding": query_embedding,
            "match_user_id": user_id,
            "match_count": top_k,
        },
    ).execute()

    return matches.data or []
