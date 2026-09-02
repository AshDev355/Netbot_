import pytest

from app.services.tools.calculator import calculate
from app.services.tools.registry import execute_tool
from app.utils.exceptions import ToolExecutionError


def test_calculator_basic_arithmetic():
    assert calculate("2 + 2") == 4
    assert calculate("(4 + 5) * 3 / 2") == pytest.approx(13.5)
    assert calculate("2 ** 10") == 1024


def test_calculator_rejects_unsupported_expressions():
    with pytest.raises(ValueError):
        calculate("__import__('os').system('echo hi')")


def test_registry_unknown_tool_raises():
    with pytest.raises(ToolExecutionError):
        execute_tool("not_a_real_tool", {})


def test_registry_calculator_dispatch():
    result = execute_tool("calculator", {"expression": "3 + 4"})
    assert result == 7
