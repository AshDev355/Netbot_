from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.services.security import hash_password, verify_password, create_access_token
from app.services.face.enrollment import enroll_face_new_user, enroll_face
from app.services.face.verification import verify_face, FaceVerificationError
from app.services.face.recognition import FaceDetectionError
from app.services.google_oauth import verify_google_id_token, GoogleAuthError
from app.services.supabase import supabase
from app.dependencies import get_current_user
from app.schemas.auth import SignupResponse, TokenResponse, FaceLoginResponse, GoogleAuthRequest, MeResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
limiter = Limiter(key_func=get_remote_address)


def _fetch_profile_by_email(email: str):
    try:
        res = (
            supabase.table("profiles")
            .select("id, email, password_hash, face_embedding, google_id")
            .eq("email", email)
            .single()
            .execute()
        )
        return res.data
    except Exception:
        return None


@router.post("/signup", response_model=SignupResponse)
@limiter.limit("10/minute")
async def signup(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    face_image: UploadFile = File(...),
):
    if _fetch_profile_by_email(email):
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        user = enroll_face_new_user(email, hash_password(password), await face_image.read())
    except FaceDetectionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    token = create_access_token(user_id=user["id"], email=email)
    return SignupResponse(access_token=token, user_id=user["id"])


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
async def login(request: Request, email: str = Form(...), password: str = Form(...)):
    profile = _fetch_profile_by_email(email)
    # profile.get("password_hash") is None for Google-only accounts -- treat
    # that the same as "wrong password" rather than crashing bcrypt on None,
    # and without revealing which case it was (avoids leaking account/auth-method info).
    if not profile or not profile.get("password_hash") or not verify_password(password, profile["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user_id=profile["id"], email=profile["email"])
    return TokenResponse(access_token=token, user_id=profile["id"])


@router.post("/face-login", response_model=FaceLoginResponse)
@limiter.limit("10/minute")
async def face_login(request: Request, email: str = Form(...), face_image: UploadFile = File(...)):
    """Rate-limited: face embedding is expensive to compute."""
    try:
        match = verify_face(email, await face_image.read())
    except FaceVerificationError as e:
        raise HTTPException(status_code=401, detail=str(e))

    token = create_access_token(user_id=match["id"], email=match["email"])
    return FaceLoginResponse(access_token=token, user_id=match["id"], similarity=match["similarity"])


@router.post("/google", response_model=TokenResponse)
@limiter.limit("20/minute")
async def google_auth(request: Request, body: GoogleAuthRequest):
    """Sign up OR sign in with Google -- one endpoint for both, same as most
    apps' 'Continue with Google' button. Verifies the ID token the frontend
    got from Google Identity Services, then finds-or-creates a profile by
    email.

    Unlike /auth/signup, this never requires a face image: Google-created
    accounts start with no password and no face embedding, and can add
    either later (password isn't settable via the API today; face can be
    added via /auth/re-enroll-face once signed in).

    If an email that already has a password and/or face account signs in
    with Google for the first time, we link the google_id onto the existing
    profile rather than creating a duplicate -- safe to do because Google
    has already verified the person owns that email address.
    """
    try:
        claims = verify_google_id_token(body.id_token)
    except GoogleAuthError as e:
        raise HTTPException(status_code=401, detail=str(e))

    profile = _fetch_profile_by_email(claims["email"])

    if profile:
        user_id = profile["id"]
        if not profile.get("google_id"):
            supabase.table("profiles").update({"google_id": claims["google_id"]}).eq(
                "id", user_id
            ).execute()
    else:
        res = (
            supabase.table("profiles")
            .insert({
                "email": claims["email"],
                "password_hash": None,
                "google_id": claims["google_id"],
            })
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create profile")
        user_id = res.data[0]["id"]

    token = create_access_token(user_id=user_id, email=claims["email"])
    return TokenResponse(access_token=token, user_id=user_id)


@router.get("/me", response_model=MeResponse)
async def get_me(user=Depends(get_current_user)):
    """Tells the frontend the caller's actual account state -- specifically
    whether a face is on file. Needed because Google sign-ups start with no
    face enrolled, so Settings can't just always say 'Re-enroll Face ID';
    it needs to know when to say 'Add Face ID' instead.
    """
    res = (
        supabase.table("profiles")
        .select("id, email, face_embedding, password_hash")
        .eq("id", user["user_id"])
        .single()
        .execute()
    )
    profile = res.data
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return MeResponse(
        id=profile["id"],
        email=profile["email"],
        has_face=bool(profile.get("face_embedding")),
        has_password=bool(profile.get("password_hash")),
    )


@router.post("/re-enroll-face")
@limiter.limit("5/minute")
async def re_enroll_face(request: Request, face_image: UploadFile = File(...), user=Depends(get_current_user)):
    """Overwrites the caller's stored face embedding. Requires a valid JWT --
    i.e. you must already be signed in (by password or existing face)."""
    try:
        enroll_face(user["user_id"], await face_image.read())
    except FaceDetectionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Face re-enrolled"}


@router.delete("/me")
async def delete_account(user=Depends(get_current_user)):
    """Deletes the caller's profile. All related data (sessions, documents,
    memories) cascades via FK on delete cascade -- see schema.sql.
    Note: files in Supabase Storage are NOT auto-deleted; add a cleanup job
    for production."""
    supabase.table("profiles").delete().eq("id", user["user_id"]).execute()
    return {"deleted": user["user_id"]}
