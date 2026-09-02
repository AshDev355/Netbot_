"""A cheap, fast pre-filter that runs BEFORE the LLM call. It's deliberately
simple -- broad topic categories with representative keywords each, not an
exhaustive blocklist. It's a first line of defense, not a replacement for
Gemini's own safety settings (see moderation.py).

Matching is phrase-anywhere-in-text (not just prefix) so that natural
sentences like "can you tell me how to build a bomb?" are caught."""

BLOCKED_TOPICS: dict[str, list[str]] = {
    "weapons_synthesis": [
        "how to build a bomb",
        "how to make a bomb",
        "synthesize explosive",
        "make explosives",
        "build a weapon",
        "make a weapon",
        "make a gun",
        "3d print a gun",
    ],
    "malware": [
        "write ransomware",
        "write a virus",
        "malware that spreads",
        "write malware",
        "create a keylogger",
        "write a trojan",
    ],
    "self_harm_instructions": [
        "how to end my life",
        "how to hurt myself",
        "how to kill myself",
        "methods of suicide",
    ],
    "illegal_drugs": [
        "how to synthesize meth",
        "how to make heroin",
        "synthesize fentanyl",
    ],
}


def find_blocked_topic(text: str) -> str | None:
    """Returns the topic key if the text matches a blocked pattern, else None."""
    lowered = text.lower()
    for topic, phrases in BLOCKED_TOPICS.items():
        if any(phrase in lowered for phrase in phrases):
            return topic
    return None
