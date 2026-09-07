from pydantic import BaseModel, Field

from app.schemas.post import PostOut


class CollectionOut(BaseModel):
    id: int
    name: str
    post_count: int
    cover_url: str | None = None
    created_at: str


class CollectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class CollectionPostOut(BaseModel):
    items: list[PostOut]
