from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import and_, case, desc, func, or_, select, update
from sqlalchemy.orm import Session, joinedload

from app.models import Comment, CommentLike, HiddenPost, Like, Notification, Post, PostMedia, PostReport, PostTag, Product, SavedPost, User
from app.models.product import FEED_TABS
from app.schemas.notification import NotificationOut
from app.schemas.post import CommentOut, PostMediaOut, PostOut
from app.services.blocks import blocked_user_ids
from app.services.products import _products_for_posts
from app.services.users import build_user_out, get_following_ids
from app.utils.hashtags import extract_hashtags
from app.utils.cursor import cursor_from_post, decode_cursor
from app.utils.datetime_fmt import to_iso


def _liked_post_ids(db: Session, user_id: int, post_ids: list[int]) -> set[int]:
    if not post_ids:
        return set()
    rows = db.scalars(
        select(Like.post_id).where(Like.user_id == user_id, Like.post_id.in_(post_ids))
    ).all()
    return set(rows)


def _hidden_post_ids(db: Session, user_id: int | None) -> set[int]:
    if not user_id:
        return set()
    rows = db.scalars(select(HiddenPost.post_id).where(HiddenPost.user_id == user_id)).all()
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


def _liked_comment_ids(db: Session, user_id: int | None, comment_ids: list[int]) -> set[int]:
    if not comment_ids or not user_id:
        return set()
    rows = db.scalars(
        select(CommentLike.comment_id).where(
            CommentLike.user_id == user_id, CommentLike.comment_id.in_(comment_ids)
        )
    ).all()
    return set(rows)


def _comment_to_out(
    db: Session,
    comment: Comment,
    viewer: User | None,
    *,
    replies_map: dict[int, list[CommentOut]] | None = None,
    liked_comments: set[int] | None = None,
) -> CommentOut:
    liked_comments = liked_comments or set()
    return CommentOut(
        id=comment.id,
        user=build_user_out(db, comment.user, viewer),
        content=comment.content,
        created_at=to_iso(comment.created_at),
        parent_id=comment.parent_id,
        like_count=comment.like_count,
        is_liked=comment.id in liked_comments,
        replies=replies_map.get(comment.id, []) if replies_map else [],
    )


def _build_comments_tree(
    db: Session, comments: list[Comment], viewer: User | None
) -> list[CommentOut]:
    if not comments:
        return []
    comment_ids = [c.id for c in comments]
    liked = _liked_comment_ids(db, viewer.id if viewer else None, comment_ids)
    top_level = [c for c in comments if c.parent_id is None]
    replies = [c for c in comments if c.parent_id is not None]
    replies_map: dict[int, list[CommentOut]] = {}
    for reply in replies:
        replies_map.setdefault(reply.parent_id, []).append(_comment_to_out(db, reply, viewer, liked_comments=liked))
    for pid in replies_map:
        replies_map[pid].sort(key=lambda r: r.created_at)
    return [
        _comment_to_out(db, c, viewer, replies_map=replies_map, liked_comments=liked) for c in top_level
    ]


def _comments_for_posts(db: Session, post_ids: list[int], viewer: User | None, limit: int = 20) -> dict[int, list]:
    if not post_ids:
        return {}
    comments = db.scalars(
        select(Comment)
        .where(Comment.post_id.in_(post_ids))
        .options(joinedload(Comment.user))
        .order_by(Comment.created_at)
    ).all()
    grouped_raw: dict[int, list[Comment]] = {pid: [] for pid in post_ids}
    for c in comments:
        grouped_raw[c.post_id].append(c)
    grouped: dict[int, list] = {}
    for pid, post_comments in grouped_raw.items():
        top = [c for c in post_comments if c.parent_id is None][-limit:]
        allowed_ids = {c.id for c in top}
        for c in post_comments:
            if c.parent_id in allowed_ids:
                allowed_ids.add(c.id)
        filtered = [c for c in post_comments if c.id in allowed_ids or c.parent_id in allowed_ids]
        grouped[pid] = _build_comments_tree(db, filtered, viewer)
    return grouped


def build_post_out(db: Session, post: Post, viewer: User | None, *, comments_map=None, tags_map=None, media_map=None, products_map=None, liked=None, saved=None) -> PostOut:
    post_ids = [post.id]
    if comments_map is None:
        comments_map = _comments_for_posts(db, post_ids, viewer)
    if tags_map is None:
        tags_map = _tagged_users_for_posts(db, post_ids, viewer)
    if media_map is None:
        media_map = _media_for_posts(db, post_ids)
    if products_map is None:
        products_map = _products_for_posts(db, [post])
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
        post_type=post.post_type,
        product=products_map.get(post.id),
        rating=post.rating,
        like_count=post.like_count,
        comment_count=post.comment_count,
        is_liked=post.id in liked,
        is_saved=post.id in saved,
        created_at=to_iso(post.created_at),
        comments=comments_map.get(post.id, []),
        tagged_users=tags_map.get(post.id, []),
        media=media,
    )


def _tab_post_type(tab: str) -> str:
    if tab == "reviews":
        return "review"
    return "product"


def _apply_feed_filters(
    db: Session,
    base,
    viewer: User | None,
    *,
    post_type: str | None = None,
):
    if post_type:
        base = base.where(Post.post_type == post_type)
    blocked = blocked_user_ids(db, viewer.id) if viewer else set()
    if blocked:
        base = base.where(Post.user_id.notin_(blocked))
    if viewer:
        hidden = _hidden_post_ids(db, viewer.id)
        if hidden:
            base = base.where(Post.id.notin_(hidden))
    return base


def get_tab_feed_posts(
    db: Session,
    viewer: User | None,
    page: int,
    limit: int,
    *,
    tab: str = "products",
    cursor: str | None = None,
) -> tuple[list[Post], int, str | None]:
    """Chronological product/review feed for the home tabs."""
    if tab not in FEED_TABS:
        tab = "products"
    post_type = _tab_post_type(tab)

    base = (
        select(Post)
        .join(User, Post.user_id == User.id)
        .where(User.is_active.is_(True), Post.is_archived.is_(False), Post.post_type == post_type)
    )
    base = _apply_feed_filters(db, base, viewer)

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    if total == 0:
        return [], 0, None

    query = base.options(joinedload(Post.user)).order_by(desc(Post.created_at), desc(Post.id))

    if cursor:
        try:
            decoded = decode_cursor(cursor)
            c_time = datetime.fromisoformat(decoded["t"])
            c_id = int(decoded["id"])
            query = query.where(
                or_(
                    Post.created_at < c_time,
                    and_(Post.created_at == c_time, Post.id < c_id),
                )
            )
            posts = db.scalars(query.limit(limit)).all()
        except (ValueError, KeyError):
            posts = []
    else:
        offset = (page - 1) * limit
        posts = db.scalars(query.offset(offset).limit(limit)).all()

    posts_list = list(posts)
    next_cursor = None
    if posts_list and len(posts_list) == limit:
        last = posts_list[-1]
        next_cursor = cursor_from_post(priority=0, created_at=last.created_at, post_id=last.id)
    return posts_list, total, next_cursor


def get_home_feed_posts(
    db: Session, user: User, page: int, limit: int, *, cursor: str | None = None, tab: str = "products"
) -> tuple[list[Post], int, str | None]:
    """Authenticated home feed — product/review tabs."""
    return get_tab_feed_posts(db, user, page, limit, tab=tab, cursor=cursor)


def get_explore_posts(
    db: Session, viewer: User | None, offset: int, limit: int, *, tab: str = "products"
) -> tuple[list[Post], int]:
    """Guest/authenticated explore — product/review tabs with engagement weighting."""
    if tab not in FEED_TABS:
        tab = "products"
    post_type = _tab_post_type(tab)

    following: set[int] = set()
    if viewer:
        following = get_following_ids(db, viewer.id)
    follow_boost = case((Post.user_id.in_(following), 5), else_=0) if following else 0
    score = Post.like_count * 2 + Post.comment_count * 3 + follow_boost

    base = select(Post).join(User, Post.user_id == User.id).where(
        User.is_active.is_(True), Post.is_archived.is_(False), Post.post_type == post_type
    )
    base = _apply_feed_filters(db, base, viewer)

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    posts = db.scalars(
        base.options(joinedload(Post.user)).order_by(desc(score), desc(Post.created_at)).offset(offset).limit(limit)
    ).all()
    return list(posts), total


def build_posts_out(db: Session, posts: list[Post], viewer: User | None) -> list[PostOut]:
    if not posts:
        return []
    post_ids = [p.id for p in posts]
    comments_map = _comments_for_posts(db, post_ids, viewer)
    tags_map = _tagged_users_for_posts(db, post_ids, viewer)
    media_map = _media_for_posts(db, post_ids)
    products_map = _products_for_posts(db, posts)
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
            products_map=products_map,
            liked=liked,
            saved=saved,
        )
        for p in posts
    ]


def get_post_or_404(db: Session, post_id: int) -> Post:
    # A deactivated account can't be authenticated (dependencies.py rejects
    # inactive users), so there's no "owner viewing their own post" case to
    # protect here — a post whose owner is deactivated is 404 for everyone,
    # matching how it disappears from the feed/profile/explore/likes/comments.
    post = db.scalar(
        select(Post)
        .join(User, Post.user_id == User.id)
        .where(Post.id == post_id, User.is_active.is_(True))
        .options(joinedload(Post.user))
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
        .where(Comment.post_id == post_id, Comment.parent_id.is_(None))
        .options(joinedload(Comment.user))
        .order_by(Comment.created_at)
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    offset = (page - 1) * limit
    top_comments = db.scalars(base.offset(offset).limit(limit)).all()
    if not top_comments:
        return [], total
    top_ids = [c.id for c in top_comments]
    all_comments = list(top_comments) + list(
        db.scalars(
            select(Comment)
            .where(Comment.post_id == post_id, Comment.parent_id.in_(top_ids))
            .options(joinedload(Comment.user))
            .order_by(Comment.created_at)
        ).all()
    )
    return _build_comments_tree(db, all_comments, viewer), total


def toggle_comment_like(db: Session, post_id: int, comment_id: int, user: User) -> tuple[bool, int]:
    from fastapi import HTTPException
    from sqlalchemy.exc import IntegrityError

    get_post_or_404(db, post_id)
    comment = db.scalar(select(Comment).where(Comment.id == comment_id, Comment.post_id == post_id))
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    existing = db.scalar(
        select(CommentLike).where(CommentLike.user_id == user.id, CommentLike.comment_id == comment_id)
    )
    if existing:
        db.delete(existing)
        db.execute(
            update(Comment)
            .where(Comment.id == comment_id)
            .values(like_count=case((Comment.like_count > 0, Comment.like_count - 1), else_=0))
        )
        db.commit()
        db.refresh(comment)
        return False, comment.like_count
    db.add(CommentLike(user_id=user.id, comment_id=comment_id))
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        db.refresh(comment)
        return True, comment.like_count
    db.execute(update(Comment).where(Comment.id == comment_id).values(like_count=Comment.like_count + 1))
    db.commit()
    db.refresh(comment)
    return True, comment.like_count


def delete_post_by_owner(db: Session, post_id: int, user: User) -> None:
    from fastapi import HTTPException

    post = get_post_or_404(db, post_id)
    if post.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this post")
    db.delete(post)
    db.commit()


def delete_post_comment(db: Session, post_id: int, comment_id: int, user: User) -> None:
    from fastapi import HTTPException

    post = get_post_or_404(db, post_id)
    comment = db.scalar(select(Comment).where(Comment.id == comment_id, Comment.post_id == post_id))
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != user.id and post.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this comment")
    reply_count = db.scalar(
        select(func.count()).select_from(Comment).where(Comment.parent_id == comment_id)
    ) or 0
    remove_count = 1 + reply_count
    db.delete(comment)
    db.execute(
        update(Post)
        .where(Post.id == post_id)
        .values(
            comment_count=case(
                (Post.comment_count >= remove_count, Post.comment_count - remove_count),
                else_=0,
            )
        )
    )
    db.commit()


def update_post_by_owner(
    db: Session, post_id: int, user: User, *, caption: str | None = None, location: str | None = None
) -> Post:
    from fastapi import HTTPException
    from sqlalchemy import delete

    from app.models import PostHashtag

    post = get_post_or_404(db, post_id)
    if post.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed to edit this post")
    if caption is not None:
        post.caption = caption or None
        db.execute(delete(PostHashtag).where(PostHashtag.post_id == post_id))
        db.commit()
        db.refresh(post)
        tag_names = extract_hashtags(post.caption)
        if tag_names:
            from app.services.hashtags import attach_hashtags_to_post

            attach_hashtags_to_post(db, post, tag_names)
    if location is not None:
        post.location = location or None
    db.commit()
    db.refresh(post)
    return post


def set_post_archived(db: Session, post_id: int, user: User, *, archived: bool) -> Post:
    from fastapi import HTTPException

    post = get_post_or_404(db, post_id)
    if post.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed to archive this post")
    post.is_archived = archived
    db.commit()
    db.refresh(post)
    return post


def hide_post_for_user(db: Session, post_id: int, user: User) -> None:
    get_post_or_404(db, post_id)
    existing = db.scalar(
        select(HiddenPost.id).where(HiddenPost.user_id == user.id, HiddenPost.post_id == post_id)
    )
    if not existing:
        db.add(HiddenPost(user_id=user.id, post_id=post_id))
        db.commit()


def report_post(db: Session, post_id: int, user: User, *, reason: str, details: str | None) -> None:
    get_post_or_404(db, post_id)
    db.add(PostReport(reporter_id=user.id, post_id=post_id, reason=reason, details=details))
    db.commit()


def create_review_post(
    db: Session,
    user: User,
    *,
    order_id: int,
    rating: int,
    caption: str | None,
    saved_media: list[tuple[str, str]],
) -> Post:
    from app.models import Order

    order = db.scalar(
        select(Order)
        .where(Order.id == order_id, Order.user_id == user.id)
        .options(joinedload(Order.product))
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "delivered":
        raise HTTPException(status_code=400, detail="Reviews are only allowed after delivery")
    existing = db.scalar(
        select(Post.id).where(Post.post_type == "review", Post.order_id == order_id)
    )
    if existing:
        raise HTTPException(status_code=409, detail="Review already exists for this order")

    cover_url = saved_media[0][0]
    post = Post(
        user_id=user.id,
        image_url=cover_url,
        caption=caption,
        like_count=0,
        comment_count=0,
        post_type="review",
        reviewed_product_id=order.product_id,
        order_id=order.id,
        rating=rating,
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

    db.commit()
    db.refresh(post)
    post.user = user

    tag_names = extract_hashtags(caption)
    if tag_names:
        from app.services.hashtags import attach_hashtags_to_post

        attach_hashtags_to_post(db, post, tag_names)
        db.commit()

    return post


def list_archived_posts(db: Session, user: User, offset: int, limit: int) -> tuple[list[Post], int]:
    base = select(Post).where(Post.user_id == user.id, Post.is_archived.is_(True))
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    posts = db.scalars(
        base.options(joinedload(Post.user)).order_by(desc(Post.created_at)).offset(offset).limit(limit)
    ).all()
    return list(posts), total


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
        order_id=notification.order_id,
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
