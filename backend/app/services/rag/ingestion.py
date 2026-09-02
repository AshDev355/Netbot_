import uuid

from app.services.supabase import supabase
from app.services.text_extraction import extract_text
from app.services.rag.chunking import chunk_text
from app.services.rag.embeddings import embed_texts
from app.utils.exceptions import DocumentProcessingError


def ingest_document(file_bytes: bytes, filename: str, content_type: str | None, user_id: str) -> dict:
    # Upload raw file to Supabase Storage for archival (best-effort; non-fatal if it fails)
    storage_path = f"{user_id}/{uuid.uuid4()}_{filename}"
    try:
        supabase.storage.from_("documents").upload(
            storage_path,
            file_bytes,
            {"content-type": content_type or "application/octet-stream"},
        )
    except Exception:
        storage_path = None  # Storage upload failed; we can still index the text

    # Create a document record in processing state
    doc_res = (
        supabase.table("documents")
        .insert({
            "user_id": user_id,
            "filename": filename,
            "storage_path": storage_path,
            "status": "processing",
        })
        .execute()
    )
    if not doc_res.data:
        raise DocumentProcessingError("Failed to create document record")

    document_id = doc_res.data[0]["id"]

    try:
        text = extract_text(file_bytes, filename, content_type)
    except Exception as e:
        supabase.table("documents").update({"status": "failed"}).eq("id", document_id).execute()
        raise DocumentProcessingError(f"Text extraction failed: {e}")

    chunks = chunk_text(text)
    if not chunks:
        supabase.table("documents").update({"status": "failed"}).eq("id", document_id).execute()
        raise DocumentProcessingError(
            "Could not extract any text from this document. "
            "Make sure it is a text-based PDF or DOCX (not a scanned image)."
        )

    try:
        embeddings = embed_texts(chunks)
    except Exception as e:
        supabase.table("documents").update({"status": "failed"}).eq("id", document_id).execute()
        raise DocumentProcessingError(f"Embedding generation failed: {e}")

    # embeddings are already plain Python lists (list[float]) — pgvector accepts them directly
    rows = [
        {
            "document_id": document_id,
            "user_id": user_id,
            "chunk_index": i,
            "content": chunk,
            "embedding": embedding,  # list[float] — no JSON serialisation needed
        }
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]

    try:
        supabase.table("document_chunks").insert(rows).execute()
    except Exception as e:
        supabase.table("documents").update({"status": "failed"}).eq("id", document_id).execute()
        raise DocumentProcessingError(f"Failed to store chunks: {e}")

    supabase.table("documents").update({"status": "ready"}).eq("id", document_id).execute()

    return {
        "document_id": document_id,
        "filename": filename,
        "chunks_indexed": len(chunks),
        "status": "ready",
    }
