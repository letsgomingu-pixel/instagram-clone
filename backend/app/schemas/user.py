from pydantic import BaseModel, EmailStr, Field


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, max_length=100)
    bio: str | None = Field(None, max_length=150)
    website: str | None = Field(None, max_length=255)


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

    model_config = {"from_attributes": True}


class SuggestedUserOut(UserOut):
    reason: str | None = None


class UsernameCheck(BaseModel):
    available: bool


class FollowResponse(BaseModel):
    is_following: bool
