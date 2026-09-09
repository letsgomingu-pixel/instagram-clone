"""Shipping fee calculation."""

from app.config import settings


def calculate_shipping_fee(_subtotal: int) -> int:
    return settings.base_shipping_fee


def calculate_order_amounts(unit_price: int, quantity: int) -> tuple[int, int, int]:
    subtotal = unit_price * quantity
    shipping_fee = calculate_shipping_fee(subtotal)
    total = subtotal + shipping_fee
    return subtotal, shipping_fee, total
