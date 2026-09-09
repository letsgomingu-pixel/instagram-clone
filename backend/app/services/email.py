import logging
import smtplib
from email.message import EmailMessage

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models import User, UserSettings

logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    """Raised when a required transactional email could not be delivered."""


def _user_wants_order_email(db: Session, user_id: int) -> bool:
    user_settings = db.get(UserSettings, user_id)
    return user_settings is None or user_settings.notify_orders_email


def _send_via_resend(*, to: str, subject: str, body: str) -> None:
    response = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {settings.resend_api_key}"},
        json={
            "from": settings.email_from,
            "to": [to],
            "subject": subject,
            "text": body,
        },
        timeout=15,
    )
    response.raise_for_status()


def _send_via_smtp(*, to: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    if settings.smtp_port == 465:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)
        return

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)


def _deliver_email(*, to: str, subject: str, body: str) -> None:
    if settings.resend_api_key:
        _send_via_resend(to=to, subject=subject, body=body)
        return
    if settings.smtp_configured:
        _send_via_smtp(to=to, subject=subject, body=body)


def send_email(*, to: str, subject: str, body: str) -> None:
    if not to:
        return

    if not settings.should_send_email:
        logger.info("[email] to=%s subject=%s\n%s", to, subject, body)
        return

    try:
        _deliver_email(to=to, subject=subject, body=body)
    except Exception as exc:
        logger.exception("[email] delivery failed to=%s subject=%s", to, subject)
        raise EmailDeliveryError("Email delivery failed") from exc


def send_auth_email(*, to: str, subject: str, body: str) -> None:
    """Send security/verification mail. Requires Resend or SMTP to be configured."""
    if not to:
        return

    if not settings.email_delivery_ready:
        logger.warning(
            "[auth-email] delivery not configured — set RESEND_API_KEY or SMTP_* in .env\n"
            "to=%s subject=%s\n%s",
            to,
            subject,
            body,
        )
        raise EmailDeliveryError("Email delivery is not configured")

    try:
        _deliver_email(to=to, subject=subject, body=body)
        logger.info("[auth-email] sent to=%s subject=%s", to, subject)
    except Exception as exc:
        logger.exception("[auth-email] delivery failed to=%s subject=%s", to, subject)
        raise EmailDeliveryError("Email delivery failed") from exc


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
