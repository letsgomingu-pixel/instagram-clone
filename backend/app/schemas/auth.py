from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import UserOut


class LoginRequest(BaseModel):
    username: str
    password: str
    totp_code: str | None = Field(default=None, min_length=6, max_length=6)


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30)
    full_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        import re

        if not re.fullmatch(r"[a-zA-Z0-9._]+", v):
            raise ValueError("Username may only contain letters, numbers, . and _")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
