"""KG이니시스 웹표준 결제창.

Signkey stays on the server. The browser only receives the signed form fields
and opens INIStdPay with credit/debit card and real-time bank transfer.
체크카드 is paid through the card window (CARD_CheckFlag), not a separate method.
"""

import hashlib
import html
import json
import logging
import re
import time
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models import Order, Payment
from app.schemas.order import InicisCheckoutOut

logger = logging.getLogger(__name__)

# Public test store from the KG이니시스 sample. Used until a merchant MID is set.
TEST_MID = "INIpayTest"
TEST_SIGN_KEY = "SU5JTElURV9UUklQTEVERVNfS0VZU1RS"

IDC_HOSTS = {
    "fc": "fcstdpay.inicis.com",
    "ks": "ksstdpay.inicis.com",
    "stg": "stgstdpay.inicis.com",
}

_EMAIL_RE = re.compile(r"[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

# Card covers 신용카드 and 체크카드. DirectBank is 실시간 계좌이체.
GOPAY_METHODS = "Card:DirectBank"
_ALLOWED_PAY_METHODS = {"card", "vcard", "directbank", "idirectbank"}


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def request_signature(oid: str, price: str, timestamp: str) -> str:
    return sha256_hex(f"oid={oid}&price={price}&timestamp={timestamp}")


def request_verification(oid: str, price: str, sign_key: str, timestamp: str) -> str:
    return sha256_hex(f"oid={oid}&price={price}&signKey={sign_key}&timestamp={timestamp}")


def approval_signature(auth_token: str, timestamp: str) -> str:
    return sha256_hex(f"authToken={auth_token}&timestamp={timestamp}")


def approval_verification(auth_token: str, sign_key: str, timestamp: str) -> str:
    return sha256_hex(f"authToken={auth_token}&signKey={sign_key}&timestamp={timestamp}")


def auth_url_allowed(url: str, idc_name: str) -> bool:
    expected = IDC_HOSTS.get((idc_name or "").strip().lower())
    if not expected:
        return False
    parsed = urlparse(url)
    return parsed.scheme == "https" and parsed.hostname == expected


def _truncate_bytes(value: str, max_bytes: int) -> str:
    encoded = value.encode("utf-8")
    if len(encoded) <= max_bytes:
        return value
    return encoded[:max_bytes].decode("utf-8", errors="ignore")


def _clean_phone(phone: str) -> str:
    cleaned = "".join(ch for ch in phone if ch.isdigit() or ch == "-")
    return (cleaned or "01000000000")[:20]


def _clean_email(email: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9@._-]", "", (email or "").strip())
    if _EMAIL_RE.fullmatch(cleaned):
        return cleaned[:60]
    return "buyer@iamnotafishmonger.com"


def _merchant() -> tuple[str, str]:
    mid = settings.inicis_mid.strip()
    sign_key = settings.inicis_sign_key.strip()
    if mid and sign_key:
        return mid, sign_key
    if mid and not sign_key:
        raise HTTPException(status_code=503, detail="INICIS_SIGN_KEY is not configured")
    return TEST_MID, TEST_SIGN_KEY


def _public_api_base() -> str:
    return settings.frontend_url.rstrip("/") + "/api/v1"


def build_inicis_checkout(
    *,
    payment_id: str,
    amount: int,
    order_name: str,
    buyer_name: str,
    buyer_phone: str,
    buyer_email: str,
    order_id: int,
) -> InicisCheckoutOut:
    mid, sign_key = _merchant()
    price = str(int(amount))
    timestamp = str(int(time.time() * 1000))
    fields = {
        "version": "1.0",
        "gopaymethod": GOPAY_METHODS,
        "mid": mid,
        "oid": payment_id,
        "price": price,
        "timestamp": timestamp,
        "use_chkfake": "Y",
        "signature": request_signature(payment_id, price, timestamp),
        "verification": request_verification(payment_id, price, sign_key, timestamp),
        "mKey": sha256_hex(sign_key),
        "currency": "WON",
        "goodname": _truncate_bytes(order_name, 40) or "상품",
        "buyername": _truncate_bytes(buyer_name.strip(), 30) or "구매자",
        "buyertel": _clean_phone(buyer_phone),
        "buyeremail": _clean_email(buyer_email),
        "returnUrl": f"{_public_api_base()}/payments/inicis/return",
        "closeUrl": f"{_public_api_base()}/payments/inicis/close",
        "acceptmethod": "centerCd(Y):below1000",
        "payViewType": "overlay",
        "charset": "UTF-8",
        "merchantData": f"orderId={order_id}",
    }
    return InicisCheckoutOut(js_url=settings.inicis_js_url, fields=fields)


def _page(title: str, message: str, next_url: str | None = None) -> str:
    safe_title = html.escape(title)
    safe_message = html.escape(message)
    redirect = ""
    if next_url:
        target = json.dumps(next_url)
        redirect = f"""
<script>
const next = {target};
try {{
  if (window.opener) {{
    window.opener.location.href = next;
    window.close();
  }} else if (window.parent && window.parent !== window) {{
    window.parent.location.href = next;
  }} else {{
    window.location.href = next;
  }}
}} catch (e) {{
  window.location.href = next;
}}
</script>
"""
    return f"""<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>{safe_title}</title></head>
<body>
<p>{safe_message}</p>
{redirect}
</body>
</html>
"""


def close_page() -> str:
    return """<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>결제 취소</title></head>
<body>
<script src="https://stdpay.inicis.com/stdjs/INIStdPay_close.js" charset="UTF-8"></script>
<script>
try { parent.INIStdPay.viewOff(); } catch (e) {}
</script>
</body>
</html>
"""


def _load_payment(db: Session, payment_id: str) -> Payment | None:
    return db.scalars(
        select(Payment)
        .where(Payment.payment_id == payment_id)
        .options(
            joinedload(Payment.order).joinedload(Order.product),
            joinedload(Payment.order).joinedload(Order.items),
            joinedload(Payment.order).joinedload(Order.user),
        )
    ).unique().first()


async def _post_inicis(url: str, auth_token: str, price: str) -> dict:
    mid, sign_key = _merchant()
    timestamp = str(int(time.time() * 1000))
    data = {
        "mid": mid,
        "authToken": auth_token,
        "timestamp": timestamp,
        "signature": approval_signature(auth_token, timestamp),
        "verification": approval_verification(auth_token, sign_key, timestamp),
        "charset": "UTF-8",
        "format": "JSON",
        "price": price,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, data=data)
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise HTTPException(status_code=502, detail="Invalid Inicis approval response")
    return body


def _is_allowed_pay_method(pay_method: str) -> bool:
    return pay_method.strip().lower() in _ALLOWED_PAY_METHODS


async def complete_inicis_return(db: Session, form: dict[str, str]) -> str:
    order_number = (form.get("orderNumber") or "").strip()
    payment = _load_payment(db, order_number) if order_number else None
    if not payment:
        return _page("결제 실패", "주문 정보를 찾을 수 없습니다.")

    from app.services.orders import SETTLED_ORDER_STATUSES, confirm_order_paid

    order = payment.order
    next_url = f"{settings.frontend_url.rstrip('/')}/orders/{order.id}"
    if order.status in SETTLED_ORDER_STATUSES:
        return _page("결제 완료", "이미 결제된 주문입니다.", next_url)

    result_code = (form.get("resultCode") or "").strip()
    if result_code != "0000":
        message = form.get("resultMsg") or "결제가 취소되었습니다."
        return _page("결제 취소", message, next_url)

    auth_url = (form.get("authUrl") or "").strip()
    idc_name = (form.get("idc_name") or "").strip()
    auth_token = form.get("authToken") or ""
    if not auth_token or not auth_url_allowed(auth_url, idc_name):
        return _page("결제 실패", "이니시스 승인 주소가 올바르지 않습니다.", next_url)

    mid, _sign_key = _merchant()
    if (form.get("mid") or "").strip() != mid:
        return _page("결제 실패", "상점 정보가 일치하지 않습니다.", next_url)

    try:
        approved = await _post_inicis(auth_url, auth_token, str(payment.amount))
    except Exception:
        logger.exception("Inicis approval failed for order %s", order.id)
        return _page("결제 실패", "이니시스 승인 요청에 실패했습니다.", next_url)

    if str(approved.get("resultCode") or "") != "0000":
        return _page("결제 실패", str(approved.get("resultMsg") or "승인에 실패했습니다."), next_url)

    net_cancel_url = (form.get("netCancelUrl") or "").strip()

    def _needs_cancel() -> bool:
        if str(approved.get("MOID") or "") != payment.payment_id:
            return True
        try:
            paid = int(str(approved.get("TotPrice") or "0"))
        except ValueError:
            return True
        if paid != payment.amount:
            return True
        if not _is_allowed_pay_method(str(approved.get("payMethod") or "")):
            return True
        return False

    if _needs_cancel():
        if auth_url_allowed(net_cancel_url, idc_name):
            try:
                await _post_inicis(net_cancel_url, auth_token, str(payment.amount))
            except Exception:
                logger.exception("Inicis net-cancel failed for order %s", order.id)
        return _page("결제 실패", "결제 금액이나 결제수단이 주문과 일치하지 않아 취소했습니다.", next_url)

    try:
        confirm_order_paid(
            db,
            order,
            portone_tx_id=str(approved.get("tid") or "")[:100] or None,
            raw_webhook=json.dumps(approved, ensure_ascii=False),
        )
    except Exception:
        logger.exception("Failed to save Inicis payment for order %s", order.id)
        if auth_url_allowed(net_cancel_url, idc_name):
            try:
                await _post_inicis(net_cancel_url, auth_token, str(payment.amount))
            except Exception:
                logger.exception("Inicis net-cancel failed for order %s", order.id)
        return _page("결제 실패", "결제를 저장하지 못해 승인을 취소했습니다.", next_url)

    return _page("결제 완료", "결제가 완료되었습니다.", next_url)
