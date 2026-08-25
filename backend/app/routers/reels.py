from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from sqlalchemy import select



from app.dependencies import CurrentUser, DbSession, OptionalUser

from app.models import Reel, ReelLike

from app.schemas.reel import ReelLikeResponse, ReelOut, ReelViewResponse

from app.services.stories_reels import build_reels_out, create_reel, get_reels_feed

from app.utils.media import save_image, save_reel_placeholder_thumbnail, save_video

from app.utils.pagination import PaginatedResponse, paginate, pagination_params



router = APIRouter(prefix="/reels", tags=["reels"])





@router.get("/feed", response_model=PaginatedResponse)

def reels_feed(

    db: DbSession,

    viewer: OptionalUser = None,

    page: int = Query(1, ge=1),

    limit: int = Query(10, ge=1, le=30),

):

    page, limit, offset = pagination_params(page, limit)

    reels, total = get_reels_feed(db, viewer, offset, limit)

    items = build_reels_out(db, reels, viewer)

    return paginate(items, total, page, limit)





@router.post("", response_model=ReelOut, status_code=201)

async def post_reel(

    current_user: CurrentUser,

    db: DbSession,

    video: UploadFile = File(...),

    thumbnail: UploadFile | None = File(None),

    caption: str | None = Form(None),

    audio_name: str | None = Form(None),

):

    video_url = save_video(video, "reels")

    if thumbnail is not None:

        thumbnail_url = save_image(thumbnail, "reels")

    else:

        thumbnail_url = save_reel_placeholder_thumbnail("reels")



    return create_reel(

        db,

        current_user,

        video_url=video_url,

        thumbnail_url=thumbnail_url,

        caption=caption,

        audio_name=audio_name,

    )





@router.post("/{reel_id}/like", response_model=ReelLikeResponse)

def toggle_reel_like(reel_id: int, current_user: CurrentUser, db: DbSession):

    reel = db.get(Reel, reel_id)

    if not reel:

        raise HTTPException(status_code=404, detail="Reel not found")

    existing = db.scalar(

        select(ReelLike).where(ReelLike.user_id == current_user.id, ReelLike.reel_id == reel_id)

    )

    if existing:

        db.delete(existing)

        reel.like_count = max(0, reel.like_count - 1)

        is_liked = False

    else:

        db.add(ReelLike(user_id=current_user.id, reel_id=reel_id))

        reel.like_count += 1

        is_liked = True

    db.commit()

    db.refresh(reel)

    return ReelLikeResponse(is_liked=is_liked, like_count=reel.like_count)





@router.post("/{reel_id}/view", response_model=ReelViewResponse)

def view_reel(reel_id: int, db: DbSession, viewer: OptionalUser = None):

    reel = db.get(Reel, reel_id)

    if not reel:

        raise HTTPException(status_code=404, detail="Reel not found")

    reel.view_count += 1

    db.commit()

    db.refresh(reel)

    return ReelViewResponse(view_count=reel.view_count)


