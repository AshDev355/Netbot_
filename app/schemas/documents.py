from pydantic import BaseModel


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    chunks_indexed: int
    status: str


class Source(BaseModel):
    chunk_index: int
    similarity: float


class AskResponse(BaseModel):
    answer: str
    sources: list[Source]


class DocumentSummary(BaseModel):
    id: str
    filename: str
    status: str
    created_at: str
