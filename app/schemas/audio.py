from pydantic import BaseModel


class TranscriptionResponse(BaseModel):
    text: str
    language: str | None = None
