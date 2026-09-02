from pydantic import BaseModel


class MemoryItem(BaseModel):
    id: str
    content: str
    created_at: str


class CreateMemoryRequest(BaseModel):
    content: str
