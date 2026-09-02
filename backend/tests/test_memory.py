from app.services.memory.long_term import extract_explicit_memory
from app.services.memory.retrieval import format_memory_context


def test_extract_explicit_memory_trigger():
    assert extract_explicit_memory("remember that I'm vegetarian") == "I'm vegetarian"
    assert extract_explicit_memory("Remember: my birthday is June 3") == "my birthday is June 3"


def test_extract_explicit_memory_no_trigger():
    assert extract_explicit_memory("what's the weather today") is None


def test_build_chat_prompt_no_context():
    from app.services.llm.prompts import build_chat_prompt

    assert build_chat_prompt("hello") == "hello"


def test_build_chat_prompt_with_document_context():
    from app.services.llm.prompts import build_chat_prompt

    prompt = build_chat_prompt("what's the policy?", document_context="Policy excerpt here.")
    assert "Policy excerpt here." in prompt
    assert "User message: what's the policy?" in prompt


def test_build_chat_prompt_with_both_contexts():
    from app.services.llm.prompts import build_chat_prompt

    prompt = build_chat_prompt("hi", memory_context="- vegetarian", document_context="doc excerpt")
    assert "doc excerpt" in prompt
    assert "- vegetarian" in prompt
    assert "User message: hi" in prompt


def test_format_memory_context_empty():
    assert format_memory_context([]) is None


def test_format_memory_context_bullets():
    memories = [{"content": "vegetarian"}, {"content": "lives in Lahore"}]
    result = format_memory_context(memories)
    assert "- vegetarian" in result
    assert "- lives in Lahore" in result
