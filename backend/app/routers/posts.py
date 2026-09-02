import json

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import desc, func, select
from sqlalchemy.orm import joinedload

from app.dependencies import CurrentUser, DbSession, OptionalUser
from app.models import Comment, Like, Post, PostMedia, PostTag, SavedPost, User
from app.schemas.post import CommentCreate, CommentOut, LikeToggleResponse, PostOut, SaveToggleResponse
from app.services.notifications import create_post_activity_notifications
from app.services.posts import (
    build_post_out,
    build_posts_out,
    delete_post_comment,
    get_home_feed_posts,
    get_post_or_404,
    list_post_comments,
    list_post_likes,
)
from app.services.users import build_user_out
from app.utils.media import save_post_media
from app.utils.pagination import PaginatedResponse, paginate, pagination_params
from app.utils.datetime_fmt import to_iso

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("/feed", response_model=PaginatedResponse)
def feed(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=30),
):
    page, limit, _ = pagination_params(page, limit)
    posts, total = get_home_feed_posts(db, current_user, page, limit)
    items = build_posts_out(db, posts, current_user)
    next_page = page + 1 if page * limit < total else None
    return PaginatedResponse(items=items, total=total, page=page, limit=limit, next_page=next_page)


@router.get("/explore", response_model=PaginatedResponse)
def explore(
    db: DbSession,
    viewer: OptionalUser = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=30),
):
    page, limit, offset = pagination_params(page, limit)
    total = db.scalar(select(func.count()).select_from(Post)) or 0
    posts = db.scalars(
        select(Post).options(joinedload(Post.user)).order_by(desc(Post.created_at)).offset(offset).limit(limit)
    ).all()
    items = build_posts_out(db, list(posts), viewer)
    return paginate(items, total, page, limit)


@router.get("/saved", response_model=PaginatedResponse)
def saved_posts(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=30),
):
    page, limit, offset = pagination_params(page, limit)
    base = select(Post).join(SavedPost, SavedPost.post_id == Post.id).where(SavedPost.user_id == current_user.id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    posts = db.scalars(
        base.options(joinedload(Post.user)).order_by(desc(SavedPost.created_at)).offset(offset).limit(limit)
    ).all()
    items = build_posts_out(db, list(posts), current_user)
    return paginate(items, total, page, limit)


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, db: DbSession, viewer: OptionalUser = None):
    post = get_post_or_404(db, post_id)
    return build_post_out(db, post, viewer)


@router.post("", response_model=PostOut, status_code=201)
async def create_post(
    current_user: CurrentUser,
    db: DbSession,
    image: UploadFile | None = File(None),
    files: list[UploadFile] = File(default=[]),
    caption: str | None = Form(None),
    location: str | None = Form(None),
    tagged_usernames: str | None = Form(None),
):
    uploads: list[UploadFile] = []
    if image:
        uploads.append(image)
    uploads.extend(files)
    if not uploads:
        raise HTTPException(status_code=400, detail="At least one media file is required")
    if len(uploads) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 media items allowed")

    saved_media: list[tuple[str, str]] = []
    for upload in uploads:
        saved_media.append(save_post_media(upload, "posts"))

    cover_url = saved_media[0][0]
    post = Post(
        user_id=current_user.id,
        image_url=cover_url,
        caption=caption,
        location=location,
        like_count=0,
        comment_count=0,
    )
    db.add(post)
    db.flush()

    for position, (media_url, media_type) in enumerate(saved_media):
        db.add(
            PostMedia(
                post_id=post.id,
                media_url=media_url,
                media_type=media_type,
                position=position,
            )
        )

    if tagged_usernames:
        try:
            names = json.loads(tagged_usernames)
        except json.JSONDecodeError:
            names = [n.strip() for n in tagged_usernames.split(",") if n.strip()]
        for name in names:
            tagged = db.scalar(select(User).where(User.username == name))
            if tagged and tagged.id != current_user.id:
                db.add(PostTag(post_id=post.id, user_id=tagged.id))

    db.commit()
    db.refresh(post)
    post.user = current_user
    return build_post_out(db, post, current_user)


@router.post("/{post_id}/like", response_model=LikeToggleResponse)
def toggle_like(post_id: int, current_user: CurrentUser, db: DbSession):
    post = get_post_or_404(db, post_id)
    existing = db.scalar(
        select(Like).where(Like.user_id == current_user.id, Like.post_id == post_id)
    )
    if existing:
        db.delete(existing)
        post.like_count = max(0, post.like_count - 1)
        is_liked = False
    else:
        db.add(Like(user_id=current_user.id, post_id=post_id))
        post.like_count += 1
        is_liked = True
        create_post_activity_notifications(db, actor=current_user, post=post, ntype="like")
    db.commit()
    db.refresh(post)
    return LikeToggleResponse(is_liked=is_liked, like_count=post.like_count)


@router.post("/{post_id}/save", response_model=SaveToggleResponse)
def toggle_save(post_id: int, current_user: CurrentUser, db: DbSession):
    get_post_or_404(db, post_id)
    existing = db.scalar(
        select(SavedPost).where(SavedPost.user_id == current_user.id, SavedPost.post_id == post_id)
    )
    if existing:
        db.delete(existing)
        is_saved = False
    else:
        db.add(SavedPost(user_id=current_user.id, post_id=post_id))
        is_saved = True
    db.commit()
    return SaveToggleResponse(is_saved=is_saved)


@router.get("/{post_id}/likes", response_model=PaginatedResponse)
def get_post_likes(
    post_id: int,
    db: DbSession,
    viewer: OptionalUser = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    page, limit, _ = pagination_params(page, limit)
    items, total = list_post_likes(db, post_id, viewer, page, limit)
    return paginate(items, total, page, limit)


@router.get("/{post_id}/comments", response_model=PaginatedResponse)
def get_post_comments(
    post_id: int,
    db: DbSession,
    viewer: OptionalUser = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    page, limit, _ = pagination_params(page, limit)
    items, total = list_post_comments(db, post_id, viewer, page, limit)
    return paginate(items, total, page, limit)


@router.delete("/{post_id}/comments/{comment_id}", status_code=204)
def remove_comment(post_id: int, comment_id: int, current_user: CurrentUser, db: DbSession):
    delete_post_comment(db, post_id, comment_id, current_user)


@router.post("/{post_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(post_id: int, body: CommentCreate, current_user: CurrentUser, db: DbSession):
    post = get_post_or_404(db, post_id)
    comment = Comment(post_id=post_id, user_id=current_user.id, content=body.content)
    post.comment_count += 1
    db.add(comment)
    create_post_activity_notifications(
        db, actor=current_user, post=post, ntype="comment", comment_preview=body.content[:200]
    )
    db.commit()
    db.refresh(comment)
    return CommentOut(
        id=comment.id,
        user=build_user_out(db, current_user, current_user),
        content=comment.content,
        created_at=to_iso(comment.created_at),
    )
