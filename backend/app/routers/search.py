from fastapi import APIRouter, Query

from app.dependencies import CurrentUser, DbSession
from app.schemas.user import UserOut
from app.services.users import search_users

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/users", response_model=list[UserOut])
def search_users_endpoint(
    current_user: CurrentUser,
    db: DbSession,
    q: str = Query(min_length=1),
):
    return search_users(db, q, current_user)
