import hashlib
import hmac
import logging
import re
import secrets
from datetime import datetime, timezone

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_SOLAPI_URL = "https://api.solapi.com/messages/v4/send"


def normalize_kr_mobile(phone: str) -> str | None:
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("82"):
        digits = "0" + digits[2:]
    if re.fullmatch(r"01[016789]\d{7,8}", digits):
        return digits
    return None


def normalize_kr_sender(phone: str) -> str | None:
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("82"):
        digits = "0" + digits[2:]
    if re.fullmatch(r"0\d{7,11}", digits):
        return digits
    return None


def send_pickup_sms(*, phone: str, text: str, subject: str) -> None:
    to = normalize_kr_mobile(phone)
    sender = normalize_kr_sender(settings.solapi_sender)
    if not to or not sender:
        logger.info("[sms] skipped invalid phone to=%s", phone)
        return
    if not settings.sms_configured:
        logger.info("[sms] not configured — to=%s text=%s", to, text)
        return
    try:
        nbytes = len(text.encode("euc-kr"))
    except UnicodeEncodeError:
        nbytes = len(text.encode("utf-8"))
    message = {"to": to, "from": sender, "text": text}
    if nbytes > 90:
        message["type"] = "LMS"
        message["subject"] = subject
    else:
        message["type"] = "SMS"
    deliver_sms(message)


def deliver_sms(message: dict) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    salt = secrets.token_hex(16)
    signature = hmac.new(
        settings.solapi_api_secret.encode(),
        f"{now}{salt}".encode(),
        hashlib.sha256,
    ).hexdigest()
    response = httpx.post(
        _SOLAPI_URL,
        headers={
            "Authorization": (
                "HMAC-SHA256 "
                f"apiKey={settings.solapi_api_key}, date={now}, salt={salt}, signature={signature}"
            ),
            "Content-Type": "application/json",
        },
        json={"message": message},
        timeout=15,
    )
    response.raise_for_status()
    logger.info("[sms] sent to=%s type=%s", message["to"], message["type"])
