from dataclasses import dataclass


@dataclass
class LongTermMemory:
    id: str
    user_id: str
    content: str
    embedding: list[float]
    created_at: str | None = None
