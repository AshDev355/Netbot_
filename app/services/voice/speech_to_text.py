import os
import tempfile

import whisper

_whisper_model = None


def _get_model():
    global _whisper_model
    if _whisper_model is None:
        # "base" balances speed/accuracy; bump to "small"/"medium" if
        # transcription quality on accents/background noise isn't good enough.
        _whisper_model = whisper.load_model("base")
    return _whisper_model


def transcribe(file_bytes: bytes, filename: str) -> dict:
    """Requires ffmpeg on the host (not a pip package) -- whisper shells out to it."""
    suffix = os.path.splitext(filename or "")[1] or ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        result = _get_model().transcribe(tmp_path)
    finally:
        os.remove(tmp_path)

    return {"text": result.get("text", "").strip(), "language": result.get("language")}
