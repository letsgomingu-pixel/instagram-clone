from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Hashtag, PostHashtag, RecentSearch, User
from app.schemas.search import HashtagSearchOut, RecentSearchOut
from app.services.users import build_user_out, search_users


def record_search(db: Session, user_id: int, query: str, search_type: str) -> None:
    q = query.strip()
    if not q:
        return
    existing = db.scalar(
        select(RecentSearch).where(
            RecentSearch.user_id == user_id,
            RecentSearch.query == q,
            RecentSearch.search_type == search_type,
        )
    )
    if existing:
        from datetime import datetime, timezone

        existing.searched_at = datetime.now(timezone.utc)
    else:
        db.add(RecentSearch(user_id=user_id, query=q, search_type=search_type))
    db.commit()


def list_recent_searches(db: Session, user_id: int, limit: int = 20) -> list[RecentSearchOut]:
    rows = db.scalars(
        select(RecentSearch)
        .where(RecentSearch.user_id == user_id)
        .order_by(desc(RecentSearch.searched_at))
        .limit(limit)
    ).all()
    return [
        RecentSearchOut(id=r.id, query=r.query, search_type=r.search_type, searched_at=r.searched_at.isoformat())
        for r in rows
    ]


def clear_recent_searches(db: Session, user_id: int) -> None:
    for row in db.scalars(select(RecentSearch).where(RecentSearch.user_id == user_id)).all():
        db.delete(row)
    db.commit()


def delete_recent_search(db: Session, user_id: int, search_id: int) -> None:
    from fastapi import HTTPException

    row = db.get(RecentSearch, search_id)
    if not row or row.user_id != user_id:
        raise HTTPException(status_code=404, detail="Search not found")
    db.delete(row)
    db.commit()


def search_hashtags(db: Session, q: str, limit: int = 20) -> list[HashtagSearchOut]:
    pattern = f"%{q.strip().lower()}%"
    rows = db.execute(
        select(Hashtag.name, func.count(PostHashtag.id).label("post_count"))
        .join(PostHashtag, PostHashtag.hashtag_id == Hashtag.id, isouter=True)
        .where(Hashtag.name.ilike(pattern))
        .group_by(Hashtag.id)
        .order_by(desc("post_count"))
        .limit(limit)
    ).all()
    return [HashtagSearchOut(name=r.name, post_count=r.post_count or 0) for r in rows]


def search_users_with_record(db: Session, q: str, viewer: User, *, record: bool = True) -> list:
    if record:
        record_search(db, viewer.id, q, "user")
    return search_users(db, q, viewer)
