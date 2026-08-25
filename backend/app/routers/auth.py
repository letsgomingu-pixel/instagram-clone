from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import or_, select

from app.dependencies import CurrentUser, DbSession
from app.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserOut
from app.services.security import record_login_session, verify_login_totp
from app.services.settings import get_or_create_settings
from app.services.users import build_user_out
from app.utils.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: DbSession):
    identifier = body.username.strip()
    user = db.scalar(
        select(User).where(or_(User.email == identifier, User.username == identifier))
    )
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    verify_login_totp(db, user, body.totp_code)

    session = record_login_session(db, user, request)
    db.commit()
    db.refresh(session)

    token = create_access_token(user.id, user.username, session_id=session.id)
    return TokenResponse(access_token=token, user=build_user_out(db, user, user))


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, request: Request, db: DbSession):
    existing = db.scalar(
        select(User).where(or_(User.email == body.email, User.username == body.username))
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email or username already taken")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
    )
    db.add(user)
    db.flush()
    get_or_create_settings(db, user, commit=False)
    session = record_login_session(db, user, request)
    db.commit()
    db.refresh(user)
    db.refresh(session)

    token = create_access_token(user.id, user.username, session_id=session.id)
    return TokenResponse(access_token=token, user=build_user_out(db, user, user))


@router.get("/me", response_model=UserOut)
def me(current_user: CurrentUser, db: DbSession):
    return build_user_out(db, current_user, current_user)
