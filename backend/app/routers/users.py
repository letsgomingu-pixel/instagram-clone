from fastapi import APIRouter, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app.dependencies import CurrentSessionId, CurrentUser, DbSession, OptionalUser
from app.models import Follow, Post, PostTag, User
from app.schemas.user import (
    AccountDeactivateRequest,
    FollowResponse,
    SuggestedUserOut,
    UserOut,
    UserUpdate,
    UsernameCheck,
)
from app.schemas.security import (
    LoginEmailAlertsUpdate,
    LoginSessionOut,
    LoginSessionTrustUpdate,
    SecuritySummaryOut,
    TwoFactorDisableRequest,
    TwoFactorEnableRequest,
    TwoFactorSetupOut,
)
from app.schemas.settings import PasswordChangeRequest, UserSettingsOut, UserSettingsUpdate
from app.services.blocks import block_user, is_blocked, unblock_user
from app.services.notifications import create_follow_notification
from app.services.follow_requests import (
    accept_follow_request,
    accept_follow_request_by_requester,
    cancel_follow_request,
    list_follow_requests,
    reject_follow_request,
    reject_follow_request_by_requester,
    request_follow,
    target_requires_follow_request,
)
from app.services.posts import build_posts_out
from app.services.security import (
    delete_login_session,
    disable_two_factor,
    enable_two_factor,
    get_security_summary,
    list_login_sessions,
    setup_two_factor,
    update_login_email_alerts,
    update_login_session_trust,
)
from app.services.settings import get_settings, update_settings
from app.services.stories_reels import build_reels_out, get_user_reels
from app.services.users import (
    build_user_out,
    can_view_user_content,
    get_followers,
    get_following,
    get_suggested_users,
    get_user_by_username,
)
from app.utils.media import save_image
from app.utils.pagination import PaginatedResponse, paginate, pagination_params
from app.utils.security import hash_password, verify_password

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/check-username", response_model=UsernameCheck)
def check_username(db: DbSession, username: str = Query(min_length=3, max_length=30)):
    taken = (
        db.scalar(select(User.id).where(func.lower(User.username) == username.strip().lower()))
        is not None
    )
    return UsernameCheck(available=not taken)


@router.get(
    "/suggested",
    response_model=list[SuggestedUserOut],
    dependencies=[],
)
def suggested(db: DbSession, viewer: OptionalUser = None, limit: int = Query(10, ge=1, le=20)):
    return get_suggested_users(db, viewer, limit=limit)


@router.put("/me", response_model=UserOut)
def update_me(body: UserUpdate, current_user: CurrentUser, db: DbSession):
    if body.username is not None:
        new_username = body.username.strip().lower()
        if new_username != current_user.username.lower():
            taken = db.scalar(
                select(User.id).where(
                    func.lower(User.username) == new_username,
                    User.id != current_user.id,
                )
            )
            if taken:
                raise HTTPException(status_code=400, detail="Username is already taken")
            current_user.username = body.username.strip()
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.bio is not None:
        current_user.bio = body.bio
    if body.website is not None:
        current_user.website = body.website or None
    db.commit()
    db.refresh(current_user)
    return build_user_out(db, current_user, current_user)


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(current_user: CurrentUser, db: DbSession, avatar: UploadFile = File(...)):
    current_user.avatar_url = save_image(avatar, "avatars")
    db.commit()
    db.refresh(current_user)
    return build_user_out(db, current_user, current_user)


@router.get("/me/settings", response_model=UserSettingsOut)
def read_my_settings(current_user: CurrentUser, db: DbSession):
    return get_settings(db, current_user)


@router.put("/me/settings", response_model=UserSettingsOut)
def update_my_settings(body: UserSettingsUpdate, current_user: CurrentUser, db: DbSession):
    return update_settings(db, current_user, body)


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def change_password(body: PasswordChangeRequest, current_user: CurrentUser, db: DbSession):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/me/deactivate", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def deactivate_my_account(body: AccountDeactivateRequest, current_user: CurrentUser, db: DbSession):
    if current_user.is_admin:
        raise HTTPException(status_code=400, detail="Admin accounts cannot self-deactivate")
    if not verify_password(body.password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    current_user.is_active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me/security", response_model=SecuritySummaryOut)
def read_my_security(current_user: CurrentUser, db: DbSession):
    return get_security_summary(db, current_user)


@router.get("/me/login-sessions", response_model=list[LoginSessionOut])
def read_my_login_sessions(
    current_user: CurrentUser,
    current_session_id: CurrentSessionId,
    db: DbSession,
):
    return list_login_sessions(db, current_user, current_session_id=current_session_id)


@router.delete("/me/login-sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def revoke_login_session(
    session_id: int,
    current_user: CurrentUser,
    current_session_id: CurrentSessionId,
    db: DbSession,
):
    delete_login_session(
        db,
        current_user,
        session_id,
        current_session_id=current_session_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/me/login-sessions/{session_id}", response_model=LoginSessionOut)
def trust_login_session(
    session_id: int,
    body: LoginSessionTrustUpdate,
    current_user: CurrentUser,
    current_session_id: CurrentSessionId,
    db: DbSession,
):
    return update_login_session_trust(
        db,
        current_user,
        session_id,
        is_trusted=body.is_trusted,
        current_session_id=current_session_id,
    )


@router.put("/me/security/login-email-alerts", response_model=SecuritySummaryOut)
def update_login_email_alerts_route(
    body: LoginEmailAlertsUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    return update_login_email_alerts(db, current_user, body.enabled)


@router.post("/me/security/2fa/setup", response_model=TwoFactorSetupOut)
def setup_two_factor_route(current_user: CurrentUser, db: DbSession):
    return setup_two_factor(db, current_user)


@router.post("/me/security/2fa/enable", response_model=SecuritySummaryOut)
def enable_two_factor_route(
    body: TwoFactorEnableRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    return enable_two_factor(db, current_user, body.code)


@router.delete("/me/security/2fa", response_model=SecuritySummaryOut)
def disable_two_factor_route(
    body: TwoFactorDisableRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    return disable_two_factor(db, current_user, body.password, body.code)


@router.get("/{username}", response_model=UserOut)
def get_profile(username: str, db: DbSession, viewer: OptionalUser = None):
    user = get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return build_user_out(db, user, viewer)


@router.post("/{user_id}/follow", response_model=FollowResponse)
def follow_user(user_id: int, current_user: CurrentUser, db: DbSession):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    target = db.get(User, user_id)
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.scalar(
        select(Follow.id).where(Follow.follower_id == current_user.id, Follow.following_id == user_id)
    )
    if existing:
        return FollowResponse(is_following=True, is_requested=False)
    if target_requires_follow_request(db, user_id):
        request_follow(db, current_user, target)
        return FollowResponse(is_following=False, is_requested=True)
    db.add(Follow(follower_id=current_user.id, following_id=user_id))
    create_follow_notification(db, current_user, target)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    return FollowResponse(is_following=True, is_requested=False)


@router.delete("/{user_id}/follow", response_model=FollowResponse)
def unfollow_user(user_id: int, current_user: CurrentUser, db: DbSession):
    follow = db.scalar(
        select(Follow).where(Follow.follower_id == current_user.id, Follow.following_id == user_id)
    )
    if follow:
        db.delete(follow)
        db.commit()
    cancel_follow_request(db, current_user.id, user_id)
    return FollowResponse(is_following=False, is_requested=False)


@router.get("/me/follow-requests", response_model=list[UserOut])
def my_follow_requests(current_user: CurrentUser, db: DbSession):
    return list_follow_requests(db, current_user)


@router.post("/me/follow-requests/{request_id}/accept", response_model=UserOut)
def accept_follow_request_route(request_id: int, current_user: CurrentUser, db: DbSession):
    return accept_follow_request(db, current_user, request_id)


@router.delete("/me/follow-requests/{request_id}", status_code=204)
def reject_follow_request_route(request_id: int, current_user: CurrentUser, db: DbSession):
    reject_follow_request(db, current_user, request_id)


@router.post("/me/follow-requests/by-user/{requester_id}/accept", response_model=UserOut)
def accept_follow_request_by_user_route(requester_id: int, current_user: CurrentUser, db: DbSession):
    return accept_follow_request_by_requester(db, current_user, requester_id)


@router.delete("/me/follow-requests/by-user/{requester_id}", status_code=204)
def reject_follow_request_by_user_route(requester_id: int, current_user: CurrentUser, db: DbSession):
    reject_follow_request_by_requester(db, current_user, requester_id)


@router.post("/{user_id}/block", status_code=204)
def block_user_route(user_id: int, current_user: CurrentUser, db: DbSession):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    block_user(db, current_user.id, user_id)


@router.delete("/{user_id}/block", status_code=204)
def unblock_user_route(user_id: int, current_user: CurrentUser, db: DbSession):
    unblock_user(db, current_user.id, user_id)


@router.get("/{user_id}/block-status")
def block_status(user_id: int, current_user: CurrentUser, db: DbSession):
    return {"is_blocked": is_blocked(db, current_user.id, user_id)}


@router.get("/{username}/posts", response_model=PaginatedResponse)
def user_posts(
    username: str,
    db: DbSession,
    viewer: OptionalUser = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=30),
):
    user = get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not can_view_user_content(db, user, viewer):
        return paginate([], 0, page, limit)
    page, limit, offset = pagination_params(page, limit)
    total = db.scalar(
        select(func.count()).select_from(Post).where(Post.user_id == user.id, Post.is_archived.is_(False))
    ) or 0
    posts = db.scalars(
        select(Post)
        .where(Post.user_id == user.id, Post.is_archived.is_(False))
        .options(joinedload(Post.user))
        .order_by(Post.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    items = build_posts_out(db, list(posts), viewer)
    return paginate(items, total, page, limit)


@router.get("/{username}/reels", response_model=PaginatedResponse)
def user_reels(
    username: str,
    db: DbSession,
    viewer: OptionalUser = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=30),
):
    user = get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not can_view_user_content(db, user, viewer):
        return paginate([], 0, page, limit)
    page, limit, offset = pagination_params(page, limit)
    reels, total = get_user_reels(db, user.id, offset, limit)
    items = build_reels_out(db, reels, viewer)
    return paginate(items, total, page, limit)


@router.get("/{username}/tagged", response_model=PaginatedResponse)
def user_tagged(
    username: str,
    db: DbSession,
    viewer: OptionalUser = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=30),
):
    user = get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not can_view_user_content(db, user, viewer):
        return paginate([], 0, page, limit)
    page, limit, offset = pagination_params(page, limit)
    # `user` (the tagged person) is already guaranteed active by
    # get_user_by_username above, but the post's author is a different
    # account — if they've since deactivated, the post (and this tag on it)
    # must not surface here either.
    base = (
        select(Post)
        .join(PostTag, PostTag.post_id == Post.id)
        .join(User, Post.user_id == User.id)
        .where(PostTag.user_id == user.id, User.is_active.is_(True))
    )
    total = db.scalar(
        select(func.count(func.distinct(PostTag.post_id)))
        .select_from(Post)
        .join(PostTag, PostTag.post_id == Post.id)
        .join(User, Post.user_id == User.id)
        .where(PostTag.user_id == user.id, User.is_active.is_(True))
    ) or 0
    posts = db.scalars(
        base.options(joinedload(Post.user)).order_by(Post.created_at.desc()).offset(offset).limit(limit)
    ).all()
    items = build_posts_out(db, list(posts), viewer)
    return paginate(items, total, page, limit)


@router.get("/{username}/followers", response_model=PaginatedResponse)
def followers_list(
    username: str,
    db: DbSession,
    viewer: OptionalUser = None,
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=50),
):
    user = get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    page, limit, _ = pagination_params(page, limit)
    items, total = get_followers(db, user, viewer, page, limit)
    return paginate(items, total, page, limit)


@router.get("/{username}/following", response_model=PaginatedResponse)
def following_list(
    username: str,
    db: DbSession,
    viewer: OptionalUser = None,
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=50),
):
    user = get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    page, limit, _ = pagination_params(page, limit)
    items, total = get_following(db, user, viewer, page, limit)
    return paginate(items, total, page, limit)
