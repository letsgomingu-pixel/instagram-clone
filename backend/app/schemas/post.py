from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class CommentOut(BaseModel):
    id: int
    user: UserOut
    content: str
    created_at: str


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2200)


class PostMediaOut(BaseModel):
    id: int
    media_url: str
    media_type: str
    position: int


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
