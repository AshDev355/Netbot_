def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> list[str]:
    """Character-based sliding window chunker. Good enough for a first RAG
    pass -- swap for a token-aware/sentence-aware splitter later if answer
    quality on long documents needs it."""
    text = text.strip()
    if not text:
        return []

    chunks = []
    start = 0
    length = len(text)

    while start < length:
        end = min(start + chunk_size, length)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == length:
            break
        start = end - overlap

    return chunks
