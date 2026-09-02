from fastapi import APIRouter, UploadFile, File, Form, Body, HTTPException, Depends
from google.genai import types
from pydantic import BaseModel

from app.services.llm.gemini import client, CHAT_MODEL
from app.services.llm.prompts import RAG_ANSWER_PROMPT
from app.services.rag.ingestion import ingest_document
from app.services.rag.retriever import retrieve_chunks
from app.services.rag.reranker import rerank
from app.services.supabase import supabase
from app.utils.file_validation import validate_upload, FileValidationError
from app.utils.exceptions import DocumentProcessingError
from app.dependencies import get_current_user
from app.schemas.documents import UploadResponse, AskResponse, Source

router = APIRouter(prefix="/documents", tags=["Documents"])


class AskRequest(BaseModel):
    question: str


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...), user=Depends(get_current_user)):
    file_bytes = await file.read()

    try:
        validate_upload(file, file_bytes, kind="document")
    except FileValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        result = ingest_document(file_bytes, file.filename, file.content_type, user["user_id"])
    except DocumentProcessingError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return UploadResponse(**result)


@router.post("/{document_id}/ask", response_model=AskResponse)
async def ask_document(
    document_id: str,
    req: AskRequest,
    user=Depends(get_current_user),
):
    """Ask a question scoped to a single document. Uses RAG over that document's chunks."""
    doc = (
        supabase.table("documents")
        .select("id")
        .eq("id", document_id)
        .eq("user_id", user["user_id"])
        .single()
        .execute()
    )
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")

    chunks = retrieve_chunks(document_id, user["user_id"], req.question)
    chunks = rerank(chunks, req.question)
    if not chunks:
        raise HTTPException(status_code=404, detail="No relevant content found in this document")

    context = "\n\n---\n\n".join(c["content"] for c in chunks)
    prompt = RAG_ANSWER_PROMPT.format(context=context, question=req.question)

    response = client.models.generate_content(
        model=CHAT_MODEL,
        contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
    )

    return AskResponse(
        answer=response.text or "",
        sources=[Source(chunk_index=c["chunk_index"], similarity=c["similarity"]) for c in chunks],
    )


@router.get("/")
async def list_documents(user=Depends(get_current_user)):
    res = (
        supabase.table("documents")
        .select("id, filename, status, created_at")
        .eq("user_id", user["user_id"])
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.delete("/{document_id}")
async def delete_document(document_id: str, user=Depends(get_current_user)):
    """Delete a document and all its chunks (cascades via FK)."""
    doc = (
        supabase.table("documents")
        .select("id, storage_path")
        .eq("id", document_id)
        .eq("user_id", user["user_id"])
        .single()
        .execute()
    )
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")

    # Best-effort storage deletion
    storage_path = doc.data.get("storage_path")
    if storage_path:
        try:
            supabase.storage.from_("documents").remove([storage_path])
        except Exception:
            pass  # Storage cleanup is non-fatal

    supabase.table("documents").delete().eq("id", document_id).eq("user_id", user["user_id"]).execute()
    return {"deleted": document_id}


@router.post("/explain")
async def upload_and_explain(
    file: UploadFile = File(...),
    prompt: str = Form("Explain this document in detail."),
    user=Depends(get_current_user),
):
    """Quick one-shot explanation of a document -- doesn't touch the RAG index."""
    file_bytes = await file.read()

    try:
        validate_upload(file, file_bytes, kind="document")
    except FileValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    mime = file.content_type or "application/pdf"
    part = types.Part.from_bytes(data=file_bytes, mime_type=mime)

    response = client.models.generate_content(
        model=CHAT_MODEL,
        contents=[part, prompt],
    )
    return {"filename": file.filename, "explanation": response.text or ""}
