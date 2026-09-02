from pydantic import BaseModel


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str


class SignupResponse(TokenResponse):
    message: str = "User registered successfully"


class FaceLoginResponse(TokenResponse):
    similarity: float


class GoogleAuthRequest(BaseModel):
    id_token: str


class MeResponse(BaseModel):
    id: str
    email: str
    has_face: bool
    has_password: bool
