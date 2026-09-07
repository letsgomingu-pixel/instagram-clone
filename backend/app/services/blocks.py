from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import UserBlock


def blocked_user_ids(db: Session, viewer_id: int) -> set[int]:
    """Users the viewer has blocked or who have blocked the viewer."""
    blocked_by_me = select(UserBlock.blocked_id).where(UserBlock.blocker_id == viewer_id)
    blocked_me = select(UserBlock.blocker_id).where(UserBlock.blocked_id == viewer_id)
    rows = db.scalars(blocked_by_me.union(blocked_me)).all()
    return set(rows)


def is_blocked(db: Session, user_a: int, user_b: int) -> bool:
    if user_a == user_b:
        return False
    exists = db.scalar(
        select(UserBlock.id).where(
            or_(
                (UserBlock.blocker_id == user_a) & (UserBlock.blocked_id == user_b),
                (UserBlock.blocker_id == user_b) & (UserBlock.blocked_id == user_a),
            )
        )
    )
    return exists is not None


def block_user(db: Session, blocker: int, blocked: int) -> None:
    from fastapi import HTTPException

    if blocker == blocked:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    if is_blocked(db, blocker, blocked):
        return
    db.add(UserBlock(blocker_id=blocker, blocked_id=blocked))
    db.commit()


def unblock_user(db: Session, blocker: int, blocked: int) -> None:
    row = db.scalar(
        select(UserBlock).where(UserBlock.blocker_id == blocker, UserBlock.blocked_id == blocked)
    )
    if row:
        db.delete(row)
        db.commit()
