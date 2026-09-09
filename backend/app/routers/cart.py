from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.schemas.cart import CartCheckoutCreate, CartItemAdd, CartItemUpdate, CartOut
from app.schemas.order import OrderCreate, OrderCreateResponse, OrderItemCreate
from app.services.cart import add_to_cart, build_cart_out, clear_cart, remove_cart_item, update_cart_item
from app.services.orders import create_order

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=CartOut)
def get_cart(current_user: CurrentUser, db: DbSession):
    return build_cart_out(db, current_user)


@router.post("/items", response_model=CartOut)
def add_cart_item(body: CartItemAdd, current_user: CurrentUser, db: DbSession):
    return add_to_cart(db, current_user, body.product_id, body.quantity)


@router.patch("/items/{item_id}", response_model=CartOut)
def patch_cart_item(item_id: int, body: CartItemUpdate, current_user: CurrentUser, db: DbSession):
    return update_cart_item(db, current_user, item_id, body.quantity)


@router.delete("/items/{item_id}", response_model=CartOut)
def delete_cart_item(item_id: int, current_user: CurrentUser, db: DbSession):
    return remove_cart_item(db, current_user, item_id)


@router.delete("", status_code=204)
def delete_cart(current_user: CurrentUser, db: DbSession):
    clear_cart(db, current_user)


@router.post("/checkout", response_model=OrderCreateResponse, status_code=201)
def checkout_cart(body: CartCheckoutCreate, current_user: CurrentUser, db: DbSession):
    cart = build_cart_out(db, current_user)
    if not cart.items:
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail="Cart is empty")

    order_body = OrderCreate(
        items=[OrderItemCreate(product_id=item.product_id, quantity=item.quantity) for item in cart.items],
        shipping_name=body.shipping_name,
        phone=body.phone,
        postcode=body.postcode,
        address_line1=body.address_line1,
        address_line2=body.address_line2,
    )
    result = create_order(db, current_user, order_body)
    clear_cart(db, current_user)
    return result
