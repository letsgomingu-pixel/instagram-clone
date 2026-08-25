from sqlalchemy import case, desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Comment, Like, Notification, Post, PostMedia, PostTag, SavedPost, User
from app.schemas.notification import NotificationOut
from app.schemas.post import CommentOut, PostMediaOut, PostOut
from app.services.users import build_user_out, get_following_ids
from app.utils.datetime_fmt import to_iso


def _liked_post_ids(db: Session, user_id: int, post_ids: list[int]) -> set[int]:
    if not post_ids:
        return set()
    rows = db.scalars(
        select(Like.post_id).where(Like.user_id == user_id, Like.post_id.in_(post_ids))
    ).all()
    return set(rows)


def _saved_post_ids(db: Session, user_id: int, post_ids: list[int]) -> set[int]:
    if not post_ids:
        return set()
    rows = db.scalars(
        select(SavedPost.post_id).where(SavedPost.user_id == user_id, SavedPost.post_id.in_(post_ids))
    ).all()
    return set(rows)


def _tagged_users_for_posts(db: Session, post_ids: list[int], viewer: User | None) -> dict[int, list]:
    if not post_ids:
        return {}
    tags = db.scalars(
        select(PostTag).where(PostTag.post_id.in_(post_ids)).options(joinedload(PostTag.user))
    ).unique().all()
    result: dict[int, list] = {}
    for tag in tags:
        result.setdefault(tag.post_id, []).append(build_user_out(db, tag.user, viewer))
    return result


def _media_for_posts(db: Session, post_ids: list[int]) -> dict[int, list[PostMediaOut]]:
    if not post_ids:
        return {}
    rows = db.scalars(
        select(PostMedia)
        .where(PostMedia.post_id.in_(post_ids))
        .order_by(PostMedia.post_id, PostMedia.position)
    ).all()
    grouped: dict[int, list[PostMediaOut]] = {pid: [] for pid in post_ids}
    for row in rows:
        grouped[row.post_id].append(
            PostMediaOut(
                id=row.id,
                media_url=row.media_url,
                media_type=row.media_type,
                position=row.position,
            )
        )
    return grouped


def _comments_for_posts(db: Session, post_ids: list[int], viewer: User | None, limit: int = 20) -> dict[int, list]:
    if not post_ids:
        return {}
    comments = db.scalars(
        select(Comment)
        .where(Comment.post_id.in_(post_ids))
        .options(joinedload(Comment.user))
        .order_by(Comment.created_at.desc())
    ).all()
    grouped: dict[int, list] = {pid: [] for pid in post_ids}
    for c in comments:
        bucket = grouped[c.post_id]
        if len(bucket) < limit:
            bucket.append(
                CommentOut(
                    id=c.id,
                    user=build_user_out(db, c.user, viewer),
                    content=c.content,
                    created_at=to_iso(c.created_at),
                )
            )
    for pid in grouped:
        grouped[pid].reverse()
    return grouped


def build_post_out(db: Session, post: Post, viewer: User | None, *, comments_map=None, tags_map=None, media_map=None, liked=None, saved=None) -> PostOut:
    post_ids = [post.id]
    if comments_map is None:
        comments_map = _comments_for_posts(db, post_ids, viewer)
    if tags_map is None:
        tags_map = _tagged_users_for_posts(db, post_ids, viewer)
    if media_map is None:
        media_map = _media_for_posts(db, post_ids)
    if liked is None and viewer:
        liked = _liked_post_ids(db, viewer.id, post_ids)
    elif liked is None:
        liked = set()
    if saved is None and viewer:
        saved = _saved_post_ids(db, viewer.id, post_ids)
    elif saved is None:
        saved = set()

    media = media_map.get(post.id, [])
    cover_url = media[0].media_url if media else post.image_url

    return PostOut(
        id=post.id,
        user=build_user_out(db, post.user, viewer),
        image_url=cover_url,
        caption=post.caption,
        location=post.location,
        like_count=post.like_count,
        comment_count=post.comment_count,
        is_liked=post.id in liked,
        is_saved=post.id in saved,
        created_at=to_iso(post.created_at),
        comments=comments_map.get(post.id, []),
        tagged_users=tags_map.get(post.id, []),
        media=media,
    )


def get_home_feed_posts(db: Session, user: User, page: int, limit: int) -> tuple[list[Post], int]:
    """Following posts first, then others; pages wrap for infinite scroll."""
    following_ids = get_following_ids(db, user.id)
    following_ids.add(user.id)
    priority = case((Post.user_id.in_(following_ids), 0), else_=1)
    ordered = db.scalars(
        select(Post)
        .options(joinedload(Post.user))
        .order_by(priority, desc(Post.created_at))
    ).all()
    total = len(ordered)
    if total == 0:
        return [], 0

    start = ((page - 1) * limit) % total
    return [ordered[(start + i) % total] for i in range(limit)], total


def build_posts_out(db: Session, posts: list[Post], viewer: User | None) -> list[PostOut]:
    if not posts:
        return []
    post_ids = [p.id for p in posts]
    comments_map = _comments_for_posts(db, post_ids, viewer)
    tags_map = _tagged_users_for_posts(db, post_ids, viewer)
    media_map = _media_for_posts(db, post_ids)
    liked = _liked_post_ids(db, viewer.id, post_ids) if viewer else set()
    saved = _saved_post_ids(db, viewer.id, post_ids) if viewer else set()
    return [
        build_post_out(
            db,
            p,
            viewer,
            comments_map=comments_map,
            tags_map=tags_map,
            media_map=media_map,
            liked=liked,
            saved=saved,
        )
        for p in posts
    ]


def get_post_or_404(db: Session, post_id: int) -> Post:
    post = db.scalar(
        select(Post).where(Post.id == post_id).options(joinedload(Post.user))
    )
    if not post:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Post not found")
    return post


def list_post_likes(db: Session, post_id: int, viewer: User | None, page: int, limit: int) -> tuple[list, int]:
    get_post_or_404(db, post_id)
    base = (
        select(User)
        .join(Like, Like.user_id == User.id)
        .where(Like.post_id == post_id)
        .order_by(desc(Like.created_at))
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    offset = (page - 1) * limit
    users = db.scalars(base.offset(offset).limit(limit)).all()
    return [build_user_out(db, u, viewer) for u in users], total


def list_post_comments(db: Session, post_id: int, viewer: User | None, page: int, limit: int) -> tuple[list[CommentOut], int]:
    get_post_or_404(db, post_id)
    base = (
        select(Comment)
        .where(Comment.post_id == post_id)
        .options(joinedload(Comment.user))
        .order_by(Comment.created_at)
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    offset = (page - 1) * limit
    comments = db.scalars(base.offset(offset).limit(limit)).all()
    items = [
        CommentOut(
            id=c.id,
            user=build_user_out(db, c.user, viewer),
            content=c.content,
            created_at=to_iso(c.created_at),
        )
        for c in comments
    ]
    return items, total


def delete_post_comment(db: Session, post_id: int, comment_id: int, user: User) -> None:
    from fastapi import HTTPException

    post = get_post_or_404(db, post_id)
    comment = db.scalar(select(Comment).where(Comment.id == comment_id, Comment.post_id == post_id))
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != user.id and post.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this comment")
    db.delete(comment)
    post.comment_count = max(0, post.comment_count - 1)
    db.commit()


def build_notification_out(db: Session, notification: Notification, viewer: User | None) -> NotificationOut:
    post_image_url = None
    target_username = None
    if notification.post_id:
        post = db.get(Post, notification.post_id)
        if post:
            post_image_url = post.image_url
            owner = db.get(User, post.user_id)
            if owner and notification.tab == "following":
                target_username = owner.username

    return NotificationOut(
        id=notification.id,
        type=notification.type,
        tab=notification.tab,
        actor=build_user_out(db, notification.actor, viewer),
        target_username=target_username,
        post_id=notification.post_id,
        post_image_url=post_image_url,
        comment_preview=notification.comment_preview,
        created_at=to_iso(notification.created_at),
        is_read=notification.is_read,
    )


def list_notifications(db: Session, user: User, tab: str) -> list[NotificationOut]:
    notifications = db.scalars(
        select(Notification)
        .where(Notification.recipient_id == user.id, Notification.tab == tab)
        .options(joinedload(Notification.actor))
        .order_by(desc(Notification.created_at))
    ).all()
    return [build_notification_out(db, n, user) for n in notifications]
