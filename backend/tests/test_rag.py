from app.services.rag.chunking import chunk_text
from app.services.text_extraction import extract_text


def test_chunk_text_empty_input():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_chunk_text_respects_size_and_overlap():
    text = "a" * 2500
    chunks = chunk_text(text, chunk_size=1000, overlap=150)
    assert len(chunks) == 3
    # consecutive chunks should overlap by roughly `overlap` characters
    assert chunks[0][-150:] == chunks[1][:150]


def test_chunk_text_short_input_single_chunk():
    chunks = chunk_text("short document", chunk_size=1000, overlap=150)
    assert chunks == ["short document"]


def test_extract_text_plain_fallback():
    text = extract_text(b"hello world", filename="notes.txt")
    assert text == "hello world"
