from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Comment, Like, Post, User
from app.schemas.admin import AdminStatsOut, AdminUserOut
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

    return AdminStatsOut(
        total_users=total_users,
        active_users=active_users,
        inactive_users=inactive_users,
        new_users_7d=new_users_7d,
        total_posts=total_posts,
        total_comments=total_comments,
        total_likes=total_likes,
        posts_7d=posts_7d,
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


def list_admin_posts(db: Session, viewer: User, page: int, limit: int) -> tuple[list[PostOut], int]:
    total = db.scalar(select(func.count()).select_from(Post)) or 0
    offset = (page - 1) * limit
    posts = db.scalars(
        select(Post).options(joinedload(Post.user)).order_by(desc(Post.created_at)).offset(offset).limit(limit)
    ).all()
    items = build_posts_out(db, list(posts), viewer)
    return items, total


def delete_post(db: Session, post_id: int) -> None:
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()
