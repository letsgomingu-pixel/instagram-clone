"""Settlement report grouped by payment date, plus the admin export."""

import io
import zipfile
from datetime import date, datetime, timedelta, timezone

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.services.settlements import KST, SettlementSource, add_months, build_settlement_report

client = TestClient(app)

SHIPPING_PAYLOAD = {
    "phone": "010-9876-5432",
    "postcode": "06234",
    "address_line1": "서울특별시 강남구 테헤란로 123",
    "address_line2": "101호",
}


def _login(username: str, password: str) -> dict:
    response = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _image() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (40, 40), color="blue").save(buffer, format="JPEG")
    return buffer.getvalue()


def _paid_order(user_headers: dict, admin_headers: dict, name: str) -> dict:
    created = client.post(
        "/api/v1/admin/products",
        headers=admin_headers,
        data={
            "name": name,
            "price": "30000",
            "unit": "1kg",
            "storage_type": "fresh",
            "availability": "year_round",
            "stock": "5",
        },
        files={"image": ("fish.jpg", _image(), "image/jpeg")},
    )
    assert created.status_code == 201, created.text
    order = client.post(
        "/api/v1/orders",
        headers=user_headers,
        json={
            "product_id": created.json()["product"]["id"],
            "quantity": 1,
            "shipping_name": "정산 테스트",
            **SHIPPING_PAYLOAD,
        },
    )
    assert order.status_code == 201, order.text
    order_id = order.json()["order"]["id"]
    confirmed = client.post(f"/api/v1/payments/mock/{order_id}/confirm", headers=user_headers)
    assert confirmed.status_code == 200, confirmed.text
    return confirmed.json()


def _source(order_id: int, paid_at: datetime, amount: int = 14000) -> SettlementSource:
    return SettlementSource(
        order_id=order_id,
        paid_at=paid_at,
        product_name="광어",
        username="buyer",
        status="preparing",
        subtotal=amount - 4000,
        shipping_fee=4000,
        total_amount=amount,
    )


def test_one_month_limit_uses_calendar_month():
    assert add_months(date(2026, 10, 12), 1) == date(2026, 11, 12)
    assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)


def test_payments_group_by_kst_date_and_sum_amounts():
    report = build_settlement_report(
        [
            _source(1, datetime(2026, 10, 11, 15, tzinfo=KST), 14000),
            _source(2, datetime(2026, 10, 11, 18, tzinfo=KST), 9000),
            _source(3, datetime(2026, 10, 12, 9, tzinfo=KST), 20000),
        ],
        start=date(2026, 10, 11),
        end=date(2026, 10, 12),
    )
    assert [(day.settlement_date, day.order_count, day.total_amount) for day in report.days] == [
        (date(2026, 10, 11), 2, 23000),
        (date(2026, 10, 12), 1, 20000),
    ]
    assert report.days[0].subtotal == 15000
    assert report.days[0].shipping_fee == 8000
    assert report.summary.total_amount == 43000
    assert report.summary.order_count == 3


def test_utc_evening_lands_on_next_kst_date():
    paid_at = datetime(2026, 10, 11, 16, tzinfo=timezone.utc)  # 2026-10-12 01:00 KST
    report = build_settlement_report(
        [_source(4, paid_at)],
        start=date(2026, 10, 12),
        end=date(2026, 10, 12),
    )
    assert report.days[0].settlement_date == date(2026, 10, 12)


def test_admin_settlement_api_and_excel():
    user_headers = _login("letsgomingu.test@example.com", "12345")
    admin_headers = _login("fishmonger", "pass123")
    paid = _paid_order(user_headers, admin_headers, "정산포함")
    cancelled = _paid_order(user_headers, admin_headers, "정산제외")
    removed = client.post(f"/api/v1/admin/orders/{cancelled['id']}/cancel", headers=admin_headers)
    assert removed.status_code == 200, removed.text

    forbidden = client.get(
        "/api/v1/admin/settlements",
        headers=user_headers,
        params={"start": "2026-10-01", "end": "2026-10-12"},
    )
    assert forbidden.status_code == 403

    too_long = client.get(
        "/api/v1/admin/settlements",
        headers=admin_headers,
        params={"start": "2026-01-01", "end": "2026-03-01"},
    )
    assert too_long.status_code == 400
    assert "1개월" in too_long.json()["detail"]

    paid_at = datetime.fromisoformat(paid["paid_at"].replace("Z", "+00:00")).astimezone(KST).date()
    listed = client.get(
        "/api/v1/admin/settlements",
        headers=admin_headers,
        params={"start": paid_at.isoformat(), "end": (paid_at + timedelta(days=1)).isoformat()},
    )
    assert listed.status_code == 200, listed.text
    body = listed.json()
    order_ids = [order["order_id"] for day in body["days"] for order in day["orders"]]
    assert paid["id"] in order_ids
    assert cancelled["id"] not in order_ids
    matched = next(order for day in body["days"] for order in day["orders"] if order["order_id"] == paid["id"])
    assert matched["total_amount"] == paid["total_amount"]
    assert matched["product_name"] == "정산포함"
    assert matched["fulfillment_type"] == "delivery"
    assert matched["username"]
    assert matched["shipping_name"] == "정산 테스트"
    assert matched["phone"] == "010-9876-5432"
    assert "테헤란로" in matched["address"]
    assert matched["tracking_number"] is None
    assert body["summary"]["total_amount"] >= paid["total_amount"]

    exported = client.get(
        "/api/v1/admin/settlements/export",
        headers=admin_headers,
        params={"start": paid_at.isoformat(), "end": paid_at.isoformat()},
    )
    assert exported.status_code == 200, exported.text
    assert exported.content[:2] == b"PK"
    assert "spreadsheetml" in exported.headers["content-type"]
    workbook = zipfile.ZipFile(io.BytesIO(exported.content))
    detail = workbook.read("xl/worksheets/sheet2.xml").decode("utf-8")
    assert "정산포함" in detail
    assert "정산제외" not in detail
    assert "정산 테스트" in detail
    assert "010-9876-5432" in detail
    assert "테헤란로" in detail
    assert "택배" in detail
