from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class StoryOverlayOut(BaseModel):
    id: str
    type: Literal["text", "sticker"]
    content: str
    x: float = Field(ge=0, le=100)
    y: float = Field(ge=0, le=100)
    scale: float = 1.0
    rotation: float = 0.0
    color: str | None = None
    font_size: int | None = None


class StoryItemOut(BaseModel):
    id: int
    image_url: str
    media_type: Literal["image", "video"] = "image"
    overlays: list[StoryOverlayOut] = []
    created_at: str


class StoryOut(BaseModel):
    id: int
    user: UserOut
    items: list[StoryItemOut]
    viewed: bool


class StoryViewResponse(BaseModel):
    viewed: bool = True
