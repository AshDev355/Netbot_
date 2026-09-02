from dataclasses import dataclass


@dataclass
class Message:
    session_id: str
    user_id: str
    role: str  # "user" | "model"
    content: str
    created_at: str | None = None
