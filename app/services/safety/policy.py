from app.services.safety.topic_guard import find_blocked_topic
from app.services.safety.moderation import response_was_blocked
from app.utils.exceptions import PolicyViolation


def check_input(text: str) -> None:
    """Run before the LLM call. Raises PolicyViolation to short-circuit."""
    topic = find_blocked_topic(text)
    if topic:
        raise PolicyViolation(f"Message blocked by topic guard: {topic}")


def check_output(response) -> None:
    """Run after the LLM call, on the raw Gemini response object."""
    if response_was_blocked(response):
        raise PolicyViolation("Response blocked by model safety filters")
