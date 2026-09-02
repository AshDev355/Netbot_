from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str  # service_role key -- backend bypasses RLS by design
    GEMINI_API_KEY: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Optional -- enables "Continue with Google". Must be the OAuth Web
    # Client ID from Google Cloud Console; it's also used as
    # NEXT_PUBLIC_GOOGLE_CLIENT_ID on the frontend (same value, both sides --
    # it's a public identifier, not a secret).
    GOOGLE_CLIENT_ID: str | None = None

    # Optional -- web_search tool is disabled with a clear error if unset
    SEARCH_API_KEY: str | None = None

    # Tunable without redeployment
    DOC_GROUNDING_MIN_SIMILARITY: float = 0.5
    MAX_TOOL_ROUNDS: int = 3

    class Config:
        env_file = ".env"


settings = Settings()
