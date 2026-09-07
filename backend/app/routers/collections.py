from fastapi import APIRouter, Query

from app.dependencies import CurrentUser, DbSession
from app.schemas.collection import CollectionCreate, CollectionOut
from app.schemas.post import PostOut
from app.services.collections import (
    add_post_to_collection,
    create_collection,
    list_collection_posts,
    list_collections,
    remove_post_from_collection,
)
from app.utils.pagination import PaginatedResponse, paginate, pagination_params

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=list[CollectionOut])
def get_collections(current_user: CurrentUser, db: DbSession):
    return list_collections(db, current_user)


@router.post("", response_model=CollectionOut, status_code=201)
def post_collection(body: CollectionCreate, current_user: CurrentUser, db: DbSession):
    return create_collection(db, current_user, body.name)


@router.get("/{collection_id}/posts", response_model=PaginatedResponse)
def collection_posts(
    collection_id: int,
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=30),
):
    page, limit, _ = pagination_params(page, limit)
    items, total = list_collection_posts(db, current_user, collection_id, page, limit)
    return paginate(items, total, page, limit)


@router.post("/{collection_id}/posts/{post_id}", status_code=204)
def add_to_collection(collection_id: int, post_id: int, current_user: CurrentUser, db: DbSession):
    add_post_to_collection(db, current_user, collection_id, post_id)


@router.delete("/{collection_id}/posts/{post_id}", status_code=204)
def remove_from_collection(collection_id: int, post_id: int, current_user: CurrentUser, db: DbSession):
    remove_post_from_collection(db, current_user, collection_id, post_id)
