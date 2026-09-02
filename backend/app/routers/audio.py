from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.services.voice.speech_to_text import transcribe
from app.services.voice.text_to_speech import synthesize
from app.utils.file_validation import validate_upload, FileValidationError
from app.dependencies import get_current_user
from app.schemas.audio import TranscriptionResponse

router = APIRouter(prefix="/audio", tags=["Audio"])


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Speech-to-text. ffmpeg must be installed on the host (not pip-installable)."""
    contents = await file.read()

    try:
        validate_upload(file, contents, kind="audio")
    except FileValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        result = transcribe(contents, file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    return TranscriptionResponse(**result)


@router.post("/speak")
async def synthesize_speech(text: str = Form(...), lang: str = Form("en"), user=Depends(get_current_user)):
    """Text-to-speech. Returns an MP3 stream."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="text cannot be empty")

    try:
        buffer = synthesize(text, lang)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {e}")

    return StreamingResponse(buffer, media_type="audio/mpeg")
