from fastapi import APIRouter, Query

from app.dependencies import CurrentUser, DbSession
from app.schemas.search import HashtagSearchOut, RecentSearchOut
from app.schemas.user import UserOut
from app.services.search import (
    clear_recent_searches,
    delete_recent_search,
    list_recent_searches,
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
    from app.services.search import record_search

    record_search(db, current_user.id, q, "hashtag")
    return search_hashtags(db, q)


@router.get("/recent", response_model=list[RecentSearchOut])
def recent_searches(current_user: CurrentUser, db: DbSession):
    return list_recent_searches(db, current_user.id)


@router.delete("/recent", status_code=204)
def clear_recent(current_user: CurrentUser, db: DbSession):
    clear_recent_searches(db, current_user.id)


@router.delete("/recent/{search_id}", status_code=204)
def remove_recent(search_id: int, current_user: CurrentUser, db: DbSession):
    delete_recent_search(db, current_user.id, search_id)
