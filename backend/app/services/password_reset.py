import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import User
from app.models.password_reset_token import PasswordResetToken
from app.services.email import send_email
from app.utils.security import hash_password


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def request_password_reset(db: Session, email: str) -> None:
    user = db.scalar(select(User).where(User.email.ilike(email.strip()), User.is_active.is_(True)))
    if not user:
        return

    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    db.add(PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    db.commit()

    reset_url = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
    send_email(
        to=user.email,
        subject="비밀번호 재설정 — i am not a fishmonger",
        body=(
            f"안녕하세요 {user.username}님,\n\n"
            f"비밀번호 재설정을 요청하셨습니다. 아래 링크를 클릭해 새 비밀번호를 설정하세요.\n\n"
            f"{reset_url}\n\n"
            f"링크는 1시간 동안 유효합니다.\n"
            f"요청하지 않으셨다면 이 메일을 무시하세요."
        ),
    )


def reset_password(db: Session, token: str, new_password: str) -> None:
    token_hash = _hash_token(token.strip())
    row = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
        )
    )
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.get(User, row.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.password_hash = hash_password(new_password)
    row.used_at = datetime.now(timezone.utc)
    db.commit()
