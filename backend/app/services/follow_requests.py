from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Follow, FollowRequest, User, UserSettings
from app.schemas.user import UserOut
from app.services.notifications import create_follow_notification, create_follow_request_notification
from app.services.users import build_user_out, user_is_private


def has_pending_request(db: Session, requester_id: int | None, target_id: int) -> bool:
    if requester_id is None:
        return False
    return (
        db.scalar(
            select(FollowRequest.id).where(
                FollowRequest.requester_id == requester_id,
                FollowRequest.target_id == target_id,
            )
        )
        is not None
    )


def request_follow(db: Session, requester: User, target: User) -> bool:
    """Create a follow request for a private account. Returns True if request was created."""
    existing = db.scalar(
        select(FollowRequest).where(
            FollowRequest.requester_id == requester.id,
            FollowRequest.target_id == target.id,
        )
    )
    if existing:
        return True
    db.add(FollowRequest(requester_id=requester.id, target_id=target.id))
    create_follow_request_notification(db, requester, target)
    db.commit()
    return True


def cancel_follow_request(db: Session, requester_id: int, target_id: int) -> None:
    req = db.scalar(
        select(FollowRequest).where(
            FollowRequest.requester_id == requester_id,
            FollowRequest.target_id == target_id,
        )
    )
    if req:
        db.delete(req)
        db.commit()


def list_follow_requests(db: Session, user: User) -> list[UserOut]:
    requests = db.scalars(
        select(FollowRequest)
        .where(FollowRequest.target_id == user.id)
        .order_by(FollowRequest.created_at.desc())
    ).all()
    requester_ids = [r.requester_id for r in requests]
    if not requester_ids:
        return []
    users = db.scalars(select(User).where(User.id.in_(requester_ids))).all()
    by_id = {u.id: u for u in users}
    return [build_user_out(db, by_id[r.requester_id], user) for r in requests if r.requester_id in by_id]


def accept_follow_request(db: Session, owner: User, request_id: int) -> UserOut:
    req = db.get(FollowRequest, request_id)
    if not req or req.target_id != owner.id:
        raise HTTPException(status_code=404, detail="Follow request not found")
    requester = db.get(User, req.requester_id)
    if not requester:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.scalar(
        select(Follow.id).where(
            Follow.follower_id == req.requester_id,
            Follow.following_id == owner.id,
        )
    )
    if not existing:
        db.add(Follow(follower_id=req.requester_id, following_id=owner.id))
        create_follow_notification(db, requester, owner)
    db.delete(req)
    db.commit()
    return build_user_out(db, requester, owner)


def reject_follow_request(db: Session, owner: User, request_id: int) -> None:
    req = db.get(FollowRequest, request_id)
    if not req or req.target_id != owner.id:
        raise HTTPException(status_code=404, detail="Follow request not found")
    db.delete(req)
    db.commit()


def _get_request_by_requester(db: Session, owner_id: int, requester_id: int) -> FollowRequest | None:
    return db.scalar(
        select(FollowRequest).where(
            FollowRequest.requester_id == requester_id,
            FollowRequest.target_id == owner_id,
        )
    )


def accept_follow_request_by_requester(db: Session, owner: User, requester_id: int) -> UserOut:
    req = _get_request_by_requester(db, owner.id, requester_id)
    if not req:
        raise HTTPException(status_code=404, detail="Follow request not found")
    return accept_follow_request(db, owner, req.id)


def reject_follow_request_by_requester(db: Session, owner: User, requester_id: int) -> None:
    req = _get_request_by_requester(db, owner.id, requester_id)
    if not req:
        raise HTTPException(status_code=404, detail="Follow request not found")
    db.delete(req)
    db.commit()


def target_requires_follow_request(db: Session, target_id: int) -> bool:
    return user_is_private(db, target_id)
