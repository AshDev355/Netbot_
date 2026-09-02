from google.genai import types

from app.services.tools.calculator import calculate
from app.services.tools.web_search import web_search
from app.utils.exceptions import ToolExecutionError

# Each entry: name -> (callable, Gemini function declaration)
_TOOLS = {
    "calculator": {
        "fn": lambda args: calculate(args["expression"]),
        "declaration": types.FunctionDeclaration(
            name="calculator",
            description="Evaluate a basic arithmetic expression (+ - * / ** %, parentheses).",
            parameters=types.Schema(
                type="OBJECT",
                properties={"expression": types.Schema(type="STRING", description="e.g. '(4 + 5) * 2'")},
                required=["expression"],
            ),
        ),
    },
    "web_search": {
        "fn": lambda args: web_search(args["query"], args.get("num_results", 5)),
        "declaration": types.FunctionDeclaration(
            name="web_search",
            description="Search the web for current information not in the model's training data.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "query": types.Schema(type="STRING"),
                    "num_results": types.Schema(type="INTEGER"),
                },
                required=["query"],
            ),
        ),
    },
}


def get_tool_declarations() -> list[types.Tool]:
    """Passed as `tools=` on the Gemini generate_content call so the model
    knows what it can invoke."""
    return [types.Tool(function_declarations=[t["declaration"] for t in _TOOLS.values()])]


def execute_tool(name: str, args: dict):
    if name not in _TOOLS:
        raise ToolExecutionError(f"Unknown tool: {name}")
    try:
        return _TOOLS[name]["fn"](args)
    except ToolExecutionError:
        raise
    except Exception as e:
        raise ToolExecutionError(f"Tool '{name}' failed: {e}")
