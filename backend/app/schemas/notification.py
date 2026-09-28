from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class NotificationOut(BaseModel):
    id: int
    type: str
    tab: str
    actor: UserOut
    target_username: str | None = None
    post_id: int | None = None
    order_id: int | None = None
    post_image_url: str | None = None
    comment_preview: str | None = None
    created_at: str
    is_read: bool


class NotificationReadUpdate(BaseModel):
    is_read: bool = True


class PushSubscribeIn(BaseModel):
    endpoint: str = Field(min_length=8, max_length=2000)
    p256dh: str = Field(min_length=1, max_length=255)
    auth: str = Field(min_length=1, max_length=255)


class PushKeyOut(BaseModel):
    public_key: str
