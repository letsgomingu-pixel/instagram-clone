"""Paid-order settlement report for the store admin.

Customers pay this store directly, so a settlement is the payment itself.
Cancelled and unpaid orders are left out. Amounts are grouped by the
payment date in Korea Standard Time.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from urllib.parse import quote

from fastapi import HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.order import Order, OrderItem
from app.schemas.settlement import (
    SettlementDayOut,
    SettlementOrderOut,
    SettlementReportOut,
    SettlementSummaryOut,
)
from app.services.carriers import carrier_label
from app.services.orders import SETTLED_ORDER_STATUSES
from app.utils.simple_xlsx import Sheet, workbook_bytes

KST = timezone(timedelta(hours=9))

STATUS_LABELS = {
    "paid": "결제 완료",
    "preparing": "상품 준비 중",
    "ready": "포장 완료",
    "shipped": "배송 중",
    "delivered": "배송 완료",
}


@dataclass
class SettlementSource:
    order_id: int
    paid_at: datetime
    product_name: str
    username: str
    status: str
    subtotal: int
    shipping_fee: int
    total_amount: int
    shipping_name: str = ""
    phone: str = ""
    address: str = ""
    fulfillment_type: str = "delivery"
    tracking_number: str | None = None
    carrier: str | None = None


def add_months(day: date, months: int) -> date:
    month_index = day.month - 1 + months
    year = day.year + month_index // 12
    month = month_index % 12 + 1
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(day.day, last_day))


def assert_settlement_range(start: date, end: date) -> None:
    if end < start:
        raise HTTPException(status_code=400, detail="종료일은 시작일 이후여야 합니다.")
    if end > add_months(start, 1):
        raise HTTPException(status_code=400, detail="한 번에 최대 1개월까지 조회할 수 있습니다.")


def as_kst(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc).astimezone(KST)
    return value.astimezone(KST)


def build_settlement_report(
    sources: list[SettlementSource],
    start: date,
    end: date,
) -> SettlementReportOut:
    grouped: dict[date, list[SettlementSource]] = {}
    for source in sources:
        settlement_date = as_kst(source.paid_at).date()
        if settlement_date < start or settlement_date > end:
            continue
        grouped.setdefault(settlement_date, []).append(source)

    days: list[SettlementDayOut] = []
    for settlement_date in sorted(grouped):
        entries = sorted(grouped[settlement_date], key=lambda item: (item.paid_at, item.order_id))
        orders = [
            SettlementOrderOut(
                order_id=source.order_id,
                paid_at=as_kst(source.paid_at).isoformat(),
                product_name=source.product_name,
                username=source.username,
                shipping_name=source.shipping_name,
                phone=source.phone,
                address=source.address,
                fulfillment_type=source.fulfillment_type,
                tracking_number=source.tracking_number,
                carrier=source.carrier,
                status=source.status,
                subtotal=source.subtotal,
                shipping_fee=source.shipping_fee,
                total_amount=source.total_amount,
            )
            for source in entries
        ]
        days.append(
            SettlementDayOut(
                settlement_date=settlement_date,
                subtotal=sum(order.subtotal for order in orders),
                shipping_fee=sum(order.shipping_fee for order in orders),
                total_amount=sum(order.total_amount for order in orders),
                order_count=len(orders),
                orders=orders,
            )
        )

    return SettlementReportOut(
        start=start,
        end=end,
        summary=SettlementSummaryOut(
            subtotal=sum(day.subtotal for day in days),
            shipping_fee=sum(day.shipping_fee for day in days),
            total_amount=sum(day.total_amount for day in days),
            order_count=sum(day.order_count for day in days),
        ),
        days=days,
    )


def get_settlement_report(db: Session, start: date, end: date) -> SettlementReportOut:
    assert_settlement_range(start, end)
    return build_settlement_report(load_sources(db, start, end), start, end)


def export_settlements_xlsx(db: Session, start: date, end: date) -> Response:
    report = get_settlement_report(db, start, end)
    payload = workbook_bytes(
        [
            Sheet(
                name="정산내역",
                headers=["정산일", "주문건수", "상품금액", "배송비", "정산금액"],
                numeric_columns={1, 2, 3, 4},
                rows=[
                    [
                        _dot(day.settlement_date),
                        day.order_count,
                        day.subtotal,
                        day.shipping_fee,
                        day.total_amount,
                    ]
                    for day in report.days
                ],
            ),
            Sheet(
                name="주문상세",
                headers=[
                    "정산일",
                    "주문번호",
                    "수령방식",
                    "아이디",
                    "실명",
                    "핸드폰번호",
                    "주소",
                    "운송장번호",
                    "결제일시",
                    "상품명",
                    "주문상태",
                    "상품금액",
                    "배송비",
                    "결제금액",
                ],
                numeric_columns={1, 11, 12, 13},
                rows=[
                    [
                        _dot(day.settlement_date),
                        order.order_id,
                        fulfillment_label(order.fulfillment_type),
                        order.username,
                        order.shipping_name,
                        order.phone,
                        order.address,
                        tracking_text(order.carrier, order.tracking_number),
                        order.paid_at.replace("T", " ")[:16],
                        order.product_name,
                        STATUS_LABELS.get(order.status, order.status),
                        order.subtotal,
                        order.shipping_fee,
                        order.total_amount,
                    ]
                    for day in report.days
                    for order in day.orders
                ],
            ),
        ]
    )
    filename = f"정산내역_{start.isoformat()}_{end.isoformat()}.xlsx"
    disposition = f"attachment; filename=\"settlement.xlsx\"; filename*=UTF-8''{quote(filename)}"
    return Response(
        content=payload,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": disposition},
    )


def load_sources(db: Session, start: date, end: date) -> list[SettlementSource]:
    window_start = datetime.combine(start, time.min, tzinfo=KST)
    window_end = datetime.combine(end + timedelta(days=1), time.min, tzinfo=KST)
    orders = db.scalars(
        select(Order)
        .options(
            joinedload(Order.user),
            joinedload(Order.product),
            joinedload(Order.items).joinedload(OrderItem.product),
        )
        .where(
            Order.status.in_(SETTLED_ORDER_STATUSES),
            Order.paid_at.is_not(None),
            Order.paid_at >= window_start,
            Order.paid_at < window_end,
        )
        .order_by(Order.paid_at.asc(), Order.id.asc())
    ).unique().all()
    return [_source_from_order(order) for order in orders if order.paid_at is not None]


def _source_from_order(order: Order) -> SettlementSource:
    names: list[str] = []
    if order.items:
        for item in order.items:
            if item.product and item.product.name:
                names.append(item.product.name)
    if not names and order.product is not None:
        names.append(order.product.name)
    username = order.user.username if order.user is not None else ""
    paid_at = order.paid_at
    assert paid_at is not None
    return SettlementSource(
        order_id=order.id,
        paid_at=paid_at,
        product_name=", ".join(names) or "상품",
        username=username,
        status=order.status,
        subtotal=order.subtotal,
        shipping_fee=order.shipping_fee,
        total_amount=order.total_amount,
        shipping_name=order.shipping_name,
        phone=order.phone,
        address=format_address(order.postcode, order.address_line1, order.address_line2),
        fulfillment_type=order.fulfillment_type,
        tracking_number=order.tracking_number,
        carrier=order.carrier,
    )


def fulfillment_label(value: str) -> str:
    return "포장" if value == "pickup" else "택배"


def format_address(postcode: str, line1: str, line2: str) -> str:
    parts = [part.strip() for part in (f"({postcode})" if postcode else "", line1, line2) if part and part.strip()]
    return " ".join(parts)


def tracking_text(carrier: str | None, number: str | None) -> str:
    if not number:
        return ""
    label = carrier_label(carrier)
    if label:
        return f"{label} {number}"
    return number


def _dot(day: date) -> str:
    return day.strftime("%Y.%m.%d")
