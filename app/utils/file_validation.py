from fastapi import UploadFile

from app.utils.exceptions import NetBotError

MAX_DOCUMENT_BYTES = 25 * 1024 * 1024  # 25 MB
MAX_AUDIO_BYTES = 15 * 1024 * 1024  # 15 MB

ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}
ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".webm", ".ogg"}


class FileValidationError(NetBotError):
    pass


def _extension(filename: str) -> str:
    idx = filename.rfind(".")
    return filename[idx:].lower() if idx != -1 else ""


def validate_upload(file: UploadFile, contents: bytes, *, kind: str) -> None:
    """kind: 'document' or 'audio'. Raises FileValidationError on failure."""
    if kind == "document":
        max_bytes, allowed = MAX_DOCUMENT_BYTES, ALLOWED_DOCUMENT_EXTENSIONS
    elif kind == "audio":
        max_bytes, allowed = MAX_AUDIO_BYTES, ALLOWED_AUDIO_EXTENSIONS
    else:
        raise ValueError(f"Unknown validation kind: {kind}")

    if len(contents) == 0:
        raise FileValidationError("Uploaded file is empty")

    if len(contents) > max_bytes:
        raise FileValidationError(f"File exceeds the {max_bytes // (1024 * 1024)}MB limit")

    ext = _extension(file.filename or "")
    if ext and ext not in allowed:
        raise FileValidationError(f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(allowed))}")
