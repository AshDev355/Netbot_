from fastapi import APIRouter, Depends, HTTPException

from app.services.memory.long_term import save_memory, list_memories, delete_memory
from app.dependencies import get_current_user
from app.schemas.memory import MemoryItem, CreateMemoryRequest

router = APIRouter(prefix="/memory", tags=["Memory"])


@router.get("/", response_model=list[MemoryItem])
async def get_memories(user=Depends(get_current_user)):
    return list_memories(user["user_id"])


@router.post("/", response_model=MemoryItem)
async def create_memory(req: CreateMemoryRequest, user=Depends(get_current_user)):
    saved = save_memory(user["user_id"], req.content)
    if not saved:
        raise HTTPException(status_code=500, detail="Failed to save memory")
    return saved


@router.delete("/{memory_id}")
async def remove_memory(memory_id: str, user=Depends(get_current_user)):
    delete_memory(user["user_id"], memory_id)
    return {"deleted": memory_id}
