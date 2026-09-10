"""Seller & consumer E2E QA script — run against local or production API."""
from __future__ import annotations

import io
import json
import sys
import uuid
from dataclasses import dataclass, field

import httpx
from PIL import Image

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000/api/v1"

ADMIN = {"username": "fishmonger", "password": "pass123"}
CONSUMER = {"username": "letsgomingu", "password": "12345"}

SHIPPING = {
    "phone": "010-9876-5432",
    "postcode": "06234",
    "address_line1": "서울특별시 강남구 테헤란로 123",
    "address_line2": "101호",
}


@dataclass
class QAReport:
    passed: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)

    def ok(self, name: str) -> None:
        self.passed.append(name)
        print(f"  PASS  {name}")

    def fail(self, name: str, detail: str) -> None:
        self.failed.append(f"{name}: {detail}")
        print(f"  FAIL  {name} - {detail}")


def make_image() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (100, 100), color="blue").save(buf, format="JPEG")
    return buf.getvalue()


def login(client: httpx.Client, creds: dict) -> dict:
    r = client.post(f"{BASE}/auth/login", json={"username": creds["username"], "password": creds["password"]})
    r.raise_for_status()
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def run_seller_qa(client: httpx.Client, report: QAReport) -> dict | None:
    print("\n=== SELLER (ADMIN) QA ===")
    product_post_id: int | None = None
    product_id: int | None = None

    # Admin login
    try:
        admin_h = login(client, ADMIN)
        me = client.get(f"{BASE}/auth/me", headers=admin_h)
        if me.status_code != 200 or not me.json().get("is_admin"):
            report.fail("admin login", me.text)
            return None
        report.ok("admin login + is_admin flag")
    except Exception as e:
        report.fail("admin login", str(e))
        return None

    # Stats
    stats = client.get(f"{BASE}/admin/stats", headers=admin_h)
    if stats.status_code == 200 and "total_users" in stats.json():
        report.ok("admin stats")
    else:
        report.fail("admin stats", stats.text)

    # Create product
    unique = uuid.uuid4().hex[:8]
    prod = client.post(
        f"{BASE}/admin/products",
        headers=admin_h,
        data={
            "name": f"QA상품-{unique}",
            "price": "28000",
            "unit": "1kg",
            "storage_type": "fresh",
            "availability": "year_round",
            "stock": "5",
            "caption": f"#QA테스트 {unique}",
        },
        files={"image": ("qa.jpg", make_image(), "image/jpeg")},
    )
    if prod.status_code == 201 and prod.json().get("post_type") == "product":
        product_post_id = prod.json()["id"]
        product_id = prod.json()["product"]["id"]
        report.ok("admin create product")
    else:
        report.fail("admin create product", prod.text)
        return None

    # Admin product list
    plist = client.get(f"{BASE}/admin/products", headers=admin_h)
    if plist.status_code == 200 and any(p["id"] == product_post_id for p in plist.json()["items"]):
        report.ok("admin product list contains new product")
    else:
        report.fail("admin product list", plist.text)

    # Product in feed
    feed = client.get(f"{BASE}/posts/feed", params={"tab": "products"}, headers=admin_h)
    if feed.status_code == 200 and any(p["id"] == product_post_id for p in feed.json()["items"]):
        report.ok("product appears in products feed tab")
    else:
        report.fail("products feed tab", feed.text)

    # Admin users list
    users = client.get(f"{BASE}/admin/users", headers=admin_h)
    if users.status_code == 200 and users.json()["total"] >= 1:
        report.ok("admin users list")
    else:
        report.fail("admin users list", users.text)

    # Admin posts list
    posts = client.get(f"{BASE}/admin/posts", params={"post_type": "product"}, headers=admin_h)
    if posts.status_code == 200:
        report.ok("admin posts list (product filter)")
    else:
        report.fail("admin posts list", posts.text)

    # Admin orders list
    orders = client.get(f"{BASE}/admin/orders", headers=admin_h)
    if orders.status_code == 200:
        report.ok("admin orders list")
    else:
        report.fail("admin orders list", orders.text)

    return {"admin_h": admin_h, "product_id": product_id, "product_post_id": product_post_id, "unique": unique}


def run_consumer_qa(client: httpx.Client, report: QAReport, seller_ctx: dict | None) -> None:
    print("\n=== CONSUMER QA ===")
    if not seller_ctx:
        report.fail("consumer qa", "skipped — no seller context")
        return

    admin_h = seller_ctx["admin_h"]
    product_id = seller_ctx["product_id"]
    product_post_id = seller_ctx["product_post_id"]

    # Consumer login
    try:
        consumer_h = login(client, CONSUMER)
        me = client.get(f"{BASE}/auth/me", headers=consumer_h)
        if me.status_code != 200 or me.json().get("is_admin"):
            report.fail("consumer login", "admin flag wrong or login failed")
            return
        report.ok("consumer login (non-admin)")
    except Exception as e:
        report.fail("consumer login", str(e))
        return

    # Non-admin blocked from admin
    blocked = client.get(f"{BASE}/admin/stats", headers=consumer_h)
    if blocked.status_code == 403:
        report.ok("consumer blocked from admin API")
    else:
        report.fail("consumer admin block", f"status={blocked.status_code}")

    # Shipping profile visible on own profile
    profile = client.get(f"{BASE}/users/me", headers=consumer_h)
    if profile.status_code == 200 and profile.json().get("phone"):
        report.ok("GET /users/me with shipping fields")
    else:
        report.fail("GET /users/me", profile.text)

    auth_me = client.get(f"{BASE}/auth/me", headers=consumer_h)
    if auth_me.status_code == 200 and auth_me.json().get("phone"):
        report.ok("GET /auth/me with shipping fields")
    else:
        report.fail("GET /auth/me shipping", auth_me.text)

    blocked_post = client.post(
        f"{BASE}/posts",
        headers=consumer_h,
        data={"caption": "should fail"},
        files={"image": ("x.jpg", make_image(), "image/jpeg")},
    )
    if blocked_post.status_code == 403:
        report.ok("consumer blocked from creating standard posts")
    else:
        report.fail("consumer post block", blocked_post.text)

    # Quote — below free shipping threshold
    q1 = client.post(f"{BASE}/orders/quote", headers=consumer_h, json={"product_id": product_id, "quantity": 1})
    if q1.status_code == 200 and q1.json()["shipping_fee"] == 4000:
        report.ok("order quote with shipping fee (subtotal < 50000)")
    else:
        report.fail("order quote shipping", q1.text)

    # Quote — free shipping
    q2 = client.post(f"{BASE}/orders/quote", headers=consumer_h, json={"product_id": product_id, "quantity": 2})
    if q2.status_code == 200 and q2.json()["shipping_fee"] == 4000:
        report.ok("order quote always charges shipping fee")
    else:
        report.fail("order quote shipping fee", q2.text)

    # Create order + mock pay
    order_res = client.post(
        f"{BASE}/orders",
        headers=consumer_h,
        json={
            "product_id": product_id,
            "quantity": 1,
            "shipping_name": "QA 구매자",
            **SHIPPING,
        },
    )
    if order_res.status_code != 201:
        report.fail("create order", order_res.text)
        return
    order = order_res.json()["order"]
    payment = order_res.json()["payment"]
    order_id = order["id"]
    report.ok("create order (pending)")

    if not payment.get("mock"):
        report.fail("mock payment flag", json.dumps(payment))
    else:
        report.ok("payment prepare mock mode")

    confirm = client.post(f"{BASE}/payments/mock/{order_id}/confirm", headers=consumer_h)
    if confirm.status_code == 200 and confirm.json()["status"] == "paid":
        report.ok("mock payment confirm")
    else:
        report.fail("mock payment confirm", confirm.text)
        return

    # Cannot review before delivery
    early_review = client.post(
        f"{BASE}/posts/reviews",
        headers=consumer_h,
        data={"order_id": str(order_id), "rating": "5"},
        files={"image": ("r.jpg", make_image(), "image/jpeg")},
    )
    if early_review.status_code == 400:
        report.ok("review blocked before delivery")
    else:
        report.fail("review before delivery should 400", early_review.text)

    # My orders
    my = client.get(f"{BASE}/orders/me", headers=consumer_h)
    if my.status_code == 200 and any(o["id"] == order_id for o in my.json()["items"]):
        report.ok("my orders list")
    else:
        report.fail("my orders list", my.text)

    # Order detail — can_review false while paid
    detail = client.get(f"{BASE}/orders/{order_id}", headers=consumer_h)
    if detail.status_code == 200 and detail.json().get("can_review") is False:
        report.ok("can_review=false before delivery")
    else:
        report.fail("can_review before delivery", detail.text)

    # Admin fulfills order
    for status in ("preparing", "shipped", "delivered"):
        r = client.patch(f"{BASE}/admin/orders/{order_id}", headers=admin_h, json={"status": status})
        if r.status_code != 200 or r.json()["status"] != status:
            report.fail(f"admin status -> {status}", r.text)
            return
    report.ok("admin order fulfillment (preparing -> shipped -> delivered)")

    # Tracking number
    track = client.patch(
        f"{BASE}/admin/orders/{order_id}",
        headers=admin_h,
        json={"tracking_number": "QA-TRACK-001"},
    )
    if track.status_code == 200 and track.json()["tracking_number"] == "QA-TRACK-001":
        report.ok("admin save tracking number")
    else:
        report.fail("tracking number", track.text)

    # can_review true after delivery
    detail2 = client.get(f"{BASE}/orders/{order_id}", headers=consumer_h)
    if detail2.status_code == 200 and detail2.json().get("can_review") is True:
        report.ok("can_review=true after delivery")
    else:
        report.fail("can_review after delivery", detail2.text)

    # Create review
    review = client.post(
        f"{BASE}/posts/reviews",
        headers=consumer_h,
        data={"order_id": str(order_id), "rating": "5", "caption": "QA 리뷰입니다"},
        files={"image": ("review.jpg", make_image(), "image/jpeg")},
    )
    if review.status_code == 201 and review.json()["post_type"] == "review":
        review_id = review.json()["id"]
        report.ok("create review after delivery")
    else:
        report.fail("create review", review.text)
        return

    # Duplicate review blocked
    dup = client.post(
        f"{BASE}/posts/reviews",
        headers=consumer_h,
        data={"order_id": str(order_id), "rating": "4"},
        files={"image": ("dup.jpg", make_image(), "image/jpeg")},
    )
    if dup.status_code == 409:
        report.ok("duplicate review blocked (409)")
    else:
        report.fail("duplicate review", dup.text)

    # Review in feed tab
    reviews_feed = client.get(f"{BASE}/posts/feed", params={"tab": "reviews"}, headers=consumer_h)
    if reviews_feed.status_code == 200 and any(p["id"] == review_id for p in reviews_feed.json()["items"]):
        report.ok("review appears in reviews feed tab")
    else:
        report.fail("reviews feed tab", reviews_feed.text)

    # Product NOT in reviews tab
    if all(p["id"] != product_post_id for p in reviews_feed.json()["items"]):
        report.ok("product post excluded from reviews tab")
    else:
        report.fail("reviews tab contamination", "product in reviews tab")

    # Order detail shows review_post_id
    detail3 = client.get(f"{BASE}/orders/{order_id}", headers=consumer_h)
    if detail3.json().get("review_post_id") == review_id and detail3.json().get("can_review") is False:
        report.ok("order detail links to review")
    else:
        report.fail("order review_post_id", detail3.text)

    # Stock decremented
    post_detail = client.get(f"{BASE}/posts/{product_post_id}", headers=consumer_h)
    stock = post_detail.json().get("product", {}).get("stock")
    if stock == 4:
        report.ok("stock decremented after payment")
    else:
        report.fail("stock decrement", f"expected 4 got {stock}")

    # Invalid status transition
    bad = client.patch(f"{BASE}/admin/orders/{order_id}", headers=admin_h, json={"status": "preparing"})
    if bad.status_code == 400:
        report.ok("invalid admin status transition rejected")
    else:
        report.fail("invalid status transition", bad.text)

    # Signup with shipping (new user)
    new_user = f"qa_{uuid.uuid4().hex[:8]}"
    reg = client.post(
        f"{BASE}/auth/register",
        json={
            "username": new_user,
            "email": f"{new_user}@example.com",
            "password": "Test1234!",
            "full_name": "QA User",
            **SHIPPING,
        },
    )
    if reg.status_code == 201 and reg.json().get("user", {}).get("phone"):
        report.ok("signup with shipping fields")
    else:
        report.fail("signup with shipping", reg.text)


def main() -> int:
    print(f"QA target: {BASE}")
    report = QAReport()
    with httpx.Client(timeout=30.0) as client:
        health = client.get(f"{BASE}/health")
        if health.status_code != 200:
            print(f"Health check failed: {health.status_code}")
            return 1
        seller_ctx = run_seller_qa(client, report)
        run_consumer_qa(client, report, seller_ctx)

    print(f"\n=== SUMMARY ===")
    print(f"Passed: {len(report.passed)}")
    print(f"Failed: {len(report.failed)}")
    for f in report.failed:
        print(f"  - {f}")
    return 1 if report.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
