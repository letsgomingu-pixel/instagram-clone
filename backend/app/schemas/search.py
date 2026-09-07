from pydantic import BaseModel


class RecentSearchOut(BaseModel):
    id: int
    query: str
    search_type: str
    searched_at: str


class HashtagSearchOut(BaseModel):
    name: str
    post_count: int
