from typing import Literal

from pydantic import BaseModel, Field

PrivacyLevel = Literal["everyone", "followers", "off"]


class UserSettingsOut(BaseModel):
    notify_likes: bool = True
    notify_comments: bool = True
    notify_follows: bool = True
    notify_mentions: bool = True
    is_private: bool = False
    show_activity_status: bool = True
    allow_story_replies: bool = True
    comments_privacy: PrivacyLevel = "everyone"
    mentions_privacy: PrivacyLevel = "everyone"


class UserSettingsUpdate(BaseModel):
    notify_likes: bool | None = None
    notify_comments: bool | None = None
    notify_follows: bool | None = None
    notify_mentions: bool | None = None
    is_private: bool | None = None
    show_activity_status: bool | None = None
    allow_story_replies: bool | None = None
    comments_privacy: PrivacyLevel | None = None
    mentions_privacy: PrivacyLevel | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)
