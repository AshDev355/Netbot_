import requests

from app.config import settings
from app.utils.exceptions import ToolExecutionError

# Written against Serper.dev's API shape (cheap, simple JSON-in/JSON-out
# Google search wrapper). Swap the URL/parsing if you use a different
# provider (Tavily, Bing, Brave Search API, etc.) -- the calling contract
# (query in, list[{"title","link","snippet"}] out) stays the same.
SERPER_URL = "https://google.serper.dev/search"


def web_search(query: str, num_results: int = 5) -> list[dict]:
    api_key = getattr(settings, "SEARCH_API_KEY", None)
    if not api_key:
        raise ToolExecutionError(
            "Web search is not configured. "
            "Set SEARCH_API_KEY in your .env file (get a free key at serper.dev) to enable this tool."
        )

    try:
        response = requests.post(
            SERPER_URL,
            headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            json={"q": query, "num": num_results},
            timeout=10,
        )
        response.raise_for_status()
    except requests.Timeout:
        raise ToolExecutionError("Web search timed out. Try again in a moment.")
    except requests.HTTPError as e:
        raise ToolExecutionError(f"Web search API error ({e.response.status_code}): check your SEARCH_API_KEY.")
    except requests.RequestException as e:
        raise ToolExecutionError(f"Web search request failed: {e}")

    data = response.json()
    results = [
        {"title": r.get("title"), "link": r.get("link"), "snippet": r.get("snippet")}
        for r in data.get("organic", [])[:num_results]
    ]
    if not results:
        return [{"title": "No results", "link": "", "snippet": f"No web results found for: {query}"}]
    return results
