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
    orders_today: int = 0
    revenue_today: int = 0
    pending_shipment: int = 0
    paid_orders: int = 0


class AdminUserOut(UserOut):
    is_active: bool
    created_at: str


class AdminUserStatusUpdate(BaseModel):
    is_active: bool


class AdminMessageOut(BaseModel):
    message: str


class AdminPostReportOut(BaseModel):
    id: int
    post_id: int
    post_image_url: str | None
    post_caption: str | None
    post_author_username: str
    reporter_username: str
    reason: str
    details: str | None
    created_at: str


class AdminUserReportOut(BaseModel):
    id: int
    reported_user_id: int
    reported_username: str
    reporter_username: str
    reason: str
    details: str | None
    created_at: str


class AdminReelReportOut(BaseModel):
    id: int
    reel_id: int
    reel_caption: str | None
    reel_author_username: str
    reporter_username: str
    reason: str
    details: str | None
    created_at: str
