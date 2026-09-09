from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models import CartItem, Product, User
from app.schemas.cart import CartItemOut, CartOut
from app.services.products import build_product_out, _is_in_season
from app.services.shipping import calculate_shipping_fee


def _ensure_product_for_cart(product: Product, quantity: int) -> None:
    if not product.is_active:
        raise HTTPException(status_code=400, detail=f"{product.name} is not available")
    if not _is_in_season(product):
        raise HTTPException(status_code=400, detail=f"{product.name} is out of season")
    if product.stock < quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")


def _load_cart_items(db: Session, user: User) -> list[CartItem]:
    return list(
        db.scalars(
            select(CartItem)
            .where(CartItem.user_id == user.id)
            .options(joinedload(CartItem.product).joinedload(Product.post))
            .order_by(CartItem.created_at.asc())
        ).all()
    )


def build_cart_out(db: Session, user: User) -> CartOut:
    cart_items = _load_cart_items(db, user)
    items: list[CartItemOut] = []
    subtotal = 0

    for cart_item in cart_items:
        product = cart_item.product
        if not product:
            continue
        line_subtotal = product.price * cart_item.quantity
        subtotal += line_subtotal
        items.append(
            CartItemOut(
                id=cart_item.id,
                product_id=product.id,
                quantity=cart_item.quantity,
                product=build_product_out(product),
                image_url=product.post.image_url if product.post else None,
            )
        )

    shipping_fee = calculate_shipping_fee(subtotal) if items else 0
    return CartOut(
        items=items,
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        total_amount=subtotal + shipping_fee,
        base_shipping_fee=settings.base_shipping_fee,
    )


def add_to_cart(db: Session, user: User, product_id: int, quantity: int) -> CartOut:
    product = db.scalar(
        select(Product).where(Product.id == product_id).options(joinedload(Product.post))
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = db.scalar(
        select(CartItem).where(CartItem.user_id == user.id, CartItem.product_id == product_id)
    )
    new_qty = quantity if not existing else existing.quantity + quantity
    _ensure_product_for_cart(product, new_qty)

    if existing:
        existing.quantity = new_qty
    else:
        db.add(CartItem(user_id=user.id, product_id=product_id, quantity=quantity))
    db.commit()
    return build_cart_out(db, user)


def update_cart_item(db: Session, user: User, item_id: int, quantity: int) -> CartOut:
    cart_item = db.scalar(
        select(CartItem)
        .where(CartItem.id == item_id, CartItem.user_id == user.id)
        .options(joinedload(CartItem.product))
    )
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    _ensure_product_for_cart(cart_item.product, quantity)
    cart_item.quantity = quantity
    db.commit()
    return build_cart_out(db, user)


def remove_cart_item(db: Session, user: User, item_id: int) -> CartOut:
    cart_item = db.scalar(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == user.id)
    )
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(cart_item)
    db.commit()
    return build_cart_out(db, user)


def clear_cart(db: Session, user: User) -> None:
    for item in db.scalars(select(CartItem).where(CartItem.user_id == user.id)).all():
        db.delete(item)
    db.commit()
