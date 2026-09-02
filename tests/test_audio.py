import io
import pytest
from fastapi import UploadFile

from app.utils.file_validation import validate_upload, FileValidationError, MAX_AUDIO_BYTES


def _upload(filename: str) -> UploadFile:
    return UploadFile(filename=filename, file=io.BytesIO(b"fake-bytes"))


def test_validate_audio_accepts_allowed_extension():
    validate_upload(_upload("clip.wav"), b"some audio bytes", kind="audio")  # should not raise


def test_validate_audio_rejects_bad_extension():
    with pytest.raises(FileValidationError):
        validate_upload(_upload("clip.exe"), b"some audio bytes", kind="audio")


def test_validate_audio_rejects_empty_file():
    with pytest.raises(FileValidationError):
        validate_upload(_upload("clip.wav"), b"", kind="audio")


def test_validate_audio_rejects_oversized_file():
    with pytest.raises(FileValidationError):
        validate_upload(_upload("clip.wav"), b"x" * (MAX_AUDIO_BYTES + 1), kind="audio")
