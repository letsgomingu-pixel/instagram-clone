from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session

from app.models import User, UserBlock
from app.schemas.user import UserOut
from app.services.users import build_user_out


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


def list_blocked_users(db: Session, viewer: User) -> list[UserOut]:
    blocks = db.scalars(
        select(UserBlock)
        .where(UserBlock.blocker_id == viewer.id)
        .order_by(desc(UserBlock.created_at))
    ).all()
    if not blocks:
        return []
    user_ids = [b.blocked_id for b in blocks]
    users = db.scalars(select(User).where(User.id.in_(user_ids))).all()
    by_id = {u.id: u for u in users}
    return [build_user_out(db, by_id[b.blocked_id], viewer) for b in blocks if b.blocked_id in by_id]


def is_blocked_by_viewer(db: Session, viewer_id: int, target_id: int) -> bool:
    return (
        db.scalar(
            select(UserBlock.id).where(
                UserBlock.blocker_id == viewer_id,
                UserBlock.blocked_id == target_id,
            )
        )
        is not None
    )
