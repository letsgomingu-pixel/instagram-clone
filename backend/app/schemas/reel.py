from pydantic import BaseModel

from app.schemas.user import UserOut


class ReelOut(BaseModel):
    id: int
    user: UserOut
    thumbnail_url: str
    video_url: str | None = None
    caption: str | None = None
    audio_name: str | None = None
    like_count: int
    comment_count: int
    view_count: int
    is_liked: bool = False
    created_at: str


class ReelLikeResponse(BaseModel):
    is_liked: bool
    like_count: int


class ReelViewResponse(BaseModel):
    view_count: int
