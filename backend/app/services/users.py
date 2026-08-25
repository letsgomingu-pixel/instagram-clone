from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Follow, Post, User
from app.schemas.user import SuggestedUserOut, UserOut
from app.utils.datetime_fmt import to_iso


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(User.username == username))


def get_user_counts(db: Session, user_id: int) -> tuple[int, int, int]:
    post_count = db.scalar(select(func.count()).select_from(Post).where(Post.user_id == user_id)) or 0
    follower_count = (
        db.scalar(select(func.count()).select_from(Follow).where(Follow.following_id == user_id)) or 0
    )
    following_count = (
        db.scalar(select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)) or 0
    )
    return post_count, follower_count, following_count


def is_following(db: Session, follower_id: int | None, following_id: int) -> bool:
    if follower_id is None:
        return False
    return (
        db.scalar(
            select(Follow.id).where(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id,
            )
        )
        is not None
    )


def build_user_out(
    db: Session,
    user: User,
    viewer: User | None = None,
    *,
    post_count: int | None = None,
    follower_count: int | None = None,
    following_count: int | None = None,
) -> UserOut:
    if post_count is None or follower_count is None or following_count is None:
        pc, fc, fgc = get_user_counts(db, user.id)
        post_count = pc if post_count is None else post_count
        follower_count = fc if follower_count is None else follower_count
        following_count = fgc if following_count is None else following_count

    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        bio=user.bio,
        website=user.website,
        avatar_url=user.avatar_url,
        post_count=post_count,
        follower_count=follower_count,
        following_count=following_count,
        is_following=is_following(db, viewer.id if viewer else None, user.id),
        is_own_profile=viewer.id == user.id if viewer else False,
        is_admin=user.is_admin,
    )


def get_following_ids(db: Session, user_id: int) -> set[int]:
    rows = db.scalars(select(Follow.following_id).where(Follow.follower_id == user_id)).all()
    return set(rows)


def get_suggested_users(db: Session, viewer: User | None, limit: int = 5) -> list[SuggestedUserOut]:
    following_ids: set[int] = set()
    if viewer:
        following_ids = get_following_ids(db, viewer.id)
        following_ids.add(viewer.id)

    follower_counts = (
        select(Follow.following_id.label("user_id"), func.count().label("follower_count"))
        .group_by(Follow.following_id)
        .subquery()
    )

    post_counts = (
        select(Post.user_id.label("user_id"), func.count().label("post_count"))
        .group_by(Post.user_id)
        .subquery()
    )

    stmt = (
        select(
            User,
            func.coalesce(follower_counts.c.follower_count, 0).label("popularity"),
            func.coalesce(post_counts.c.post_count, 0).label("posts"),
        )
        .outerjoin(follower_counts, User.id == follower_counts.c.user_id)
        .outerjoin(post_counts, User.id == post_counts.c.user_id)
        .where(User.is_active.is_(True), User.is_admin.is_(False))
    )
    if following_ids:
        stmt = stmt.where(User.id.not_in(following_ids))
    stmt = stmt.order_by(
        func.coalesce(post_counts.c.post_count, 0).desc(),
        func.coalesce(follower_counts.c.follower_count, 0).desc(),
        User.id,
    ).limit(limit * 3)

    rows = db.execute(stmt).all()
    results: list[SuggestedUserOut] = []
    for user, popularity, posts in rows[:limit]:
        base = build_user_out(db, user, viewer)
        reason = _suggestion_reason(db, viewer, user.id, following_ids, int(popularity), int(posts))
        results.append(SuggestedUserOut(**base.model_dump(), reason=reason))
    return results


def _suggestion_reason(
    db: Session,
    viewer: User | None,
    user_id: int,
    following_ids: set[int],
    popularity: int,
    post_count: int = 0,
) -> str:
    if viewer and len(following_ids) > 1:
        mutual = (
            db.scalar(
                select(func.count())
                .select_from(Follow)
                .where(
                    Follow.following_id == user_id,
                    Follow.follower_id.in_(following_ids - {viewer.id}),
                )
            )
            or 0
        )
        if mutual > 0:
            return f"맞팔로우 {mutual}명"

    if popularity >= 1000:
        return "인기 계정"
    if post_count > 0:
        return "새로운 게시물"
    return "회원님을 위한 추천"


def search_users(db: Session, query: str, viewer: User | None, limit: int = 20) -> list[UserOut]:
    pattern = f"%{query}%"
    users = db.scalars(
        select(User)
        .where(
            User.is_active.is_(True),
            (User.username.ilike(pattern)) | (User.full_name.ilike(pattern)),
        )
        .limit(limit)
    ).all()
    return [build_user_out(db, u, viewer) for u in users]
