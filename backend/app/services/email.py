import logging
import smtplib
from email.message import EmailMessage

from sqlalchemy.orm import Session

from app.config import settings
from app.models import User, UserSettings

logger = logging.getLogger(__name__)


def _user_wants_order_email(db: Session, user_id: int) -> bool:
    user_settings = db.get(UserSettings, user_id)
    return user_settings is None or user_settings.notify_orders_email


def send_email(*, to: str, subject: str, body: str) -> None:
    if not to:
        return

    if not settings.email_enabled:
        logger.info("[email] to=%s subject=%s\n%s", to, subject, body)
        return

    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)


def send_order_email_to_user(
    db: Session,
    *,
    user: User,
    subject: str,
    body: str,
) -> None:
    if not _user_wants_order_email(db, user.id):
        return
    send_email(to=user.email, subject=subject, body=body)


def send_login_alert_email(
    db: Session,
    *,
    user: User,
    device_name: str,
    ip_address: str,
) -> None:
    from sqlalchemy import select

    from app.models import UserSettings

    user_settings = db.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
    if user_settings is not None and not user_settings.login_email_alerts:
        return

    send_email(
        to=user.email,
        subject="새 로그인 알림 — i am not a fishmonger",
        body=(
            f"안녕하세요 {user.username}님,\n\n"
            f"계정에 새 로그인이 감지되었습니다.\n\n"
            f"기기: {device_name}\n"
            f"IP: {ip_address}\n\n"
            f"본인이 아니라면 즉시 비밀번호를 변경하고 보안 설정에서 세션을 종료하세요."
        ),
    )


def send_order_email_to_admins(db: Session, *, subject: str, body: str) -> None:
    from sqlalchemy import select

    admin_emails = db.scalars(
        select(User.email).where(User.is_admin.is_(True), User.is_active.is_(True))
    ).all()
    for email in admin_emails:
        send_email(to=email, subject=subject, body=body)
