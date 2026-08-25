from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Follow, Notification, Post, User
from app.services.settings import user_allows_notification


def _followers_of(db: Session, user_id: int) -> list[int]:
    return list(
        db.scalars(select(Follow.follower_id).where(Follow.following_id == user_id)).all()
    )


def create_follow_notification(db: Session, actor: User, target: User) -> None:
    if actor.id == target.id:
        return
    if not user_allows_notification(db, target.id, "notify_follows"):
        return
    db.add(
        Notification(
            recipient_id=target.id,
            actor_id=actor.id,
            type="follow",
            tab="you",
            is_read=False,
        )
    )


def create_post_activity_notifications(
    db: Session,
    *,
    actor: User,
    post: Post,
    ntype: str,
    comment_preview: str | None = None,
) -> None:
    owner = db.get(User, post.user_id)
    if owner is None:
        return

    owner_pref = "notify_comments" if ntype == "comment" else "notify_likes"

    if actor.id != owner.id and user_allows_notification(db, owner.id, owner_pref):
        db.add(
            Notification(
                recipient_id=owner.id,
                actor_id=actor.id,
                type=ntype,
                tab="you",
                post_id=post.id,
                comment_preview=comment_preview,
                is_read=False,
            )
        )

    follower_pref = "notify_comments" if ntype == "comment" else "notify_likes"
    for follower_id in _followers_of(db, actor.id):
        if follower_id in (actor.id, owner.id):
            continue
        if not user_allows_notification(db, follower_id, follower_pref):
            continue
        db.add(
            Notification(
                recipient_id=follower_id,
                actor_id=actor.id,
                type=ntype,
                tab="following",
                post_id=post.id,
                comment_preview=comment_preview,
                is_read=False,
            )
        )
