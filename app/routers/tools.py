from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any

from app.services.tools.registry import execute_tool
from app.utils.exceptions import ToolExecutionError
from app.dependencies import get_current_user
from app.schemas.tools import ToolCallResult

router = APIRouter(prefix="/tools", tags=["Tools"])


class ToolInvokeRequest(BaseModel):
    arguments: dict[str, Any] = {}


@router.post("/{tool_name}/invoke", response_model=ToolCallResult)
async def invoke_tool(
    tool_name: str,
    req: ToolInvokeRequest,
    user=Depends(get_current_user),
):
    """Manual tool invocation endpoint — useful for testing tools directly
    or building UI buttons that run a tool without going through /chat."""
    try:
        result = execute_tool(tool_name, req.arguments)
    except ToolExecutionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ToolCallResult(tool=tool_name, arguments=req.arguments, result=result)
