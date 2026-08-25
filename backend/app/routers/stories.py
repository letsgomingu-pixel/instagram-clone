import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.dependencies import CurrentUser, DbSession
from app.schemas.story import StoryOut, StoryOverlayOut, StoryViewResponse
from app.services.stories_reels import create_story, get_stories_feed, mark_story_viewed
from app.utils.media import save_story_media

router = APIRouter(prefix="/stories", tags=["stories"])


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
