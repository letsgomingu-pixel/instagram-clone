from fastapi import APIRouter, Query

from app.dependencies import CurrentUser, DbSession
from app.schemas.order import OrderCreate, OrderCreateResponse, OrderOut, OrderQuoteOut, OrderQuoteRequest
from app.services.orders import (
    build_order_out,
    build_order_quote,
    build_orders_out,
    cancel_order_for_user,
    create_order,
    get_order_for_user,
    list_orders_for_user,
)
from app.utils.pagination import PaginatedResponse, paginate, pagination_params

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/quote", response_model=OrderQuoteOut)
def order_quote(body: OrderQuoteRequest, current_user: CurrentUser, db: DbSession):
    return build_order_quote(db, body.product_id, body.quantity)


@router.post("", response_model=OrderCreateResponse, status_code=201)
def create_order_route(body: OrderCreate, current_user: CurrentUser, db: DbSession):
    return create_order(db, current_user, body)


@router.get("/me", response_model=PaginatedResponse)
def my_orders(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    page, limit, offset = pagination_params(page, limit)
    orders, total = list_orders_for_user(db, current_user, offset, limit)
    items = build_orders_out(db, orders, current_user)
    return paginate(items, total, page, limit)


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, current_user: CurrentUser, db: DbSession):
    order = get_order_for_user(db, order_id, current_user)
    return build_order_out(db, order, current_user)


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order_route(order_id: int, current_user: CurrentUser, db: DbSession):
    return cancel_order_for_user(db, order_id, current_user)
