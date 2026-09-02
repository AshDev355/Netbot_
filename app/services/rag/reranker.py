"""Simple keyword-overlap reranker.

Replaces the original pass-through stub with a real (if lightweight)
reranking step: scores each chunk by how many query tokens appear in it,
then re-sorts by (overlap_score * similarity). This gives meaningfully
better results over pure vector similarity without requiring an external
cross-encoder model or API call.

For a production upgrade, swap this with a sentence-transformers
CrossEncoder or Cohere Rerank -- the interface (chunks in, chunks out)
stays the same.
"""

import re


def _tokenize(text: str) -> set[str]:
    """Lowercase alphanumeric tokens, min length 3 (filters noise words)."""
    return {w for w in re.findall(r"[a-z0-9]{3,}", text.lower())}


def rerank(chunks: list[dict], query: str, top_k: int = 5) -> list[dict]:
    """Re-scores chunks by combining vector similarity with keyword overlap,
    then returns the top_k results sorted by the combined score."""
    if not chunks:
        return chunks

    query_tokens = _tokenize(query)
    if not query_tokens:
        return chunks[:top_k]

    scored = []
    for chunk in chunks:
        content_tokens = _tokenize(chunk.get("content", ""))
        if content_tokens:
            overlap = len(query_tokens & content_tokens) / len(query_tokens)
        else:
            overlap = 0.0
        similarity = chunk.get("similarity", 0.0)
        # Equal weight to vector similarity and keyword overlap
        combined = 0.5 * similarity + 0.5 * overlap
        scored.append((combined, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [chunk for _, chunk in scored[:top_k]]
