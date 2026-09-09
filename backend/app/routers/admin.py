from datetime import date

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from pydantic import ValidationError
from sqlalchemy import select

from app.dependencies import AdminUser, DbSession
from app.models import Post, PostMedia, Reel
from app.schemas.admin import (
    AdminMessageOut,
    AdminPostReportOut,
    AdminReelReportOut,
    AdminStatsOut,
    AdminUserOut,
    AdminUserReportOut,
    AdminUserStatusUpdate,
)
from app.schemas.order import AdminOrderOut, AdminOrderUpdate
from app.schemas.post import PostOut
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services.admin import (
    delete_post,
    delete_user,
    get_admin_stats,
    list_admin_post_reports,
    list_admin_posts,
    list_admin_products,
    list_admin_reel_reports,
    list_admin_user_reports,
    list_admin_users,
    set_user_active,
)
from app.services.hashtags import attach_hashtags_to_post
from app.services.posts import build_post_out
from app.services.orders import build_admin_order_out, cancel_order_for_admin, list_admin_orders, update_admin_order
from app.services.products import build_product_out, create_product_listing, update_product
from app.utils.hashtags import extract_hashtags
from app.utils.media import save_post_media
from app.utils.pagination import PaginatedResponse, paginate, pagination_params

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsOut)
def admin_stats(_admin: AdminUser, db: DbSession):
    return get_admin_stats(db)


@router.get("/users", response_model=PaginatedResponse)
def admin_users(
    admin: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    page, limit, _ = pagination_params(page, limit)
    items, total = list_admin_users(db, admin, page, limit)
    return paginate(items, total, page, limit)


@router.patch("/users/{user_id}/status", response_model=AdminUserOut)
def admin_update_user_status(
    user_id: int,
    body: AdminUserStatusUpdate,
    admin: AdminUser,
    db: DbSession,
):
    return set_user_active(db, user_id, body.is_active, admin)


@router.delete("/users/{user_id}", response_model=AdminMessageOut)
def admin_delete_user(user_id: int, admin: AdminUser, db: DbSession):
    delete_user(db, user_id, admin)
    return AdminMessageOut(message="User deleted")


@router.get("/posts", response_model=PaginatedResponse)
def admin_posts(
    admin: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    post_type: str | None = Query(None, pattern="^(standard|product|review)$"),
):
    page, limit, _ = pagination_params(page, limit)
    items, total = list_admin_posts(db, admin, page, limit, post_type=post_type)
    return paginate(items, total, page, limit)


@router.get("/products", response_model=PaginatedResponse)
def admin_products(
    admin: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    page, limit, _ = pagination_params(page, limit)
    items, total = list_admin_products(db, admin, page, limit)
    return paginate(items, total, page, limit)


@router.post("/products", response_model=PostOut, status_code=201)
async def admin_create_product(
    admin: AdminUser,
    db: DbSession,
    name: str = Form(...),
    price: int = Form(...),
    unit: str = Form(...),
    storage_type: str = Form(...),
    availability: str = Form(...),
    stock: int = Form(0),
    season_start: date | None = Form(None),
    season_end: date | None = Form(None),
    caption: str | None = Form(None),
    location: str | None = Form(None),
    image: UploadFile | None = File(None),
    files: list[UploadFile] = File(default=[]),
):
    uploads: list[UploadFile] = []
    if image:
        uploads.append(image)
    uploads.extend(files)
    if not uploads:
        raise HTTPException(status_code=400, detail="At least one media file is required")
    if len(uploads) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 media items allowed")

    try:
        product_data = ProductCreate(
            name=name,
            price=price,
            unit=unit,
            storage_type=storage_type,
            availability=availability,
            stock=stock,
            season_start=season_start,
            season_end=season_end,
        )
    except ValidationError as exc:
        detail = exc.errors()[0]["msg"] if exc.errors() else "Invalid product data"
        raise HTTPException(status_code=400, detail=detail) from exc

    saved_media: list[tuple[str, str]] = []
    for upload in uploads:
        saved_media.append(save_post_media(upload, "posts"))

    cover_url = saved_media[0][0]
    post = Post(
        user_id=admin.id,
        image_url=cover_url,
        caption=caption,
        location=location,
        like_count=0,
        comment_count=0,
        post_type="product",
    )
    db.add(post)
    db.flush()

    for position, (media_url, media_type) in enumerate(saved_media):
        db.add(
            PostMedia(
                post_id=post.id,
                media_url=media_url,
                media_type=media_type,
                position=position,
            )
        )

    create_product_listing(db, admin.id, post, product_data)
    db.commit()
    db.refresh(post)
    post.user = admin

    tag_names = extract_hashtags(caption)
    if tag_names:
        attach_hashtags_to_post(db, post, tag_names)
        db.commit()

    return build_post_out(db, post, admin)


@router.patch("/products/{product_id}", response_model=ProductOut)
def admin_update_product(
    product_id: int,
    body: ProductUpdate,
    _admin: AdminUser,
    db: DbSession,
):
    if body.price is None and body.stock is None and body.is_active is None:
        raise HTTPException(status_code=400, detail="No fields to update")
    product = update_product(db, product_id, body)
    return build_product_out(product)


@router.delete("/posts/{post_id}", response_model=AdminMessageOut)
def admin_delete_post(post_id: int, _admin: AdminUser, db: DbSession):
    delete_post(db, post_id)
    return AdminMessageOut(message="Post deleted")


@router.delete("/reels/{reel_id}", response_model=AdminMessageOut)
def admin_delete_reel(reel_id: int, _admin: AdminUser, db: DbSession):
    reel = db.get(Reel, reel_id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    db.delete(reel)
    db.commit()
    return AdminMessageOut(message="Reel deleted")


@router.get("/orders", response_model=PaginatedResponse)
def admin_orders(
    admin: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = Query(None, pattern="^(pending|paid|preparing|shipped|delivered|cancelled|failed)$"),
):
    page, limit, offset = pagination_params(page, limit)
    orders, total = list_admin_orders(db, offset, limit, status=status)
    items = [build_admin_order_out(db, o) for o in orders]
    return paginate(items, total, page, limit)


@router.patch("/orders/{order_id}", response_model=AdminOrderOut)
def admin_update_order(
    order_id: int,
    body: AdminOrderUpdate,
    admin: AdminUser,
    db: DbSession,
):
    order = update_admin_order(db, order_id, body, admin)
    return build_admin_order_out(db, order)


@router.post("/orders/{order_id}/cancel", response_model=AdminOrderOut)
def admin_cancel_order(order_id: int, _admin: AdminUser, db: DbSession):
    order = cancel_order_for_admin(db, order_id)
    return build_admin_order_out(db, order)


@router.get("/reports/posts", response_model=PaginatedResponse)
def admin_post_reports(
    _admin: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    page, limit, _ = pagination_params(page, limit)
    items, total = list_admin_post_reports(db, page, limit)
    return paginate(items, total, page, limit)


@router.get("/reports/users", response_model=PaginatedResponse)
def admin_user_reports(
    _admin: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    page, limit, _ = pagination_params(page, limit)
    items, total = list_admin_user_reports(db, page, limit)
    return paginate(items, total, page, limit)


@router.get("/reports/reels", response_model=PaginatedResponse)
def admin_reel_reports(
    _admin: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    page, limit, _ = pagination_params(page, limit)
    items, total = list_admin_reel_reports(db, page, limit)
    return paginate(items, total, page, limit)
