from app.services.security import hash_password, verify_password, create_access_token
from app.services.google_oauth import verify_google_id_token, GoogleAuthError
from app.dependencies import get_current_user
from app.config import settings
from fastapi import HTTPException
import pytest


def test_password_hash_roundtrip():
    hashed = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", hashed)
    assert not verify_password("wrong password", hashed)


def test_jwt_roundtrip():
    token = create_access_token(user_id="user-123", email="a@b.com")
    result = get_current_user(authorization=f"Bearer {token}")
    assert result["user_id"] == "user-123"
    assert result["email"] == "a@b.com"


def test_missing_auth_header_rejected():
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(authorization=None)
    assert exc_info.value.status_code == 401


def test_garbage_token_rejected():
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(authorization="Bearer not-a-real-token")
    assert exc_info.value.status_code == 401


def test_google_auth_rejects_garbage_credential():
    # No real Google token in a unit test, but a clearly-invalid one must
    # still fail closed with our own error type (not an unhandled crash),
    # regardless of whether GOOGLE_CLIENT_ID is configured in this env.
    original = settings.GOOGLE_CLIENT_ID
    settings.GOOGLE_CLIENT_ID = original or "test-client-id.apps.googleusercontent.com"
    try:
        with pytest.raises(GoogleAuthError):
            verify_google_id_token("not-a-real-jwt")
    finally:
        settings.GOOGLE_CLIENT_ID = original


def test_google_auth_unconfigured_raises_clear_error():
    original = settings.GOOGLE_CLIENT_ID
    settings.GOOGLE_CLIENT_ID = None
    try:
        with pytest.raises(GoogleAuthError, match="not configured"):
            verify_google_id_token("anything")
    finally:
        settings.GOOGLE_CLIENT_ID = original
