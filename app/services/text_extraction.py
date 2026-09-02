import io
from pypdf import PdfReader
import docx


def extract_text(file_bytes: bytes, filename: str, content_type: str | None = None) -> str:
    """Best-effort text extraction. Scanned/image-only PDFs will return
    little or nothing here -- that's an OCR problem for later, not RAG."""
    name = filename.lower()

    if name.endswith(".pdf") or content_type == "application/pdf":
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if name.endswith(".docx"):
        document = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in document.paragraphs)

    # Fallback: assume plain text
    return file_bytes.decode("utf-8", errors="ignore")
