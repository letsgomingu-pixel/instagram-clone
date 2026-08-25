from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User, UserSettings
from app.schemas.settings import UserSettingsOut, UserSettingsUpdate


def settings_to_out(settings: UserSettings) -> UserSettingsOut:
    return UserSettingsOut(
        notify_likes=settings.notify_likes,
        notify_comments=settings.notify_comments,
        notify_follows=settings.notify_follows,
        notify_mentions=settings.notify_mentions,
        is_private=settings.is_private,
        show_activity_status=settings.show_activity_status,
        allow_story_replies=settings.allow_story_replies,
        comments_privacy=settings.comments_privacy,  # type: ignore[arg-type]
        mentions_privacy=settings.mentions_privacy,  # type: ignore[arg-type]
    )


def get_or_create_settings(db: Session, user: User, *, commit: bool = True) -> UserSettings:
    existing = db.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
    if existing:
        return existing
    settings = UserSettings(user_id=user.id)
    db.add(settings)
    if commit:
        db.commit()
        db.refresh(settings)
    else:
        db.flush()
    return settings


def get_settings(db: Session, user: User) -> UserSettingsOut:
    settings = get_or_create_settings(db, user)
    return settings_to_out(settings)


def update_settings(db: Session, user: User, body: UserSettingsUpdate) -> UserSettingsOut:
    settings = get_or_create_settings(db, user)
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings_to_out(settings)


def user_allows_notification(db: Session, user_id: int, pref: str) -> bool:
    settings = db.scalar(select(UserSettings).where(UserSettings.user_id == user_id))
    if settings is None:
        return True
    return bool(getattr(settings, pref, True))
