from pydantic import BaseModel


class RecentSearchOut(BaseModel):
    id: int
    query: str
    search_type: str
    searched_at: str


class HashtagSearchOut(BaseModel):
    name: str
    post_count: int


class ProductSearchOut(BaseModel):
    id: int
    post_id: int
    name: str
    price: int
    unit: str
    storage_type: str
    availability: str
    stock: int
    image_url: str | None = None
    is_available: bool
