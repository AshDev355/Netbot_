import math

from google.genai import types

from app.services.llm.gemini import client

# text-embedding-004 was shut down by Google on Jan 14, 2026. gemini-embedding-001
# is the current replacement -- it defaults to 3072 dimensions, so we ask for 768
# via output_dimensionality to match the `vector(768)` column in document_chunks
# and long_term_memories (see schema.sql), and to keep costs/index size down.
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 768

_EMBED_CONFIG = types.EmbedContentConfig(
    task_type="RETRIEVAL_DOCUMENT",
    output_dimensionality=EMBEDDING_DIMENSIONS,
)


def _normalize(vector: list[float]) -> list[float]:
    """gemini-embedding-001 only returns a unit-length vector at its native
    3072 dimensions. When you truncate via output_dimensionality (as we do,
    to 768), Google's docs say to re-normalize yourself -- otherwise cosine
    similarity comparisons (used by match_document_chunks /
    match_long_term_memories in schema.sql) are subtly wrong.
    See: https://ai.google.dev/gemini-api/docs/embeddings#quality-for-smaller-dimensions
    """
    norm = math.sqrt(sum(v * v for v in vector))
    if norm == 0:
        return vector
    return [v / norm for v in vector]


def embed_text(text: str) -> list[float]:
    response = client.models.embed_content(model=EMBEDDING_MODEL, contents=text, config=_EMBED_CONFIG)
    return _normalize(response.embeddings[0].values)


def embed_texts(texts: list[str]) -> list[list[float]]:
    # gemini-embedding-001 embeds one input per request (unlike the old
    # text-embedding-004, it does not aggregate a list into a single vector,
    # but the SDK also doesn't guarantee a true batch call across versions) --
    # looping is slower but safe.
    return [embed_text(t) for t in texts]
