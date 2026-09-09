import json

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import case, desc, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app.dependencies import CurrentUser, DbSession, OptionalUser
from app.models import Comment, Like, Post, PostMedia, PostTag, SavedPost, User
from app.schemas.post import (
    CommentCreate,
    CommentLikeResponse,
    CommentOut,
    LikeToggleResponse,
    PostOut,
    PostReportCreate,
    PostUpdate,
    SaveToggleResponse,
)
from app.services.notifications import create_post_activity_notifications, create_mention_notifications, create_reply_notification, create_tag_notifications
from app.services.posts import (
    build_post_out,
    build_posts_out,
    create_review_post,
    delete_post_comment,
    delete_post_by_owner,
    get_explore_posts,
    get_home_feed_posts,
    get_post_or_404,
    hide_post_for_user,
    list_archived_posts,
    list_post_comments,
    list_post_likes,
    report_post,
    set_post_archived,
    toggle_comment_like,
    update_post_by_owner,
)
from app.services.hashtags import attach_hashtags_to_post
from app.services.users import build_user_out
from app.utils.hashtags import extract_hashtags
from app.utils.media import save_post_media
from app.utils.pagination import PaginatedResponse, paginate, pagination_params
from app.utils.datetime_fmt import to_iso

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("/archived", response_model=PaginatedResponse)
def archived_posts(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=30),
):
    page, limit, offset = pagination_params(page, limit)
    posts, total = list_archived_posts(db, current_user, offset, limit)
    items = build_posts_out(db, posts, current_user)
    return paginate(items, total, page, limit)


@router.get("/feed", response_model=PaginatedResponse)
def feed(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=30),
    cursor: str | None = Query(None),
    tab: str = Query("products", pattern="^(products|reviews)$"),
):
    page, limit, _ = pagination_params(page, limit)
    posts, total, next_cursor = get_home_feed_posts(
        db, current_user, page, limit, cursor=cursor, tab=tab
    )
    items = build_posts_out(db, posts, current_user)
    next_page = page + 1 if page * limit < total and not cursor else None
    if cursor and len(posts) == limit:
        next_page = None
    return PaginatedResponse(
        items=items, total=total, page=page, limit=limit, next_page=next_page, next_cursor=next_cursor
    )


@router.get("/explore", response_model=PaginatedResponse)
def explore(
    db: DbSession,
    viewer: OptionalUser = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=30),
    tab: str = Query("products", pattern="^(products|reviews)$"),
):
    page, limit, offset = pagination_params(page, limit)
    posts, total = get_explore_posts(db, viewer, offset, limit, tab=tab)
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
    # A post saved from an account that has since deactivated should drop out
    # of "저장됨" too, the same way it disappears from the feed/explore/profile.
    base = (
        select(Post)
        .join(SavedPost, SavedPost.post_id == Post.id)
        .join(User, Post.user_id == User.id)
        .where(SavedPost.user_id == current_user.id, User.is_active.is_(True))
    )
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


@router.delete("/{post_id}", status_code=204)
def remove_post(post_id: int, current_user: CurrentUser, db: DbSession):
    delete_post_by_owner(db, post_id, current_user)


@router.patch("/{post_id}", response_model=PostOut)
def edit_post(post_id: int, body: PostUpdate, current_user: CurrentUser, db: DbSession):
    post = update_post_by_owner(
        db, post_id, current_user, caption=body.caption, location=body.location
    )
    return build_post_out(db, post, current_user)


@router.post("/{post_id}/archive", response_model=PostOut)
def archive_post(post_id: int, current_user: CurrentUser, db: DbSession):
    post = set_post_archived(db, post_id, current_user, archived=True)
    return build_post_out(db, post, current_user)


@router.delete("/{post_id}/archive", response_model=PostOut)
def unarchive_post(post_id: int, current_user: CurrentUser, db: DbSession):
    post = set_post_archived(db, post_id, current_user, archived=False)
    return build_post_out(db, post, current_user)


@router.post("/{post_id}/hide", status_code=204)
def hide_post(post_id: int, current_user: CurrentUser, db: DbSession):
    hide_post_for_user(db, post_id, current_user)


@router.post("/{post_id}/report", status_code=204)
def report_post_route(post_id: int, body: PostReportCreate, current_user: CurrentUser, db: DbSession):
    report_post(db, post_id, current_user, reason=body.reason, details=body.details)


@router.post("/reviews", response_model=PostOut, status_code=201)
async def create_review(
    current_user: CurrentUser,
    db: DbSession,
    order_id: int = Form(...),
    rating: int = Form(..., ge=1, le=5),
    caption: str | None = Form(None),
    image: UploadFile | None = File(None),
    files: list[UploadFile] = File(default=[]),
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

    post = create_review_post(
        db,
        current_user,
        order_id=order_id,
        rating=rating,
        caption=caption,
        saved_media=saved_media,
    )
    return build_post_out(db, post, current_user)


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
        post_type="standard",
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

    tagged_ids: list[int] = []
    if tagged_usernames:
        try:
            names = json.loads(tagged_usernames)
        except json.JSONDecodeError:
            names = [n.strip() for n in tagged_usernames.split(",") if n.strip()]
        for name in names:
            tagged = db.scalar(select(User).where(User.username == name))
            if tagged and tagged.id != current_user.id:
                db.add(PostTag(post_id=post.id, user_id=tagged.id))
                tagged_ids.append(tagged.id)

    db.commit()
    db.refresh(post)
    post.user = current_user

    tag_names = extract_hashtags(caption)
    if tag_names:
        attach_hashtags_to_post(db, post, tag_names)

    if tagged_ids:
        create_tag_notifications(db, actor=current_user, post=post, tagged_user_ids=tagged_ids)
        db.commit()
    if caption:
        create_mention_notifications(db, actor=current_user, text=caption, post_id=post.id)
        db.commit()

    return build_post_out(db, post, current_user)


@router.post("/{post_id}/like", response_model=LikeToggleResponse)
def toggle_like(post_id: int, current_user: CurrentUser, db: DbSession):
    post = get_post_or_404(db, post_id)
    existing = db.scalar(
        select(Like).where(Like.user_id == current_user.id, Like.post_id == post_id)
    )
    if existing:
        db.delete(existing)
        # Atomic, DB-evaluated decrement (never below 0) instead of a Python
        # read-modify-write — the latter loses updates when two requests for
        # the same post commit concurrently (classic lost-update race).
        db.execute(
            update(Post)
            .where(Post.id == post_id)
            .values(like_count=case((Post.like_count > 0, Post.like_count - 1), else_=0))
        )
        is_liked = False
        db.commit()
    else:
        db.add(Like(user_id=current_user.id, post_id=post_id))
        try:
            db.flush()
        except IntegrityError:
            # Another concurrent request already liked it (UNIQUE constraint) —
            # treat this as idempotent success rather than a 500.
            db.rollback()
            db.refresh(post)
            return LikeToggleResponse(is_liked=True, like_count=post.like_count)
        db.execute(update(Post).where(Post.id == post_id).values(like_count=Post.like_count + 1))
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
        db.commit()
        is_saved = False
    else:
        db.add(SavedPost(user_id=current_user.id, post_id=post_id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            is_saved = True
            return SaveToggleResponse(is_saved=is_saved)
        is_saved = True
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


@router.post("/{post_id}/comments/{comment_id}/like", response_model=CommentLikeResponse)
def like_comment(post_id: int, comment_id: int, current_user: CurrentUser, db: DbSession):
    is_liked, like_count = toggle_comment_like(db, post_id, comment_id, current_user)
    return CommentLikeResponse(is_liked=is_liked, like_count=like_count)


@router.post("/{post_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(post_id: int, body: CommentCreate, current_user: CurrentUser, db: DbSession):
    post = get_post_or_404(db, post_id)
    parent = None
    if body.parent_id:
        parent = db.scalar(
            select(Comment).where(Comment.id == body.parent_id, Comment.post_id == post_id)
        )
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        content=body.content,
        parent_id=body.parent_id,
    )
    db.add(comment)
    db.execute(update(Post).where(Post.id == post_id).values(comment_count=Post.comment_count + 1))
    if parent:
        create_reply_notification(
            db, actor=current_user, parent_comment=parent, post=post, preview=body.content
        )
    else:
        create_post_activity_notifications(
            db, actor=current_user, post=post, ntype="comment", comment_preview=body.content[:200]
        )
    create_mention_notifications(
        db, actor=current_user, text=body.content, post_id=post.id, comment_preview=body.content[:200]
    )
    db.commit()
    db.refresh(comment)
    return CommentOut(
        id=comment.id,
        user=build_user_out(db, current_user, current_user),
        content=comment.content,
        created_at=to_iso(comment.created_at),
        parent_id=comment.parent_id,
        like_count=0,
        is_liked=False,
        replies=[],
    )
