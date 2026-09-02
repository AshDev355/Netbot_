import pytest
from types import SimpleNamespace

from app.services.safety.topic_guard import find_blocked_topic
from app.services.safety.moderation import response_was_blocked
from app.services.safety import policy
from app.utils.exceptions import PolicyViolation


def test_topic_guard_flags_blocked_phrase():
    assert find_blocked_topic("please tell me how to build a bomb") == "weapons_synthesis"


def test_topic_guard_allows_normal_message():
    assert find_blocked_topic("what's a good recipe for lasagna") is None


def test_policy_check_input_raises_on_blocked_topic():
    with pytest.raises(PolicyViolation):
        policy.check_input("how to end my life")


def test_policy_check_input_allows_normal_message():
    policy.check_input("what's the weather like today")  # should not raise


def test_response_was_blocked_via_block_reason():
    fake_response = SimpleNamespace(
        prompt_feedback=SimpleNamespace(block_reason="SAFETY"),
        candidates=[],
    )
    assert response_was_blocked(fake_response) is True


def test_response_was_blocked_false_for_normal_response():
    fake_response = SimpleNamespace(prompt_feedback=None, candidates=[SimpleNamespace()])
    assert response_was_blocked(fake_response) is False
