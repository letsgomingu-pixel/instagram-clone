from datetime import datetime, timezone

import pyotp
from fastapi import HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import LoginSession, User, UserSettings
from app.schemas.security import (
    LoginSessionOut,
    SecuritySummaryOut,
    TwoFactorSetupOut,
)
from app.services.settings import get_or_create_settings
from app.utils.security import verify_password

APP_NAME = "My Instagram"


def parse_device_name(user_agent: str) -> str:
    ua = user_agent.lower()
    if "iphone" in ua:
        return "iPhone"
    if "ipad" in ua:
        return "iPad"
    if "android" in ua:
        return "Android"
    if "windows" in ua:
        return "Windows"
    if "macintosh" in ua or "mac os" in ua:
        return "Mac"
    if "chrome" in ua:
        return "Chrome"
    if "firefox" in ua:
        return "Firefox"
    if "safari" in ua:
        return "Safari"
    return "Unknown device"


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "0.0.0.0"


def session_to_out(session: LoginSession, *, is_current: bool) -> LoginSessionOut:
    return LoginSessionOut(
        id=session.id,
        device_name=session.device_name,
        ip_address=session.ip_address,
        location=session.location,
        is_trusted=session.is_trusted,
        is_current=is_current,
        created_at=session.created_at,
        last_active_at=session.last_active_at,
    )


def record_login_session(db: Session, user: User, request: Request) -> LoginSession:
    user_agent = request.headers.get("user-agent", "Unknown")
    session = LoginSession(
        user_id=user.id,
        ip_address=get_client_ip(request),
        user_agent=user_agent[:500],
        device_name=parse_device_name(user_agent),
        location="Unknown",
        last_active_at=datetime.now(timezone.utc),
    )
    db.add(session)
    db.flush()
    return session


def get_security_summary(db: Session, user: User) -> SecuritySummaryOut:
    settings = get_or_create_settings(db, user)
    trusted_count = (
        db.scalar(
            select(func.count())
            .select_from(LoginSession)
            .where(LoginSession.user_id == user.id, LoginSession.is_trusted.is_(True))
        )
        or 0
    )
    recent_count = (
        db.scalar(
            select(func.count()).select_from(LoginSession).where(LoginSession.user_id == user.id)
        )
        or 0
    )
    return SecuritySummaryOut(
        login_email_alerts=settings.login_email_alerts,
        two_factor_enabled=settings.two_factor_enabled,
        trusted_session_count=trusted_count,
        recent_login_count=recent_count,
    )


def list_login_sessions(
    db: Session,
    user: User,
    *,
    current_session_id: int | None,
) -> list[LoginSessionOut]:
    sessions = db.scalars(
        select(LoginSession)
        .where(LoginSession.user_id == user.id)
        .order_by(LoginSession.last_active_at.desc(), LoginSession.id.desc())
    ).all()
    return [
        session_to_out(session, is_current=current_session_id == session.id)
        for session in sessions
    ]


def delete_login_session(
    db: Session,
    user: User,
    session_id: int,
    *,
    current_session_id: int | None,
) -> None:
    session = db.scalar(
        select(LoginSession).where(LoginSession.id == session_id, LoginSession.user_id == user.id)
    )
    if not session:
        raise HTTPException(status_code=404, detail="Login session not found")
    if current_session_id is not None and session.id == current_session_id:
        raise HTTPException(status_code=400, detail="Cannot revoke the current session")
    db.delete(session)
    db.commit()


def update_login_session_trust(
    db: Session,
    user: User,
    session_id: int,
    *,
    is_trusted: bool,
    current_session_id: int | None = None,
) -> LoginSessionOut:
    session = db.scalar(
        select(LoginSession).where(LoginSession.id == session_id, LoginSession.user_id == user.id)
    )
    if not session:
        raise HTTPException(status_code=404, detail="Login session not found")
    session.is_trusted = is_trusted
    db.commit()
    db.refresh(session)
    return session_to_out(session, is_current=current_session_id == session.id)


def update_login_email_alerts(db: Session, user: User, enabled: bool) -> SecuritySummaryOut:
    settings = get_or_create_settings(db, user)
    settings.login_email_alerts = enabled
    db.commit()
    return get_security_summary(db, user)


def verify_totp_code(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return bool(totp.verify(code, valid_window=1))


def setup_two_factor(db: Session, user: User) -> TwoFactorSetupOut:
    settings = get_or_create_settings(db, user)
    if settings.two_factor_enabled:
        raise HTTPException(status_code=400, detail="Two-factor authentication is already enabled")

    secret = pyotp.random_base32()
    settings.two_factor_secret = secret
    settings.two_factor_enabled = False
    db.commit()

    totp = pyotp.TOTP(secret)
    otpauth_url = totp.provisioning_uri(name=user.email, issuer_name=APP_NAME)
    return TwoFactorSetupOut(secret=secret, otpauth_url=otpauth_url)


def enable_two_factor(db: Session, user: User, code: str) -> SecuritySummaryOut:
    settings = get_or_create_settings(db, user)
    if settings.two_factor_enabled:
        raise HTTPException(status_code=400, detail="Two-factor authentication is already enabled")
    if not settings.two_factor_secret:
        raise HTTPException(status_code=400, detail="Run 2FA setup first")

    if not verify_totp_code(settings.two_factor_secret, code):
        raise HTTPException(status_code=400, detail="Invalid authentication code")

    settings.two_factor_enabled = True
    db.commit()
    return get_security_summary(db, user)


def disable_two_factor(db: Session, user: User, password: str, code: str) -> SecuritySummaryOut:
    settings = get_or_create_settings(db, user)
    if not settings.two_factor_enabled or not settings.two_factor_secret:
        raise HTTPException(status_code=400, detail="Two-factor authentication is not enabled")
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if not verify_totp_code(settings.two_factor_secret, code):
        raise HTTPException(status_code=400, detail="Invalid authentication code")

    settings.two_factor_enabled = False
    settings.two_factor_secret = None
    db.commit()
    return get_security_summary(db, user)


def user_requires_2fa(db: Session, user: User) -> bool:
    settings = db.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
    return bool(settings and settings.two_factor_enabled and settings.two_factor_secret)


def verify_login_totp(db: Session, user: User, code: str | None) -> None:
    settings = db.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
    if not settings or not settings.two_factor_enabled or not settings.two_factor_secret:
        return
    if not code:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "2FA required", "requires_2fa": True},
        )
    if not verify_totp_code(settings.two_factor_secret, code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
