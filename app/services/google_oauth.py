from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.config import settings
from app.utils.exceptions import NetBotError

# Reused across requests -- this just wraps an HTTP session used to fetch
# and cache Google's public signing keys.
_google_request = google_requests.Request()


class GoogleAuthError(NetBotError):
    pass


def verify_google_id_token(token: str) -> dict:
    """Verifies a Google Identity Services credential (a signed JWT handed
    to the frontend by Google's `<script src="https://accounts.google.com/gsi/client">`
    button) and returns the claims we care about.

    This checks the signature against Google's public keys, the expiry, and
    that `aud` matches our own GOOGLE_CLIENT_ID -- so a token issued for a
    different app can't be replayed against this backend. Raises
    GoogleAuthError on any failure; callers should treat that as a 401.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise GoogleAuthError(
            "Google sign-in is not configured on this server. Set GOOGLE_CLIENT_ID in your .env file."
        )

    try:
        claims = google_id_token.verify_oauth2_token(
            token, _google_request, settings.GOOGLE_CLIENT_ID
        )
    except ValueError as e:
        # Covers bad signature, expired token, wrong audience/issuer, malformed JWT.
        raise GoogleAuthError(f"Invalid Google credential: {e}")

    if not claims.get("email"):
        raise GoogleAuthError("Google account has no email on file.")
    if not claims.get("email_verified"):
        raise GoogleAuthError("Google account email is not verified.")

    return {
        "email": claims["email"].strip().lower(),
        "google_id": claims["sub"],
        "name": claims.get("name"),
    }
