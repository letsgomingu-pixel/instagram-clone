from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import User
from app.services.email import EmailDeliveryError, send_auth_email


def request_username_reminder(db: Session, email: str) -> None:
    user = db.scalar(select(User).where(User.email.ilike(email.strip()), User.is_active.is_(True)))
    if not user:
        return

    login_url = f"{settings.frontend_url.rstrip('/')}/login"
    reset_url = f"{settings.frontend_url.rstrip('/')}/find-account?tab=password"
    try:
        send_auth_email(
            to=user.email,
            subject="아이디(사용자명) 안내 — i am not a fishmonger",
            body=(
                f"안녕하세요 {user.full_name}님,\n\n"
                f"요청하신 계정의 사용자명(아이디)은 아래와 같습니다.\n\n"
                f"  @{user.username}\n\n"
                f"로그인: {login_url}\n"
                f"이메일 주소({user.email})로도 로그인할 수 있습니다.\n\n"
                f"비밀번호를 잊으셨다면 비밀번호 찾기를 이용해 주세요.\n"
                f"{reset_url}\n\n"
                f"요청하지 않으셨다면 이 메일을 무시하세요."
            ),
        )
    except EmailDeliveryError as exc:
        raise HTTPException(
            status_code=503,
            detail="이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        ) from exc
