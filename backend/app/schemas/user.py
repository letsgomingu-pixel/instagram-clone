from pydantic import BaseModel, EmailStr, Field

from app.schemas.shipping import ShippingFields


class UserUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=30)
    full_name: str | None = Field(None, max_length=100)
    bio: str | None = Field(None, max_length=150)
    website: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, min_length=1, max_length=20)
    postcode: str | None = Field(None, min_length=5, max_length=10)
    address_line1: str | None = Field(None, min_length=1, max_length=255)
    address_line2: str | None = Field(None, min_length=1, max_length=255)


class ShippingUpdate(ShippingFields):
    pass


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    bio: str | None = None
    website: str | None = None
    avatar_url: str | None = None
    post_count: int
    follower_count: int
    following_count: int
    is_following: bool = False
    is_own_profile: bool = False
    is_admin: bool = False
    is_private: bool = False
    is_requested: bool = False
    is_active_now: bool | None = None
    phone: str | None = None
    postcode: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None

    model_config = {"from_attributes": True}


class SuggestedUserOut(UserOut):
    reason: str | None = None


class UsernameCheck(BaseModel):
    available: bool


class FollowResponse(BaseModel):
    is_following: bool
    is_requested: bool = False


class AccountDeactivateRequest(BaseModel):
    password: str = Field(min_length=1)


class UserReportCreate(BaseModel):
    reason: str = Field(min_length=1, max_length=50)
    details: str | None = Field(None, max_length=500)
