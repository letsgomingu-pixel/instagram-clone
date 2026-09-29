import json
import logging
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models import Order, OrderItem, Payment, Post, Product, User
from app.schemas.order import (
    AdminOrderOut,
    AdminOrderUpdate,
    OrderCreate,
    OrderCreateResponse,
    OrderItemOut,
    OrderOut,
    OrderQuoteOut,
    PaymentPrepareOut,
)
from app.schemas.shipping import ShippingFields
from app.services.products import build_product_out, _is_in_season
from app.services.shipping import calculate_order_amounts, calculate_shipping_fee
from app.utils.datetime_fmt import format_pickup_clock, to_iso

logger = logging.getLogger(__name__)


def _ensure_product_available(product: Product, quantity: int) -> None:
    if not product.is_active:
        raise HTTPException(status_code=400, detail="Product is not available")
    if not _is_in_season(product):
        raise HTTPException(status_code=400, detail="Product is out of season")
    if product.stock < quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")


def get_product_for_order(db: Session, product_id: int) -> Product:
    product = db.scalar(
        select(Product)
        .where(Product.id == product_id)
        .options(joinedload(Product.post))
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def build_order_quote(
    db: Session,
    product_id: int,
    quantity: int,
    fulfillment_type: str = "delivery",
) -> OrderQuoteOut:
    product = get_product_for_order(db, product_id)
    _ensure_product_available(product, quantity)
    subtotal, shipping_fee, total = calculate_order_amounts(product.price, quantity)
    if fulfillment_type == "pickup":
        shipping_fee = 0
        total = subtotal
    image_url = product.post.image_url if product.post else None
    return OrderQuoteOut(
        product_id=product.id,
        product_name=product.name,
        unit_price=product.price,
        unit=product.unit,
        quantity=quantity,
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        total_amount=total,
        base_shipping_fee=settings.base_shipping_fee,
        stock=product.stock,
        image_url=image_url,
    )


def _generate_payment_id(order_id: int) -> str:
    return f"order-{order_id}-{uuid.uuid4().hex[:12]}"


ADMIN_STATUS_FROM = {
    "preparing": "paid",
    "shipped": "preparing",
    "delivered": "shipped",
}

SETTLED_ORDER_STATUSES = ("paid", "preparing", "ready", "shipped", "delivered")


def _review_info_for_orders(
    db: Session, orders: list[Order], viewer: User | None
) -> dict[int, tuple[int | None, bool]]:
    if not orders:
        return {}
    order_ids = [o.id for o in orders]
    rows = db.execute(
        select(Post.order_id, Post.id).where(
            Post.post_type == "review",
            Post.order_id.in_(order_ids),
        )
    ).all()
    review_by_order = {row.order_id: row.id for row in rows}
    result: dict[int, tuple[int | None, bool]] = {}
    for order in orders:
        review_post_id = review_by_order.get(order.id)
        can_review = (
            viewer is not None
            and order.user_id == viewer.id
            and order.status == "delivered"
            and review_post_id is None
        )
        result[order.id] = (review_post_id, can_review)
    return result


def _build_order_items_out(order: Order) -> list[OrderItemOut]:
    if order.items:
        return [
            OrderItemOut(
                id=item.id,
                product_id=item.product_id,
                product=build_product_out(item.product) if item.product else None,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal,
            )
            for item in order.items
        ]
    if order.product:
        return [
            OrderItemOut(
                id=0,
                product_id=order.product_id,
                product=build_product_out(order.product),
                quantity=order.quantity,
                unit_price=order.unit_price,
                subtotal=order.subtotal,
            )
        ]
    return []


def build_order_out(
    db: Session,
    order: Order,
    viewer: User | None,
    *,
    review_post_id: int | None = None,
    can_review: bool | None = None,
) -> OrderOut:
    product_out = build_product_out(order.product) if order.product else None
    items_out = _build_order_items_out(order)
    payment_id = order.payment.payment_id if order.payment else None
    if review_post_id is None and can_review is None:
        review_post_id, can_review = _review_info_for_orders(db, [order], viewer)[order.id]
    elif can_review is None:
        can_review = (
            viewer is not None
            and order.user_id == viewer.id
            and order.status == "delivered"
            and review_post_id is None
        )
    return OrderOut(
        id=order.id,
        product_id=order.product_id,
        product=product_out,
        items=items_out,
        quantity=order.quantity,
        unit_price=order.unit_price,
        subtotal=order.subtotal,
        shipping_fee=order.shipping_fee,
        total_amount=order.total_amount,
        status=order.status,
        shipping_name=order.shipping_name,
        phone=order.phone,
        postcode=order.postcode,
        address_line1=order.address_line1,
        address_line2=order.address_line2,
        tracking_number=order.tracking_number,
        fulfillment_type=order.fulfillment_type,
        pickup_ready_minutes=order.pickup_ready_minutes,
        pickup_ready_at=to_iso(order.pickup_ready_at) if order.pickup_ready_at else None,
        packaged_at=to_iso(order.packaged_at) if order.packaged_at else None,
        payment_id=payment_id,
        created_at=to_iso(order.created_at),
        paid_at=to_iso(order.paid_at) if order.paid_at else None,
        shipped_at=to_iso(order.shipped_at) if order.shipped_at else None,
        delivered_at=to_iso(order.delivered_at) if order.delivered_at else None,
        can_review=can_review,
        review_post_id=review_post_id,
    )


def build_admin_order_out(db: Session, order: Order) -> AdminOrderOut:
    base = build_order_out(db, order, order.user)
    return AdminOrderOut(
        **base.model_dump(),
        user_id=order.user_id,
        username=order.user.username if order.user else "",
    )


def _resolve_order_lines(db: Session, body: OrderCreate) -> list[tuple[Product, int]]:
    if body.items:
        lines: list[tuple[Product, int]] = []
        for item in body.items:
            product = get_product_for_order(db, item.product_id)
            _ensure_product_available(product, item.quantity)
            lines.append((product, item.quantity))
        return lines
    if body.product_id is None or body.quantity is None:
        raise HTTPException(status_code=400, detail="product_id and quantity are required")
    product = get_product_for_order(db, body.product_id)
    _ensure_product_available(product, body.quantity)
    return [(product, body.quantity)]


def _order_name_from_lines(lines: list[tuple[Product, int]]) -> str:
    if len(lines) == 1:
        return lines[0][0].name
    return f"{lines[0][0].name} 외 {len(lines) - 1}건"


def create_order(db: Session, user: User, body: OrderCreate) -> OrderCreateResponse:
    lines = _resolve_order_lines(db, body)
    subtotal = sum(product.price * quantity for product, quantity in lines)
    shipping_fee = 0 if body.fulfillment_type == "pickup" else calculate_shipping_fee(subtotal)
    total = subtotal + shipping_fee
    first_product, first_quantity = lines[0]

    order = Order(
        user_id=user.id,
        product_id=first_product.id,
        quantity=first_quantity,
        unit_price=first_product.price,
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        total_amount=total,
        status="pending",
        fulfillment_type=body.fulfillment_type,
        shipping_name=body.shipping_name.strip(),
        phone=body.phone,
        postcode=body.postcode,
        address_line1=body.address_line1,
        address_line2=body.address_line2,
    )
    db.add(order)
    db.flush()

    for product, quantity in lines:
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=quantity,
                unit_price=product.price,
                subtotal=product.price * quantity,
            )
        )

    payment_id = _generate_payment_id(order.id)
    payment = Payment(
        order_id=order.id,
        payment_id=payment_id,
        amount=total,
        status="pending",
    )
    db.add(payment)
    db.commit()
    order = get_order_for_user(db, order.id, user)

    prepare = PaymentPrepareOut(
        order_id=order.id,
        payment_id=payment_id,
        amount=total,
        store_id=settings.portone_store_id or None,
        channel_key=settings.portone_channel_key or None,
        mock=settings.use_mock_payments,
        order_name=_order_name_from_lines(lines),
    )
    return OrderCreateResponse(order=build_order_out(db, order, user), payment=prepare)


def get_order_for_user(db: Session, order_id: int, user: User) -> Order:
    query = select(Order).where(Order.id == order_id)
    if not user.is_admin:
        query = query.where(Order.user_id == user.id)
    order = db.scalars(
        query.options(
            joinedload(Order.product),
            joinedload(Order.payment),
            joinedload(Order.items).joinedload(OrderItem.product),
        )
    ).unique().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def list_orders_for_user(db: Session, user: User, offset: int, limit: int) -> tuple[list[Order], int]:
    from sqlalchemy import func

    base = select(Order).where(Order.user_id == user.id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    orders = db.scalars(
        base.options(
            joinedload(Order.product),
            joinedload(Order.payment),
            joinedload(Order.items).joinedload(OrderItem.product),
        )
        .order_by(Order.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).unique().all()
    return list(orders), total


def _decrement_stock(db: Session, product_id: int, quantity: int) -> None:
    result = db.execute(
        update(Product)
        .where(Product.id == product_id, Product.stock >= quantity)
        .values(stock=Product.stock - quantity)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=409, detail="Insufficient stock during payment")


def _restore_stock(db: Session, product_id: int, quantity: int) -> None:
    db.execute(
        update(Product)
        .where(Product.id == product_id)
        .values(stock=Product.stock + quantity)
    )


def _decrement_order_stock(db: Session, order: Order) -> None:
    if order.items:
        for item in order.items:
            _decrement_stock(db, item.product_id, item.quantity)
    else:
        _decrement_stock(db, order.product_id, order.quantity)


def _restore_order_stock(db: Session, order: Order) -> None:
    if order.items:
        for item in order.items:
            _restore_stock(db, item.product_id, item.quantity)
    else:
        _restore_stock(db, order.product_id, order.quantity)


def confirm_order_paid(db: Session, order: Order, *, portone_tx_id: str | None = None, raw_webhook: str | None = None) -> Order:
    if order.status in SETTLED_ORDER_STATUSES:
        return order
    if order.status not in ("pending",):
        raise HTTPException(status_code=400, detail=f"Cannot pay order in status {order.status}")

    _decrement_order_stock(db, order)
    now = datetime.now(timezone.utc)
    order.paid_at = now
    order.status = "preparing" if order.fulfillment_type != "pickup" else "paid"
    if order.payment:
        order.payment.status = "paid"
        order.payment.paid_at = now
        if portone_tx_id:
            order.payment.portone_tx_id = portone_tx_id
        if raw_webhook:
            order.payment.raw_webhook = raw_webhook
    product_name = order.product.name if order.product else "상품"
    buyer_id = order.user_id
    db.commit()
    db.refresh(order)

    from app.models import User as UserModel
    from app.services.notifications import notify_admins_new_order

    buyer = db.get(UserModel, buyer_id)
    if buyer:
        notify_admins_new_order(db, buyer=buyer, order_id=order.id, product_name=product_name)
        db.commit()
        if order.fulfillment_type != "pickup":
            try:
                from app.services.notifications import notify_buyer_order_status

                actor_id = db.scalar(
                    select(User.id).where(User.is_admin.is_(True), User.is_active.is_(True)).limit(1)
                )
                notify_buyer_order_status(
                    db,
                    buyer_id=buyer.id,
                    actor_id=actor_id or buyer.id,
                    order_id=order.id,
                    status="preparing",
                    product_name=product_name,
                    fulfillment_type=order.fulfillment_type,
                )
                db.commit()
            except Exception:
                logger.exception("Failed to notify buyer that order %s is preparing", order.id)
        from app.services.email import send_order_email_to_admins, send_order_email_to_user

        paid_body = f"{product_name} 주문(#{order.id}) 결제가 완료되었습니다.\n결제 금액: {order.total_amount:,}원"
        if order.fulfillment_type != "pickup":
            paid_body = (
                f"{product_name} 주문(#{order.id}) 결제가 완료되어 상품 준비 중입니다.\n"
                f"결제 금액: {order.total_amount:,}원"
            )
        send_order_email_to_user(
            db,
            user=buyer,
            subject=f"[주문 완료] 주문 #{order.id}",
            body=paid_body,
        )
        send_order_email_to_admins(
            db,
            subject=f"[신규 주문] #{order.id}",
            body=f"{buyer.username}님의 {product_name} 주문 #{order.id} ({order.total_amount:,}원)",
        )

    return order


def confirm_mock_payment(db: Session, order_id: int, user: User) -> OrderOut:
    if not settings.use_mock_payments:
        raise HTTPException(status_code=403, detail="Mock payments are disabled")
    order = get_order_for_user(db, order_id, user)
    order = confirm_order_paid(db, order, portone_tx_id="mock")
    return build_order_out(db, order, user)


async def confirm_portone_payment(db: Session, order_id: int, user: User) -> OrderOut:
    order = get_order_for_user(db, order_id, user)
    if order.status in SETTLED_ORDER_STATUSES:
        return build_order_out(db, order, user)
    if order.status != "pending":
        raise HTTPException(status_code=400, detail=f"Order is not pending (status={order.status})")
    if not order.payment:
        raise HTTPException(status_code=400, detail="Payment not found")

    verified = await fetch_portone_payment(order.payment.payment_id)
    paid_amount = verified.get("amount", {}).get("total") or verified.get("amount")
    if isinstance(paid_amount, dict):
        paid_amount = paid_amount.get("total")
    if paid_amount is not None and int(paid_amount) != order.payment.amount:
        order.payment.status = "failed"
        order.status = "failed"
        db.commit()
        raise HTTPException(status_code=400, detail="Payment amount mismatch")

    portone_status = verified.get("status", "")
    if portone_status not in ("PAID", "paid", "Paid"):
        return build_order_out(db, order, user)

    raw = json.dumps(verified, ensure_ascii=False)
    order = confirm_order_paid(
        db,
        order,
        portone_tx_id=str(verified.get("transactionId") or verified.get("txId") or order.payment.payment_id),
        raw_webhook=raw,
    )
    return build_order_out(db, order, user)


async def fetch_portone_payment(payment_id: str) -> dict:
    if not settings.portone_api_secret:
        raise HTTPException(status_code=503, detail="PortOne is not configured")
    url = f"https://api.portone.io/payments/{payment_id}"
    headers = {"Authorization": f"PortOne {settings.portone_api_secret}"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, headers=headers)
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Payment not found in PortOne")
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Failed to verify payment with PortOne")
    return response.json()


async def handle_portone_webhook(db: Session, payload: dict) -> None:
    payment_id = payload.get("paymentId") or payload.get("payment_id")
    if not payment_id:
        raise HTTPException(status_code=400, detail="Missing paymentId")

    payment = db.scalars(
        select(Payment)
        .where(Payment.payment_id == payment_id)
        .options(
            joinedload(Payment.order).joinedload(Order.product),
            joinedload(Payment.order).joinedload(Order.items),
        )
    ).unique().first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    order = payment.order
    raw = json.dumps(payload, ensure_ascii=False)

    status = payload.get("status") or payload.get("type")
    if settings.portone_enabled:
        verified = await fetch_portone_payment(payment_id)
        paid_amount = verified.get("amount", {}).get("total") or verified.get("amount")
        if isinstance(paid_amount, dict):
            paid_amount = paid_amount.get("total")
        if paid_amount is not None and int(paid_amount) != payment.amount:
            payment.status = "failed"
            order.status = "failed"
            payment.raw_webhook = raw
            db.commit()
            raise HTTPException(status_code=400, detail="Payment amount mismatch")
        portone_status = verified.get("status", "")
        if portone_status not in ("PAID", "paid", "Paid"):
            return
    elif str(status).lower() not in ("paid", "payment.paid"):
        return

    confirm_order_paid(
        db,
        order,
        portone_tx_id=str(payload.get("transactionId") or payload.get("txId") or payment_id),
        raw_webhook=raw,
    )


def build_orders_out(db: Session, orders: list[Order], viewer: User | None) -> list[OrderOut]:
    review_info = _review_info_for_orders(db, orders, viewer)
    return [
        build_order_out(
            db,
            order,
            viewer,
            review_post_id=review_info[order.id][0],
            can_review=review_info[order.id][1],
        )
        for order in orders
    ]


def get_order_for_admin(db: Session, order_id: int) -> Order:
    order = db.scalars(
        select(Order)
        .where(Order.id == order_id)
        .options(
            joinedload(Order.product),
            joinedload(Order.payment),
            joinedload(Order.user),
            joinedload(Order.items).joinedload(OrderItem.product),
        )
    ).unique().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def list_admin_orders(
    db: Session,
    offset: int,
    limit: int,
    status: str | None = None,
    fulfillment_type: str | None = None,
) -> tuple[list[Order], int]:
    from sqlalchemy import func

    base = select(Order)
    if status:
        base = base.where(Order.status == status)
    if fulfillment_type:
        base = base.where(Order.fulfillment_type == fulfillment_type)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    orders = db.scalars(
        base.options(
            joinedload(Order.product),
            joinedload(Order.payment),
            joinedload(Order.user),
            joinedload(Order.items).joinedload(OrderItem.product),
        )
        .order_by(Order.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).unique().all()
    return list(orders), total


BUYER_CANCELLABLE = ("pending", "paid")
ADMIN_CANCELLABLE = ("pending", "paid", "preparing", "ready")
STOCK_RESTORE_STATUSES = ("paid", "preparing", "ready")


def cancel_order(db: Session, order: Order, *, by_admin: bool = False) -> Order:
    allowed = ADMIN_CANCELLABLE if by_admin else BUYER_CANCELLABLE
    if order.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Cannot cancel order in status {order.status}")

    restore_stock = order.status in STOCK_RESTORE_STATUSES
    order.status = "cancelled"
    if order.payment:
        order.payment.status = "cancelled"
    if restore_stock:
        _restore_order_stock(db, order)
    db.commit()
    return get_order_for_admin(db, order.id) if by_admin else order


def cancel_order_for_user(db: Session, order_id: int, user: User) -> OrderOut:
    order = get_order_for_user(db, order_id, user)
    cancel_order(db, order, by_admin=False)
    order = get_order_for_user(db, order_id, user)
    return build_order_out(db, order, user)


def cancel_order_for_admin(db: Session, order_id: int) -> Order:
    order = get_order_for_admin(db, order_id)
    return cancel_order(db, order, by_admin=True)


def _apply_pickup_ready(order: Order, minutes: int, now: datetime) -> None:
    order.pickup_ready_minutes = minutes
    order.pickup_ready_at = now + timedelta(minutes=minutes)


def update_admin_order(db: Session, order_id: int, body: AdminOrderUpdate, admin: User) -> Order:
    order = get_order_for_admin(db, order_id)
    if body.status is None and body.tracking_number is None and body.pickup_ready_minutes is None:
        raise HTTPException(status_code=400, detail="No fields to update")

    status_changed: str | None = None
    ready_time_set = False
    now = datetime.now(timezone.utc)
    tracking_provided = body.tracking_number is not None
    incoming_tracking = body.tracking_number.strip() or None if tracking_provided else None
    target_status = body.status
    if (
        target_status is None
        and incoming_tracking
        and order.fulfillment_type != "pickup"
        and order.status == "preparing"
    ):
        target_status = "shipped"

    if target_status == "shipped" and order.fulfillment_type == "pickup":
        raise HTTPException(status_code=400, detail="Pickup orders are not shipped")

    if target_status is not None:
        if order.fulfillment_type == "pickup":
            pickup_from = {"preparing": "paid", "ready": "preparing", "delivered": "ready"}
            if target_status not in pickup_from:
                raise HTTPException(status_code=400, detail="Pickup orders cannot use that status")
            if order.status != pickup_from[target_status]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot change status from {order.status} to {target_status}",
                )
            if target_status == "preparing" and body.pickup_ready_minutes is None:
                raise HTTPException(
                    status_code=400,
                    detail="pickup_ready_minutes is required when accepting a pickup order",
                )
        else:
            if target_status == "ready":
                raise HTTPException(status_code=400, detail="Only pickup orders can be marked ready")
            required_from = ADMIN_STATUS_FROM[target_status]
            if order.status != required_from:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot change status from {order.status} to {target_status}",
                )
            if target_status == "shipped":
                number = incoming_tracking if tracking_provided else order.tracking_number
                if not number:
                    raise HTTPException(status_code=400, detail="운송장 번호를 입력해 주세요.")
        order.status = target_status
        status_changed = target_status
        if target_status == "shipped":
            order.shipped_at = now
        elif target_status == "ready":
            order.packaged_at = now
        elif target_status == "delivered":
            order.delivered_at = now

    if body.pickup_ready_minutes is not None:
        if order.fulfillment_type != "pickup":
            raise HTTPException(status_code=400, detail="Pickup time applies only to pickup orders")
        if order.status != "preparing":
            raise HTTPException(status_code=400, detail="Pickup time can be set only while preparing")
        _apply_pickup_ready(order, body.pickup_ready_minutes, now)
        ready_time_set = True

    if tracking_provided:
        order.tracking_number = incoming_tracking

    db.commit()
    order = get_order_for_admin(db, order_id)

    if status_changed or ready_time_set:
        from app.services.notifications import notify_buyer_order_status

        product_name = order.product.name if order.product else "상품"
        notify_status = status_changed or "preparing"
        notify_buyer_order_status(
            db,
            buyer_id=order.user_id,
            actor_id=admin.id,
            order_id=order.id,
            status=notify_status,
            product_name=product_name,
            tracking_number=order.tracking_number,
            fulfillment_type=order.fulfillment_type,
            pickup_ready_minutes=order.pickup_ready_minutes,
            pickup_ready_at=order.pickup_ready_at,
        )
        db.commit()

        from app.models import User as UserModel
        from app.services.email import send_order_email_to_user

        buyer = db.get(UserModel, order.user_id)
        if buyer:
            if order.fulfillment_type == "pickup" and order.pickup_ready_at and ready_time_set:
                clock = format_pickup_clock(order.pickup_ready_at)
                label = f"포장 완료 예정 {order.pickup_ready_minutes}분 ({clock})"
                email_body = (
                    f"{product_name} 주문 #{order.id} — "
                    f"{order.pickup_ready_minutes}분 후({clock})에 포장이 완료됩니다."
                )
            else:
                status_labels = {
                    "preparing": "상품 준비 중",
                    "ready": "포장 완료",
                    "shipped": "배송 중",
                    "delivered": "픽업 완료" if order.fulfillment_type == "pickup" else "배송 완료",
                }
                label = status_labels.get(notify_status, notify_status)
                if notify_status == "ready":
                    email_body = (
                        f"{product_name} 주문 #{order.id} 포장이 완료되었습니다. "
                        "가게에서 픽업해 주세요."
                    )
                else:
                    email_body = f"{product_name} 주문 #{order.id} — {label}"
            try:
                send_order_email_to_user(
                    db,
                    user=buyer,
                    subject=f"[{label}] 주문 #{order.id}",
                    body=email_body,
                )
            except Exception:
                logger.exception("Failed to email buyer about order %s", order.id)

    return order
