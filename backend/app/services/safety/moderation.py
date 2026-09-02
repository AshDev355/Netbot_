from google.genai import types

# Gemini's built-in safety categories. BLOCK_MEDIUM_AND_ABOVE is a reasonable
# default -- tighten to BLOCK_LOW_AND_ABOVE for a stricter deployment.
DEFAULT_SAFETY_SETTINGS = [
    types.SafetySetting(category=cat, threshold="BLOCK_MEDIUM_AND_ABOVE")
    for cat in [
        "HARM_CATEGORY_HARASSMENT",
        "HARM_CATEGORY_HATE_SPEECH",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "HARM_CATEGORY_DANGEROUS_CONTENT",
    ]
]


def response_was_blocked(response) -> bool:
    """Gemini sets prompt_feedback.block_reason or an empty candidates list
    when its own safety filters trip, rather than raising an exception."""
    feedback = getattr(response, "prompt_feedback", None)
    if feedback and getattr(feedback, "block_reason", None):
        return True
    candidates = getattr(response, "candidates", None)
    if not candidates:
        return True
    # A candidate with finish_reason SAFETY is also blocked
    for candidate in candidates:
        finish = getattr(candidate, "finish_reason", None)
        if finish and str(finish) in ("SAFETY", "FinishReason.SAFETY"):
            return True
    return False
