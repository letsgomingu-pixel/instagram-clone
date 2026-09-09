from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import func, or_, select

from app.dependencies import CurrentUser, DbSession
from app.models import User
from app.schemas.auth import ForgotPasswordRequest, LoginRequest, RegisterRequest, ResetPasswordRequest, TokenResponse
from app.services.email import send_login_alert_email
from app.services.password_reset import request_password_reset, reset_password
from app.schemas.user import UserOut
from app.services.security import maybe_set_trust_token, record_login_session, verify_login_totp
from app.services.settings import get_or_create_settings
from app.services.users import build_user_out
from app.utils.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: DbSession):
    identifier = body.username.strip().lower()
    user = db.scalar(
        select(User).where(
            or_(func.lower(User.email) == identifier, func.lower(User.username) == identifier)
        )
    )
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    verify_login_totp(db, user, body.totp_code, trusted_device_token=body.trusted_device_token)

    session = record_login_session(db, user, request)
    trust_token = maybe_set_trust_token(session, trust_device=body.trust_device)
    db.commit()
    db.refresh(session)

    send_login_alert_email(
        db, user=user, device_name=session.device_name, ip_address=session.ip_address
    )

    token = create_access_token(user.id, user.username, session_id=session.id)
    return TokenResponse(
        access_token=token, user=build_user_out(db, user, user), trust_token=trust_token
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, request: Request, db: DbSession):
    email_taken = db.scalar(
        select(User.id).where(func.lower(User.email) == body.email.strip().lower())
    )
    if email_taken:
        raise HTTPException(status_code=400, detail="Email is already registered")
    username_taken = db.scalar(
        select(User.id).where(func.lower(User.username) == body.username.strip().lower())
    )
    if username_taken:
        raise HTTPException(status_code=400, detail="Username is already taken")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        phone=body.phone,
        postcode=body.postcode,
        address_line1=body.address_line1,
        address_line2=body.address_line2,
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


@router.post("/forgot-password", status_code=204)
def forgot_password(body: ForgotPasswordRequest, db: DbSession):
    request_password_reset(db, body.email)


@router.post("/reset-password", status_code=204)
def reset_password_route(body: ResetPasswordRequest, db: DbSession):
    reset_password(db, body.token, body.password)
