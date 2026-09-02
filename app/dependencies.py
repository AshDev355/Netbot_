from fastapi import Header, HTTPException, status
from jose import jwt, JWTError

from app.config import settings


def get_current_user(authorization: str = Header(None)):
    """Reads the Authorization header, verifies our own JWT, and returns
    {"user_id": ..., "email": ...}. Works the same whether the token came
    from /auth/login, /auth/face-login, or /auth/signup."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    token = authorization
    if token.lower().startswith("bearer "):
        token = token.split(" ", 1)[1]

    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    return {"user_id": user_id, "email": payload.get("email")}
