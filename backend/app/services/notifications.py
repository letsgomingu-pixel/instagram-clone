from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Comment, Notification, Post, User
from app.services.settings import user_allows_notification
from app.utils.mentions import extract_mentions


def _followers_of(db: Session, user_id: int) -> list[int]:
    from app.models import Follow

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


def create_follow_request_notification(db: Session, actor: User, target: User) -> None:
    if actor.id == target.id:
        return
    if not user_allows_notification(db, target.id, "notify_follows"):
        return
    db.add(
        Notification(
            recipient_id=target.id,
            actor_id=actor.id,
            type="follow_request",
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


def create_mention_notifications(
    db: Session,
    *,
    actor: User,
    text: str,
    post_id: int | None = None,
    comment_preview: str | None = None,
) -> None:
    usernames = extract_mentions(text)
    if not usernames:
        return
    for username in usernames:
        target = db.scalar(select(User).where(User.username.ilike(username)))
        if not target or target.id == actor.id:
            continue
        if not user_allows_notification(db, target.id, "notify_mentions"):
            continue
        db.add(
            Notification(
                recipient_id=target.id,
                actor_id=actor.id,
                type="mention",
                tab="you",
                post_id=post_id,
                comment_preview=comment_preview or text[:200],
                is_read=False,
            )
        )


def create_reply_notification(
    db: Session,
    *,
    actor: User,
    parent_comment: Comment,
    post: Post,
    preview: str,
) -> None:
    if parent_comment.user_id == actor.id:
        return
    if not user_allows_notification(db, parent_comment.user_id, "notify_comments"):
        return
    db.add(
        Notification(
            recipient_id=parent_comment.user_id,
            actor_id=actor.id,
            type="reply",
            tab="you",
            post_id=post.id,
            comment_preview=preview[:200],
            is_read=False,
        )
    )


def create_tag_notifications(db: Session, *, actor: User, post: Post, tagged_user_ids: list[int]) -> None:
    for uid in tagged_user_ids:
        if uid == actor.id:
            continue
        if not user_allows_notification(db, uid, "notify_mentions"):
            continue
        db.add(
            Notification(
                recipient_id=uid,
                actor_id=actor.id,
                type="mention",
                tab="you",
                post_id=post.id,
                comment_preview="회원님을 게시물에 태그했습니다.",
                is_read=False,
            )
        )
