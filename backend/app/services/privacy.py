from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import LoginSession, UserSettings
from app.services.users import is_following

PRIVACY_LEVELS = ("everyone", "followers", "off")
ACTIVE_WINDOW_MINUTES = 5


def _get_settings(db: Session, user_id: int) -> UserSettings | None:
    return db.scalar(select(UserSettings).where(UserSettings.user_id == user_id))


def assert_can_comment(db: Session, post_owner_id: int, commenter_id: int) -> None:
    if post_owner_id == commenter_id:
        return
    settings = _get_settings(db, post_owner_id)
    if not settings:
        return
    level = settings.comments_privacy
    if level == "everyone":
        return
    if level == "off":
        raise HTTPException(status_code=403, detail="Comments are disabled on this post")
    if level == "followers" and not is_following(db, commenter_id, post_owner_id):
        raise HTTPException(status_code=403, detail="Only followers can comment on this post")


def can_mention_user(db: Session, target_id: int, actor_id: int) -> bool:
    if target_id == actor_id:
        return True
    settings = _get_settings(db, target_id)
    if not settings:
        return True
    level = settings.mentions_privacy
    if level == "everyone":
        return True
    if level == "off":
        return False
    if level == "followers":
        return is_following(db, actor_id, target_id)
    return True


def assert_story_replies_allowed(db: Session, story_owner_id: int) -> None:
    settings = _get_settings(db, story_owner_id)
    if settings and not settings.allow_story_replies:
        raise HTTPException(status_code=403, detail="Story replies are disabled")


def is_user_active_now(db: Session, user_id: int) -> bool:
    settings = _get_settings(db, user_id)
    if settings and not settings.show_activity_status:
        return False
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=ACTIVE_WINDOW_MINUTES)
    last_active = db.scalar(
        select(func.max(LoginSession.last_active_at)).where(LoginSession.user_id == user_id)
    )
    if not last_active:
        return False
    if last_active.tzinfo is None:
        last_active = last_active.replace(tzinfo=timezone.utc)
    return last_active >= cutoff
