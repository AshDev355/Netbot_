import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.routers import auth, chat, docs, audio, memory, tools, sessions
from app.utils.logging import configure_logging

configure_logging()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="NetBot API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Build allowed origins: always include localhost dev origins plus any
# FRONTEND_ORIGIN set in the environment for production deployments.
_origins = ["http://localhost:3000", "http://localhost:5173"]
_prod_origin = os.getenv("FRONTEND_ORIGIN", "").strip()
if _prod_origin:
    _origins.append(_prod_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(docs.router)
app.include_router(audio.router)
app.include_router(memory.router)
app.include_router(tools.router)
app.include_router(sessions.router)


@app.get("/")
def home():
    return {"message": "NetBot backend running"}
