from dataclasses import dataclass


@dataclass
class ChatSession:
    id: str
    user_id: str
    title: str = "New Chat"
    created_at: str | None = None
