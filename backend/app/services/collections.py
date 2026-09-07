from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Post, SavedCollection, SavedCollectionItem, SavedPost, User
from app.schemas.collection import CollectionOut, CollectionPostOut
from app.services.posts import build_posts_out, get_post_or_404
from app.utils.datetime_fmt import to_iso


def list_collections(db: Session, user: User) -> list[CollectionOut]:
    collections = db.scalars(
        select(SavedCollection)
        .where(SavedCollection.user_id == user.id)
        .order_by(desc(SavedCollection.created_at))
    ).all()
    result: list[CollectionOut] = []
    for col in collections:
        count = db.scalar(
            select(func.count()).select_from(SavedCollectionItem).where(SavedCollectionItem.collection_id == col.id)
        ) or 0
        cover_url = None
        if col.cover_post_id:
            post = db.get(Post, col.cover_post_id)
            if post:
                cover_url = post.image_url
        result.append(
            CollectionOut(
                id=col.id,
                name=col.name,
                post_count=count,
                cover_url=cover_url,
                created_at=to_iso(col.created_at),
            )
        )
    return result


def create_collection(db: Session, user: User, name: str) -> CollectionOut:
    col = SavedCollection(user_id=user.id, name=name.strip())
    db.add(col)
    db.commit()
    db.refresh(col)
    return CollectionOut(id=col.id, name=col.name, post_count=0, cover_url=None, created_at=to_iso(col.created_at))


def add_post_to_collection(db: Session, user: User, collection_id: int, post_id: int) -> None:
    from fastapi import HTTPException
    from sqlalchemy.exc import IntegrityError

    col = db.get(SavedCollection, collection_id)
    if not col or col.user_id != user.id:
        raise HTTPException(status_code=404, detail="Collection not found")
    get_post_or_404(db, post_id)
    saved = db.scalar(select(SavedPost).where(SavedPost.user_id == user.id, SavedPost.post_id == post_id))
    if not saved:
        db.add(SavedPost(user_id=user.id, post_id=post_id))
    try:
        db.add(SavedCollectionItem(collection_id=collection_id, post_id=post_id))
        if not col.cover_post_id:
            col.cover_post_id = post_id
        db.commit()
    except IntegrityError:
        db.rollback()


def remove_post_from_collection(db: Session, user: User, collection_id: int, post_id: int) -> None:
    from fastapi import HTTPException

    col = db.get(SavedCollection, collection_id)
    if not col or col.user_id != user.id:
        raise HTTPException(status_code=404, detail="Collection not found")
    item = db.scalar(
        select(SavedCollectionItem).where(
            SavedCollectionItem.collection_id == collection_id, SavedCollectionItem.post_id == post_id
        )
    )
    if item:
        db.delete(item)
        if col.cover_post_id == post_id:
            next_item = db.scalar(
                select(SavedCollectionItem)
                .where(SavedCollectionItem.collection_id == collection_id)
                .order_by(desc(SavedCollectionItem.created_at))
            )
            col.cover_post_id = next_item.post_id if next_item else None
        db.commit()


def list_collection_posts(db: Session, user: User, collection_id: int, page: int, limit: int) -> tuple[list, int]:
    from fastapi import HTTPException

    col = db.get(SavedCollection, collection_id)
    if not col or col.user_id != user.id:
        raise HTTPException(status_code=404, detail="Collection not found")
    base = (
        select(Post)
        .join(SavedCollectionItem, SavedCollectionItem.post_id == Post.id)
        .join(User, Post.user_id == User.id)
        .where(SavedCollectionItem.collection_id == collection_id, User.is_active.is_(True))
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    offset = (page - 1) * limit
    posts = db.scalars(
        base.options(joinedload(Post.user))
        .order_by(desc(SavedCollectionItem.created_at))
        .offset(offset)
        .limit(limit)
    ).all()
    return build_posts_out(db, list(posts), user), total
