from dataclasses import dataclass


@dataclass
class Document:
    id: str
    user_id: str
    filename: str
    storage_path: str
    status: str = "processing"
    created_at: str | None = None


@dataclass
class DocumentChunk:
    document_id: str
    user_id: str
    chunk_index: int
    content: str
    embedding: list[float]
