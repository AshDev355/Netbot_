import os

# Set required env vars before any app module is imported, since
# app/config.py instantiates Settings() at import time.
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_KEY", "test-service-role-key")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret")
