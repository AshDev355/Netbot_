from google import genai
from app.config import settings

# Initialise the official Google GenAI client once at import time.
# All routers/services import `client` from here -- never re-instantiate it.
client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Single source of truth for which chat model we call. gemini-2.5-flash is
# deprecated (scheduled shutdown Oct 16, 2026, and already erroring for some
# accounts ahead of that date). gemini-3.7-flash is the current GA workhorse
# model as of Aug 2026 -- check https://ai.google.dev/gemini-api/docs/models
# before bumping this again, since Google's Flash line moves fast.
CHAT_MODEL = "gemini-3.7-flash"
