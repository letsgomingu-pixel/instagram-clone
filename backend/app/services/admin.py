from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Comment, Like, Order, Post, PostReport, Reel, ReelReport, User, UserReport
from app.schemas.admin import AdminPostReportOut, AdminReelReportOut, AdminStatsOut, AdminUserOut, AdminUserReportOut
from app.schemas.post import PostOut
from app.services.posts import build_posts_out
from app.services.users import build_user_out
from app.utils.datetime_fmt import to_iso


def get_admin_stats(db: Session) -> AdminStatsOut:
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    active_users = db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(True))) or 0
    inactive_users = total_users - active_users
    new_users_7d = (
        db.scalar(select(func.count()).select_from(User).where(User.created_at >= week_ago)) or 0
    )
    total_posts = db.scalar(select(func.count()).select_from(Post)) or 0
    total_comments = db.scalar(select(func.count()).select_from(Comment)) or 0
    total_likes = db.scalar(select(func.count()).select_from(Like)) or 0
    posts_7d = db.scalar(select(func.count()).select_from(Post).where(Post.created_at >= week_ago)) or 0

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    orders_today = (
        db.scalar(
            select(func.count())
            .select_from(Order)
            .where(Order.created_at >= today_start, Order.status.notin_(("pending", "failed")))
        )
        or 0
    )
    revenue_today = (
        db.scalar(
            select(func.coalesce(func.sum(Order.total_amount), 0))
            .select_from(Order)
            .where(Order.created_at >= today_start, Order.status.notin_(("pending", "failed", "cancelled")))
        )
        or 0
    )
    pending_shipment = (
        db.scalar(
            select(func.count())
            .select_from(Order)
            .where(Order.status.in_(("paid", "preparing")))
        )
        or 0
    )
    paid_orders = (
        db.scalar(select(func.count()).select_from(Order).where(Order.status == "paid")) or 0
    )

    return AdminStatsOut(
        total_users=total_users,
        active_users=active_users,
        inactive_users=inactive_users,
        new_users_7d=new_users_7d,
        total_posts=total_posts,
        total_comments=total_comments,
        total_likes=total_likes,
        posts_7d=posts_7d,
        orders_today=orders_today,
        revenue_today=int(revenue_today),
        pending_shipment=pending_shipment,
        paid_orders=paid_orders,
    )


def build_admin_user_out(db: Session, user: User, viewer: User) -> AdminUserOut:
    base = build_user_out(db, user, viewer)
    return AdminUserOut(
        **base.model_dump(),
        is_active=user.is_active,
        created_at=to_iso(user.created_at),
    )


def list_admin_users(db: Session, viewer: User, page: int, limit: int) -> tuple[list[AdminUserOut], int]:
    total = db.scalar(select(func.count()).select_from(User)) or 0
    offset = (page - 1) * limit
    users = db.scalars(
        select(User).order_by(desc(User.created_at)).offset(offset).limit(limit)
    ).all()
    items = [build_admin_user_out(db, user, viewer) for user in users]
    return items, total


def set_user_active(db: Session, user_id: int, is_active: bool, admin: User) -> AdminUserOut:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_admin and not is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate admin account")
    if user.id == admin.id and not is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return build_admin_user_out(db, user, admin)


def delete_user(db: Session, user_id: int, admin: User) -> None:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot delete admin account")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    db.delete(user)
    db.commit()


def list_admin_posts(
    db: Session, viewer: User, page: int, limit: int, *, post_type: str | None = None
) -> tuple[list[PostOut], int]:
    base = select(Post)
    if post_type:
        base = base.where(Post.post_type == post_type)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    offset = (page - 1) * limit
    posts = db.scalars(
        base.options(joinedload(Post.user)).order_by(desc(Post.created_at)).offset(offset).limit(limit)
    ).all()
    items = build_posts_out(db, list(posts), viewer)
    return items, total


def list_admin_products(db: Session, viewer: User, page: int, limit: int) -> tuple[list[PostOut], int]:
    return list_admin_posts(db, viewer, page, limit, post_type="product")


def delete_post(db: Session, post_id: int) -> None:
    from app.models import Order, Product

    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    product = db.scalar(select(Product).where(Product.post_id == post_id))
    if product:
        order_count = (
            db.scalar(select(func.count()).select_from(Order).where(Order.product_id == product.id)) or 0
        )
        if order_count > 0:
            raise HTTPException(status_code=400, detail="Cannot delete product with existing orders")
        db.delete(product)

    db.delete(post)
    db.commit()


def list_admin_post_reports(db: Session, page: int, limit: int) -> tuple[list[AdminPostReportOut], int]:
    total = db.scalar(select(func.count()).select_from(PostReport)) or 0
    offset = (page - 1) * limit
    rows = db.scalars(
        select(PostReport)
        .options(joinedload(PostReport.post).joinedload(Post.user))
        .order_by(desc(PostReport.created_at))
        .offset(offset)
        .limit(limit)
    ).all()
    reporter_ids = {r.reporter_id for r in rows}
    reporters = {
        u.id: u.username
        for u in db.scalars(select(User).where(User.id.in_(reporter_ids))).all()
    } if reporter_ids else {}
    items = [
        AdminPostReportOut(
            id=r.id,
            post_id=r.post_id,
            post_image_url=r.post.image_url if r.post else None,
            post_caption=r.post.caption if r.post else None,
            post_author_username=r.post.user.username if r.post and r.post.user else "unknown",
            reporter_username=reporters.get(r.reporter_id, "unknown"),
            reason=r.reason,
            details=r.details,
            created_at=to_iso(r.created_at),
        )
        for r in rows
    ]
    return items, total


def list_admin_user_reports(db: Session, page: int, limit: int) -> tuple[list[AdminUserReportOut], int]:
    total = db.scalar(select(func.count()).select_from(UserReport)) or 0
    offset = (page - 1) * limit
    rows = db.scalars(
        select(UserReport).order_by(desc(UserReport.created_at)).offset(offset).limit(limit)
    ).all()
    user_ids = {r.reporter_id for r in rows} | {r.reported_user_id for r in rows}
    users = {u.id: u.username for u in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}
    items = [
        AdminUserReportOut(
            id=r.id,
            reported_user_id=r.reported_user_id,
            reported_username=users.get(r.reported_user_id, "unknown"),
            reporter_username=users.get(r.reporter_id, "unknown"),
            reason=r.reason,
            details=r.details,
            created_at=to_iso(r.created_at),
        )
        for r in rows
    ]
    return items, total


def list_admin_reel_reports(db: Session, page: int, limit: int) -> tuple[list[AdminReelReportOut], int]:
    total = db.scalar(select(func.count()).select_from(ReelReport)) or 0
    offset = (page - 1) * limit
    rows = db.scalars(
        select(ReelReport)
        .options(joinedload(ReelReport.reel).joinedload(Reel.user))
        .order_by(desc(ReelReport.created_at))
        .offset(offset)
        .limit(limit)
    ).all()
    reporter_ids = {r.reporter_id for r in rows}
    reporters = {
        u.id: u.username
        for u in db.scalars(select(User).where(User.id.in_(reporter_ids))).all()
    } if reporter_ids else {}
    items = [
        AdminReelReportOut(
            id=r.id,
            reel_id=r.reel_id,
            reel_caption=r.reel.caption if r.reel else None,
            reel_author_username=r.reel.user.username if r.reel and r.reel.user else "unknown",
            reporter_username=reporters.get(r.reporter_id, "unknown"),
            reason=r.reason,
            details=r.details,
            created_at=to_iso(r.created_at),
        )
        for r in rows
    ]
    return items, total
