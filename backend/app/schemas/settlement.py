from datetime import date

from pydantic import BaseModel


class SettlementOrderOut(BaseModel):
    order_id: int
    paid_at: str
    product_name: str
    username: str
    shipping_name: str
    phone: str
    address: str
    fulfillment_type: str
    tracking_number: str | None = None
    carrier: str | None = None
    status: str
    subtotal: int
    shipping_fee: int
    total_amount: int


class SettlementDayOut(BaseModel):
    settlement_date: date
    subtotal: int
    shipping_fee: int
    total_amount: int
    order_count: int
    orders: list[SettlementOrderOut]


class SettlementSummaryOut(BaseModel):
    subtotal: int
    shipping_fee: int
    total_amount: int
    order_count: int


class SettlementReportOut(BaseModel):
    start: date
    end: date
    summary: SettlementSummaryOut
    days: list[SettlementDayOut]
