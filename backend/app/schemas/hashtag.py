from pydantic import BaseModel

from app.schemas.post import PostOut


class HashtagPageOut(BaseModel):
    name: str
    post_count: int
    items: list[PostOut]
    total: int
    page: int
    limit: int
    next_page: int | None
