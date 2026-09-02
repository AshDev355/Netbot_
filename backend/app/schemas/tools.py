from pydantic import BaseModel
from typing import Any


class ToolCallResult(BaseModel):
    tool: str
    arguments: dict[str, Any]
    result: Any
