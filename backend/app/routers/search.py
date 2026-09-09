from fastapi import APIRouter, Query

from app.dependencies import CurrentUser, DbSession, OptionalUser
from app.schemas.search import HashtagSearchOut, ProductSearchOut, RecentSearchOut
from app.schemas.user import UserOut
from app.services.products import search_products
from app.services.search import (
    clear_recent_searches,
    delete_recent_search,
    list_recent_searches,
    record_search,
    search_hashtags,
    search_users_with_record,
)

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/users", response_model=list[UserOut])
def search_users_endpoint(
    current_user: CurrentUser,
    db: DbSession,
    q: str = Query(min_length=1),
    record: bool = Query(True),
):
    return search_users_with_record(db, q, current_user, record=record)


@router.get("/hashtags", response_model=list[HashtagSearchOut])
def search_hashtags_endpoint(
    current_user: CurrentUser,
    db: DbSession,
    q: str = Query(min_length=1),
):
    record_search(db, current_user.id, q, "hashtag")
    return search_hashtags(db, q)


@router.get("/products", response_model=list[ProductSearchOut])
def search_products_endpoint(
    db: DbSession,
    current_user: OptionalUser,
    q: str | None = Query(None),
    storage_type: str | None = Query(None, pattern="^(fresh|frozen|dried|smoked)$"),
    availability: str | None = Query(None, pattern="^(year_round|seasonal)$"),
    in_season: bool | None = Query(None),
    limit: int = Query(20, ge=1, le=50),
):
    if not q and not storage_type and not availability and in_season is None:
        return []
    if current_user and q:
        record_search(db, current_user.id, q, "product")
    return search_products(
        db,
        q=q,
        storage_type=storage_type,
        availability=availability,
        in_season=in_season,
        limit=limit,
    )


@router.get("/recent", response_model=list[RecentSearchOut])
def recent_searches(current_user: CurrentUser, db: DbSession):
    return list_recent_searches(db, current_user.id)


@router.delete("/recent", status_code=204)
def clear_recent(current_user: CurrentUser, db: DbSession):
    clear_recent_searches(db, current_user.id)


@router.delete("/recent/{search_id}", status_code=204)
def remove_recent(search_id: int, current_user: CurrentUser, db: DbSession):
    delete_recent_search(db, current_user.id, search_id)
