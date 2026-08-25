from datetime import datetime, timedelta, timezone
import json

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Follow, Reel, ReelLike, Story, StoryItem, StoryView, User
from app.schemas.reel import ReelOut
from app.schemas.story import StoryItemOut, StoryOut, StoryOverlayOut
from app.services.users import build_user_out, get_following_ids
from app.utils.datetime_fmt import to_iso

STORY_TTL_HOURS = 24


def _parse_overlays(raw: str | None) -> list[StoryOverlayOut]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if not isinstance(data, list):
            return []
        return [StoryOverlayOut.model_validate(item) for item in data]
    except (json.JSONDecodeError, ValueError):
        return []


def _serialize_overlays(overlays: list[dict] | None) -> str | None:
    if not overlays:
        return None
    validated = [StoryOverlayOut.model_validate(item).model_dump() for item in overlays]
    return json.dumps(validated)


def _story_item_out(item: StoryItem) -> StoryItemOut:
    media_type = item.media_type if item.media_type in ("image", "video") else "image"
    return StoryItemOut(
        id=item.id,
        image_url=item.image_url,
        media_type=media_type,  # type: ignore[arg-type]
        overlays=_parse_overlays(item.overlays),
        created_at=to_iso(item.created_at),
    )


def _liked_reel_ids(db: Session, user_id: int, reel_ids: list[int]) -> set[int]:
    if not reel_ids:
        return set()
    rows = db.scalars(
        select(ReelLike.reel_id).where(ReelLike.user_id == user_id, ReelLike.reel_id.in_(reel_ids))
    ).all()
    return set(rows)


def build_reel_out(db: Session, reel: Reel, viewer: User | None, liked: set[int] | None = None) -> ReelOut:
    if liked is None and viewer:
        liked = _liked_reel_ids(db, viewer.id, [reel.id])
    elif liked is None:
        liked = set()
    return ReelOut(
        id=reel.id,
        user=build_user_out(db, reel.user, viewer),
        thumbnail_url=reel.thumbnail_url,
        video_url=reel.video_url,
        caption=reel.caption,
        audio_name=reel.audio_name,
        like_count=reel.like_count,
        comment_count=reel.comment_count,
        view_count=reel.view_count,
        is_liked=reel.id in liked,
        created_at=to_iso(reel.created_at),
    )


def build_reels_out(db: Session, reels: list[Reel], viewer: User | None) -> list[ReelOut]:
    reel_ids = [r.id for r in reels]
    liked = _liked_reel_ids(db, viewer.id, reel_ids) if viewer else set()
    return [build_reel_out(db, r, viewer, liked) for r in reels]


def get_reels_feed(db: Session, viewer: User | None, offset: int, limit: int) -> tuple[list[Reel], int]:
    total = db.scalar(select(func.count()).select_from(Reel)) or 0
    reels = db.scalars(
        select(Reel)
        .options(joinedload(Reel.user))
        .order_by(desc(Reel.created_at))
        .offset(offset)
        .limit(limit)
    ).all()
    return list(reels), total


def get_user_reels(db: Session, user_id: int, offset: int, limit: int) -> tuple[list[Reel], int]:
    total = db.scalar(select(func.count()).select_from(Reel).where(Reel.user_id == user_id)) or 0
    reels = db.scalars(
        select(Reel)
        .where(Reel.user_id == user_id)
        .options(joinedload(Reel.user))
        .order_by(desc(Reel.created_at))
        .offset(offset)
        .limit(limit)
    ).all()
    return list(reels), total


def build_story_out(db: Session, story: Story, viewer: User, viewed_ids: set[int] | None = None) -> StoryOut:
    if viewed_ids is None:
        viewed_ids = set(
            db.scalars(
                select(StoryView.story_id).where(
                    StoryView.user_id == viewer.id,
                    StoryView.story_id == story.id,
                )
            ).all()
        )
    user = db.get(User, story.user_id)
    if not user:
        from fastapi import HTTPException

        raise HTTPException(status_code=500, detail="Story owner missing")
    items = sorted(story.items, key=lambda i: i.created_at)
    return StoryOut(
        id=story.id,
        user=build_user_out(db, user, viewer),
        items=[_story_item_out(i) for i in items],
        viewed=story.id in viewed_ids,
    )


def get_stories_feed(db: Session, viewer: User) -> list[StoryOut]:
    now = datetime.now(timezone.utc)
    following_ids = get_following_ids(db, viewer.id)
    following_ids.add(viewer.id)

    stories = db.scalars(
        select(Story)
        .where(Story.user_id.in_(following_ids), Story.expires_at > now)
        .options(joinedload(Story.items))
        .order_by(Story.created_at.desc())
    ).unique().all()

    viewed_ids = set(
        db.scalars(
            select(StoryView.story_id).where(
                StoryView.user_id == viewer.id,
                StoryView.story_id.in_([s.id for s in stories]),
            )
        ).all()
    )

    result: list[StoryOut] = []
    for story in stories:
        result.append(build_story_out(db, story, viewer, viewed_ids))
    return result


def create_story(
    db: Session,
    user: User,
    media_url: str,
    media_type: str = "image",
    overlays: list[dict] | None = None,
) -> StoryOut:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=STORY_TTL_HOURS)

    story = db.scalar(
        select(Story)
        .where(Story.user_id == user.id, Story.expires_at > now)
        .options(joinedload(Story.items))
    )

    if story is None:
        story = Story(user_id=user.id, expires_at=expires_at, created_at=now)
        db.add(story)
        db.flush()
    else:
        story.expires_at = expires_at

    db.add(
        StoryItem(
            story_id=story.id,
            image_url=media_url,
            media_type=media_type,
            overlays=_serialize_overlays(overlays),
            created_at=now,
        )
    )
    db.commit()
    db.refresh(story)
    story = db.scalar(
        select(Story).where(Story.id == story.id).options(joinedload(Story.items))
    )
    return build_story_out(db, story, user)  # type: ignore[arg-type]


def mark_story_viewed(db: Session, viewer: User, story_id: int) -> bool:
    story = db.get(Story, story_id)
    if not story:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Story not found")
    existing = db.scalar(
        select(StoryView.id).where(StoryView.user_id == viewer.id, StoryView.story_id == story_id)
    )
    if existing is None:
        db.add(StoryView(user_id=viewer.id, story_id=story_id))
        db.commit()
    return True


def create_reel(
    db: Session,
    user: User,
    *,
    video_url: str,
    thumbnail_url: str,
    caption: str | None = None,
    audio_name: str | None = None,
) -> ReelOut:
    reel = Reel(
        user_id=user.id,
        video_url=video_url,
        thumbnail_url=thumbnail_url,
        caption=caption,
        audio_name=audio_name or f"Original audio · {user.username}",
    )
    db.add(reel)
    db.commit()
    db.refresh(reel)
    reel = db.scalar(select(Reel).where(Reel.id == reel.id).options(joinedload(Reel.user)))
    return build_reel_out(db, reel, user)  # type: ignore[arg-type]
