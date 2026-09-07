from fastapi import APIRouter, Query

from app.dependencies import DbSession, OptionalUser
from app.schemas.hashtag import HashtagPageOut
from app.services.hashtags import get_hashtag_page
from app.utils.pagination import pagination_params

router = APIRouter(prefix="/hashtags", tags=["hashtags"])


@router.get("/{tag}", response_model=HashtagPageOut)
def hashtag_page(
    tag: str,
    db: DbSession,
    viewer: OptionalUser = None,
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=50),
):
    page, limit, _ = pagination_params(page, limit)
    return get_hashtag_page(db, tag, viewer, page, limit)
