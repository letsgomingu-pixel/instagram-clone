from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.product import ProductOut
from app.schemas.shipping import ShippingFields


class OrderQuoteRequest(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=99)


class OrderQuoteOut(BaseModel):
    product_id: int
    product_name: str
    unit_price: int
    unit: str
    quantity: int
    subtotal: int
    shipping_fee: int
    total_amount: int
    base_shipping_fee: int
    stock: int
    image_url: str | None = None


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=99)


class OrderCreate(ShippingFields):
    product_id: int | None = None
    quantity: int | None = Field(default=None, ge=1, le=99)
    items: list[OrderItemCreate] | None = None
    shipping_name: str = Field(min_length=1, max_length=100)


class PaymentPrepareOut(BaseModel):
    order_id: int
    payment_id: str
    amount: int
    store_id: str | None = None
    channel_key: str | None = None
    mock: bool = False
    order_name: str


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product: ProductOut | None = None
    quantity: int
    unit_price: int
    subtotal: int


class OrderOut(BaseModel):
    id: int
    product_id: int
    product: ProductOut | None = None
    items: list[OrderItemOut] = []
    quantity: int
    unit_price: int
    subtotal: int
    shipping_fee: int
    total_amount: int
    status: str
    shipping_name: str
    phone: str
    postcode: str
    address_line1: str
    address_line2: str
    tracking_number: str | None = None
    payment_id: str | None = None
    created_at: str
    paid_at: str | None = None
    shipped_at: str | None = None
    delivered_at: str | None = None
    can_review: bool = False
    review_post_id: int | None = None

    model_config = {"from_attributes": True}


class OrderCreateResponse(BaseModel):
    order: OrderOut
    payment: PaymentPrepareOut


class AdminOrderUpdate(BaseModel):
    status: Literal["preparing", "shipped", "delivered"] | None = None
    tracking_number: str | None = Field(None, max_length=100)


class AdminOrderOut(OrderOut):
    user_id: int
    username: str
