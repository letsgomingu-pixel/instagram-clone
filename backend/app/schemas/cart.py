from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.product import ProductOut
from app.schemas.shipping import ShippingFields, fill_pickup_address


class CartItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductOut
    image_url: str | None = None


class CartOut(BaseModel):
    items: list[CartItemOut]
    subtotal: int
    shipping_fee: int
    total_amount: int
    base_shipping_fee: int


class CartItemAdd(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=99)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1, le=99)


class CartCheckoutCreate(ShippingFields):
    shipping_name: str = Field(min_length=1, max_length=100)
    fulfillment_type: Literal["delivery", "pickup"] = "delivery"

    @model_validator(mode="before")
    @classmethod
    def pickup_skips_address(cls, data: object) -> object:
        return fill_pickup_address(data)
