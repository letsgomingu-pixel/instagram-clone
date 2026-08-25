from pydantic import BaseModel

from app.schemas.user import UserOut


class AdminStatsOut(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    new_users_7d: int
    total_posts: int
    total_comments: int
    total_likes: int
    posts_7d: int


class AdminUserOut(UserOut):
    is_active: bool
    created_at: str


class AdminUserStatusUpdate(BaseModel):
    is_active: bool


class AdminMessageOut(BaseModel):
    message: str
