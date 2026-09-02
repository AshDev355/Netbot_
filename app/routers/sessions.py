from fastapi import APIRouter, Depends, HTTPException

from app.services.memory.conversation import (
    create_session,
    list_sessions,
    get_session,
    rename_session,
    delete_session,
    get_history,
)
from app.dependencies import get_current_user
from app.schemas.sessions import SessionCreateRequest, SessionRenameRequest, SessionOut, MessageOut

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("/", response_model=SessionOut)
async def create_chat_session(req: SessionCreateRequest, user=Depends(get_current_user)):
    return create_session(user["user_id"], req.title)


@router.get("/", response_model=list[SessionOut])
async def get_chat_sessions(user=Depends(get_current_user)):
    return list_sessions(user["user_id"])


@router.get("/{session_id}/messages", response_model=list[MessageOut])
async def get_chat_session_messages(session_id: str, user=Depends(get_current_user)):
    if not get_session(user["user_id"], session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return get_history(session_id)


@router.patch("/{session_id}", response_model=SessionOut)
async def rename_chat_session(session_id: str, req: SessionRenameRequest, user=Depends(get_current_user)):
    updated = rename_session(user["user_id"], session_id, req.title)
    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")
    return updated


@router.delete("/{session_id}")
async def remove_chat_session(session_id: str, user=Depends(get_current_user)):
    if not get_session(user["user_id"], session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    delete_session(user["user_id"], session_id)
    return {"deleted": session_id}
