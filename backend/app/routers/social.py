from fastapi import APIRouter, HTTPException

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.dependencies import CurrentUser, DbSession
from app.models import Notification
from app.schemas.conversation import ConversationOut, GroupConversationCreate, MessageCreate, MessageOut
from app.schemas.notification import NotificationOut, NotificationReadUpdate
from app.schemas.user import UserOut
from app.services.conversations import (
    create_group_conversation,
    get_group_messages,
    get_group_participants,
    get_messages_with_user,
    list_conversations,
    send_group_message,
    send_message,
)
from app.services.posts import build_notification_out, list_notifications

router = APIRouter(tags=["social"])


conversations_router = APIRouter(prefix="/conversations", tags=["conversations"])


@conversations_router.get("", response_model=list[ConversationOut])
def get_conversations(current_user: CurrentUser, db: DbSession):
    return list_conversations(db, current_user)


@conversations_router.get("/{username}/messages", response_model=ConversationOut)
def get_messages(username: str, current_user: CurrentUser, db: DbSession):
    return get_messages_with_user(db, current_user, username)


@conversations_router.post("/{username}/messages", response_model=MessageOut, status_code=201)
def post_message(username: str, body: MessageCreate, current_user: CurrentUser, db: DbSession):
    return send_message(db, current_user, username, body.content)


@conversations_router.post("/group", response_model=ConversationOut, status_code=201)
def create_group(body: GroupConversationCreate, current_user: CurrentUser, db: DbSession):
    conv = create_group_conversation(db, current_user, body.usernames, body.title)
    return get_group_messages(db, current_user, conv.id)


@conversations_router.get("/group/{conversation_id}/messages", response_model=ConversationOut)
def get_group_messages_route(conversation_id: int, current_user: CurrentUser, db: DbSession):
    return get_group_messages(db, current_user, conversation_id)


@conversations_router.post("/group/{conversation_id}/messages", response_model=MessageOut, status_code=201)
def post_group_message(conversation_id: int, body: MessageCreate, current_user: CurrentUser, db: DbSession):
    return send_group_message(db, current_user, conversation_id, body.content)


@conversations_router.get("/group/{conversation_id}/participants", response_model=list[UserOut])
def get_group_participants_route(conversation_id: int, current_user: CurrentUser, db: DbSession):
    return get_group_participants(db, conversation_id, current_user)


notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])


@notifications_router.get("", response_model=list[NotificationOut])
def get_notifications(
    current_user: CurrentUser,
    db: DbSession,
    tab: str = "you",
):
    if tab not in ("you", "following"):
        raise HTTPException(status_code=400, detail="Invalid tab")
    return list_notifications(db, current_user, tab)


@notifications_router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: int,
    body: NotificationReadUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    notification = db.scalar(
        select(Notification)
        .where(Notification.id == notification_id, Notification.recipient_id == current_user.id)
        .options(joinedload(Notification.actor))
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = body.is_read
    db.commit()
    db.refresh(notification)
    return build_notification_out(db, notification, current_user)
