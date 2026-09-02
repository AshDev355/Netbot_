from pydantic import BaseModel


class ChatRequest(BaseModel):
    session_id: str
    message: str
    use_memory: bool = True
    use_tools: bool = True
    use_documents: bool = True


class ChatSource(BaseModel):
    document_id: str
    chunk_index: int
    similarity: float


class ChatResponse(BaseModel):
    response: str
    tools_used: list[str] = []
    sources: list[ChatSource] = []
