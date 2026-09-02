"""Chat endpoint integration would require mocking the Supabase client and
the Gemini client end to end. That's covered at the unit level instead:
- policy enforcement -> test_safety.py
- memory extraction/retrieval -> test_memory.py
- tool dispatch -> test_tools.py
This file is a placeholder for a real integration test using FastAPI's
TestClient once supabase/gemini test doubles exist (e.g. via a Supabase
local dev instance or a recorded-response fixture)."""

import pytest


@pytest.mark.skip(reason="Requires a mocked/local Supabase + Gemini client -- see module docstring")
def test_chat_endpoint_full_flow():
    pass
