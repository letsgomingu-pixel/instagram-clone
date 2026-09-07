import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.dependencies import CurrentUser, DbSession
from app.models import StoryItem, StoryLike
from app.schemas.story import StoryLikeResponse, StoryOut, StoryOverlayOut, StoryViewerOut, StoryViewResponse
from app.services.conversations import send_story_reply
from app.services.stories_reels import create_story, get_stories_feed, get_story_viewers, mark_story_viewed
from app.utils.media import save_story_media

router = APIRouter(prefix="/stories", tags=["stories"])


class StoryReplyCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


@router.get("/feed", response_model=list[StoryOut])
def stories_feed(current_user: CurrentUser, db: DbSession):
    return get_stories_feed(db, current_user)


@router.post("", response_model=StoryOut, status_code=201)
async def post_story(
    current_user: CurrentUser,
    db: DbSession,
    media: UploadFile = File(...),
    overlays: str | None = Form(None),
):
    media_url, media_type = save_story_media(media)

    overlay_list: list[dict] | None = None
    if overlays:
        try:
            parsed = json.loads(overlays)
            if not isinstance(parsed, list):
                raise HTTPException(status_code=400, detail="Overlays must be a JSON array")
            overlay_list = [StoryOverlayOut.model_validate(item).model_dump() for item in parsed]
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Invalid overlays JSON") from exc

    return create_story(db, current_user, media_url, media_type, overlay_list)


@router.post("/{story_id}/view", response_model=StoryViewResponse)
def view_story(story_id: int, current_user: CurrentUser, db: DbSession):
    mark_story_viewed(db, current_user, story_id)
    return StoryViewResponse(viewed=True)


@router.get("/{story_id}/viewers", response_model=list[StoryViewerOut])
def story_viewers(story_id: int, current_user: CurrentUser, db: DbSession):
    return get_story_viewers(db, story_id, current_user)


@router.post("/items/{story_item_id}/like", response_model=StoryLikeResponse)
def like_story_item(story_item_id: int, current_user: CurrentUser, db: DbSession):
    item = db.get(StoryItem, story_item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Story item not found")
    existing = db.scalar(
        select(StoryLike).where(
            StoryLike.story_item_id == story_item_id, StoryLike.user_id == current_user.id
        )
    )
    if existing:
        db.delete(existing)
        is_liked = False
    else:
        db.add(StoryLike(story_item_id=story_item_id, user_id=current_user.id))
        is_liked = True
    db.commit()
    count = db.scalar(
        select(func.count()).select_from(StoryLike).where(StoryLike.story_item_id == story_item_id)
    ) or 0
    return StoryLikeResponse(is_liked=is_liked, like_count=count)


@router.post("/items/{story_item_id}/reply", status_code=201)
def reply_to_story(story_item_id: int, body: StoryReplyCreate, current_user: CurrentUser, db: DbSession):
    return send_story_reply(db, current_user, story_item_id, body.content)
