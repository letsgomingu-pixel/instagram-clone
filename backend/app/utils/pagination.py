from math import ceil
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int
    next_page: int | None


def pagination_params(page: int = 1, limit: int = 10) -> tuple[int, int, int]:
    page = max(1, page)
    limit = min(max(1, limit), 30)
    offset = (page - 1) * limit
    return page, limit, offset


def paginate(items: list[T], total: int, page: int, limit: int) -> PaginatedResponse[T]:
    total_pages = ceil(total / limit) if limit else 0
    next_page = page + 1 if page < total_pages else None
    return PaginatedResponse(items=items, total=total, page=page, limit=limit, next_page=next_page)
