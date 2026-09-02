import io

from gtts import gTTS


def synthesize(text: str, lang: str = "en") -> io.BytesIO:
    tts = gTTS(text=text, lang=lang)
    buffer = io.BytesIO()
    tts.write_to_fp(buffer)
    buffer.seek(0)
    return buffer
