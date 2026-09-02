class NetBotError(Exception):
    """Base class for app-specific exceptions."""


class PolicyViolation(NetBotError):
    """Raised when input or output content is blocked by the safety pipeline."""

    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


class ToolExecutionError(NetBotError):
    """Raised when a tool call fails or is invoked with invalid arguments."""


class DocumentProcessingError(NetBotError):
    """Raised when text extraction, chunking, or embedding fails for an upload."""
