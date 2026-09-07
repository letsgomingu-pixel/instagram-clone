from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models import Hashtag, Post, PostHashtag, User
from app.schemas.hashtag import HashtagPageOut
from app.services.posts import build_posts_out


def get_or_create_hashtag(db: Session, name: str) -> Hashtag:
    tag = db.scalar(select(Hashtag).where(Hashtag.name == name))
    if tag:
        return tag
    tag = Hashtag(name=name)
    db.add(tag)
    try:
        db.flush()
    except IntegrityError:
        # Two posts introducing the same brand-new tag at the same instant —
        # the loser re-fetches the winner's row instead of erroring out.
        db.rollback()
        tag = db.scalar(select(Hashtag).where(Hashtag.name == name))
    return tag


def attach_hashtags_to_post(db: Session, post: Post, tag_names: list[str]) -> None:
    """Parse-and-link step for a post's caption hashtags. Call this only
    AFTER `post` itself is already committed: each tag lookup below commits
    or rolls back on its own, and a rollback here must never be able to
    reach back and undo the post/media/tag rows created earlier in the same
    request."""
    for name in tag_names:
        tag = get_or_create_hashtag(db, name)
        if tag is None:
            continue
        db.add(PostHashtag(post_id=post.id, hashtag_id=tag.id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()


def get_hashtag_page(db: Session, name: str, viewer: User | None, page: int, limit: int) -> HashtagPageOut:
    normalized = name.strip().lstrip("#").lower()
    tag = db.scalar(select(Hashtag).where(Hashtag.name == normalized))
    if not tag:
        return HashtagPageOut(
            name=normalized, post_count=0, items=[], total=0, page=page, limit=limit, next_page=None
        )

    # Same rule as everywhere else: a deactivated account's posts don't
    # surface here either.
    base = (
        select(Post)
        .join(PostHashtag, PostHashtag.post_id == Post.id)
        .join(User, Post.user_id == User.id)
        .where(PostHashtag.hashtag_id == tag.id, User.is_active.is_(True))
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    offset = (page - 1) * limit
    posts = db.scalars(
        base.options(joinedload(Post.user)).order_by(desc(Post.created_at)).offset(offset).limit(limit)
    ).all()
    items = build_posts_out(db, list(posts), viewer)
    next_page = page + 1 if page * limit < total else None
    return HashtagPageOut(
        name=normalized, post_count=total, items=items, total=total, page=page, limit=limit, next_page=next_page
    )
