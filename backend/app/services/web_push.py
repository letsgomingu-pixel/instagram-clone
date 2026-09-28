import json
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.push_subscription import PushSubscription, VapidKey

logger = logging.getLogger(__name__)


def _public_key_string(vapid: object) -> str:
    from cryptography.hazmat.primitives import serialization
    from py_vapid.utils import b64urlencode

    raw = vapid.public_key.public_bytes(  # type: ignore[attr-defined]
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )
    encoded = b64urlencode(raw)
    return encoded.decode() if isinstance(encoded, bytes) else encoded


def get_or_create_vapid(db: Session) -> VapidKey:
    row = db.scalar(select(VapidKey).limit(1))
    if row:
        return row

    from py_vapid import Vapid01

    vapid = Vapid01()
    vapid.generate_keys()
    private_pem = vapid.private_pem()
    row = VapidKey(
        public_key=_public_key_string(vapid),
        private_key=private_pem.decode() if isinstance(private_pem, bytes) else private_pem,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def save_push_subscription(db: Session, *, user_id: int, endpoint: str, p256dh: str, auth: str) -> None:
    existing = db.scalar(select(PushSubscription).where(PushSubscription.endpoint == endpoint))
    if existing:
        existing.user_id = user_id
        existing.p256dh = p256dh
        existing.auth = auth
    else:
        db.add(
            PushSubscription(
                user_id=user_id,
                endpoint=endpoint,
                p256dh=p256dh,
                auth=auth,
            )
        )
    db.commit()


def deliver_push(*, subscription_info: dict, data: str, vapid_private_key: str, vapid_claims: dict) -> None:
    from pywebpush import webpush

    webpush(
        subscription_info=subscription_info,
        data=data,
        vapid_private_key=vapid_private_key,
        vapid_claims=vapid_claims,
        ttl=12 * 60 * 60,
    )


def send_web_push(db: Session, *, user_id: int, title: str, body: str, url: str) -> None:
    subscriptions = list(db.scalars(select(PushSubscription).where(PushSubscription.user_id == user_id)).all())
    if not subscriptions:
        return

    vapid = get_or_create_vapid(db)
    payload = json.dumps({"title": title, "body": body, "url": url}, ensure_ascii=False)
    claims = {"sub": f"mailto:{settings.email_from}"}
    stale: list[PushSubscription] = []

    for subscription in subscriptions:
        try:
            deliver_push(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                },
                data=payload,
                vapid_private_key=vapid.private_key,
                vapid_claims=claims,
            )
        except Exception as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status in (404, 410):
                stale.append(subscription)
            else:
                logger.exception("Failed to push order alert to user %s", user_id)

    for subscription in stale:
        db.delete(subscription)
    if stale:
        db.commit()
