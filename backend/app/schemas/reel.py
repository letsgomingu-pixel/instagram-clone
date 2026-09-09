from pydantic import BaseModel, Field

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


class ReelCommentOut(BaseModel):
    id: int
    user: UserOut
    content: str
    created_at: str


class ReelReportCreate(BaseModel):
    reason: str = Field(min_length=1, max_length=50)
    details: str | None = Field(None, max_length=500)
