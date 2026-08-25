from pydantic import BaseModel

from app.schemas.user import UserOut


class NotificationOut(BaseModel):
    id: int
    type: str
    tab: str
    actor: UserOut
    target_username: str | None = None
    post_id: int | None = None
    post_image_url: str | None = None
    comment_preview: str | None = None
    created_at: str
    is_read: bool


class NotificationReadUpdate(BaseModel):
    is_read: bool = True
