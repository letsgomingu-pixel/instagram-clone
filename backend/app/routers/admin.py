from fastapi import APIRouter, Query

from app.dependencies import AdminUser, DbSession
from app.schemas.admin import AdminMessageOut, AdminStatsOut, AdminUserOut, AdminUserStatusUpdate
from app.schemas.post import PostOut
from app.services.admin import (
    delete_post,
    delete_user,
    get_admin_stats,
    list_admin_posts,
    list_admin_users,
    set_user_active,
)
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
):
    page, limit, _ = pagination_params(page, limit)
    items, total = list_admin_posts(db, admin, page, limit)
    return paginate(items, total, page, limit)


@router.delete("/posts/{post_id}", response_model=AdminMessageOut)
def admin_delete_post(post_id: int, _admin: AdminUser, db: DbSession):
    delete_post(db, post_id)
    return AdminMessageOut(message="Post deleted")
