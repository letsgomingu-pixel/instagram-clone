from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class CommentOut(BaseModel):
    id: int
    user: UserOut
    content: str
    created_at: str
    parent_id: int | None = None
    like_count: int = 0
    is_liked: bool = False
    replies: list["CommentOut"] = []


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2200)
    parent_id: int | None = None


class CommentLikeResponse(BaseModel):
    is_liked: bool
    like_count: int


class PostMediaOut(BaseModel):
    id: int
    media_url: str
    media_type: str
    position: int


class PostUpdate(BaseModel):
    caption: str | None = Field(None, max_length=2200)
    location: str | None = Field(None, max_length=255)


class PostReportCreate(BaseModel):
    reason: str = Field(min_length=1, max_length=50)
    details: str | None = Field(None, max_length=500)


class PostOut(BaseModel):
    id: int
    user: UserOut
    image_url: str
    caption: str | None = None
    location: str | None = None
    like_count: int
    comment_count: int
    is_liked: bool = False
    is_saved: bool = False
    created_at: str
    comments: list[CommentOut] = []
    tagged_users: list[UserOut] = []
    media: list[PostMediaOut] = []


class LikeToggleResponse(BaseModel):
    is_liked: bool
    like_count: int


class SaveToggleResponse(BaseModel):
    is_saved: bool


CommentOut.model_rebuild()
