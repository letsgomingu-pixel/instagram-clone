from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import case, desc, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app.dependencies import CurrentUser, DbSession, OptionalUser
from app.models import Reel, ReelComment, ReelLike, ReelView
from app.schemas.reel import ReelCommentOut, ReelLikeResponse, ReelOut, ReelViewResponse
from app.services.stories_reels import build_reels_out, create_reel, get_reels_feed
from app.services.users import build_user_out
from app.utils.datetime_fmt import to_iso
from app.utils.media import save_image, save_reel_placeholder_thumbnail, save_video
from app.utils.pagination import PaginatedResponse, paginate, pagination_params

from fastapi import File, Form, UploadFile

router = APIRouter(prefix="/reels", tags=["reels"])


class ReelCommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2200)


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
def view_reel(
    reel_id: int,
    db: DbSession,
    viewer: OptionalUser = None,
    session_key: str | None = Query(None),
):
    reel = db.get(Reel, reel_id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")

    if viewer:
        existing = db.scalar(
            select(ReelView).where(ReelView.reel_id == reel_id, ReelView.user_id == viewer.id)
        )
        if not existing:
            try:
                db.add(ReelView(reel_id=reel_id, user_id=viewer.id))
                reel.view_count += 1
                db.commit()
            except IntegrityError:
                db.rollback()
    elif session_key:
        existing = db.scalar(
            select(ReelView).where(ReelView.reel_id == reel_id, ReelView.session_key == session_key)
        )
        if not existing:
            try:
                db.add(ReelView(reel_id=reel_id, session_key=session_key))
                reel.view_count += 1
                db.commit()
            except IntegrityError:
                db.rollback()
    else:
        reel.view_count += 1
        db.commit()

    db.refresh(reel)
    return ReelViewResponse(view_count=reel.view_count)


@router.get("/{reel_id}/comments", response_model=PaginatedResponse)
def reel_comments(
    reel_id: int,
    db: DbSession,
    viewer: OptionalUser = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    reel = db.get(Reel, reel_id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    page, limit, offset = pagination_params(page, limit)
    base = (
        select(ReelComment)
        .where(ReelComment.reel_id == reel_id)
        .options(joinedload(ReelComment.user))
        .order_by(ReelComment.created_at)
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    comments = db.scalars(base.offset(offset).limit(limit)).all()
    items = [
        ReelCommentOut(
            id=c.id,
            user=build_user_out(db, c.user, viewer),
            content=c.content,
            created_at=to_iso(c.created_at),
        )
        for c in comments
    ]
    return paginate(items, total, page, limit)


@router.post("/{reel_id}/comments", response_model=ReelCommentOut, status_code=201)
def add_reel_comment(reel_id: int, body: ReelCommentCreate, current_user: CurrentUser, db: DbSession):
    reel = db.get(Reel, reel_id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    comment = ReelComment(reel_id=reel_id, user_id=current_user.id, content=body.content)
    db.add(comment)
    db.execute(update(Reel).where(Reel.id == reel_id).values(comment_count=Reel.comment_count + 1))
    db.commit()
    db.refresh(comment)
    return ReelCommentOut(
        id=comment.id,
        user=build_user_out(db, current_user, current_user),
        content=comment.content,
        created_at=to_iso(comment.created_at),
    )


@router.delete("/{reel_id}", status_code=204)
def delete_reel(reel_id: int, current_user: CurrentUser, db: DbSession):
    reel = db.get(Reel, reel_id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    if reel.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this reel")
    db.delete(reel)
    db.commit()
