from datetime import datetime, timezone

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Conversation, Message, User
from app.schemas.conversation import ConversationOut, MessageOut
from app.services.users import build_user_out, get_user_by_username
from app.utils.datetime_fmt import to_iso


def conversation_pair(user_a: int, user_b: int) -> tuple[int, int]:
    return (user_a, user_b) if user_a < user_b else (user_b, user_a)


def get_or_create_conversation(db: Session, user: User, other: User) -> Conversation:
    u1, u2 = conversation_pair(user.id, other.id)
    conv = db.scalar(select(Conversation).where(Conversation.user1_id == u1, Conversation.user2_id == u2))
    if conv:
        return conv
    conv = Conversation(user1_id=u1, user2_id=u2, updated_at=datetime.now(timezone.utc))
    db.add(conv)
    db.flush()
    return conv


def _participant(conv: Conversation, user_id: int) -> User:
    other_id = conv.user2_id if conv.user1_id == user_id else conv.user1_id
    return conv.user1 if conv.user1_id == other_id else conv.user2  # type: ignore[attr-defined]


def _load_conv_users(db: Session, conv: Conversation) -> tuple[User, User]:
    u1 = db.get(User, conv.user1_id)
    u2 = db.get(User, conv.user2_id)
    return u1, u2  # type: ignore[return-value]


def build_message_out(msg: Message) -> MessageOut:
    return MessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        content=msg.content,
        created_at=to_iso(msg.created_at),
        is_read=msg.is_read,
    )


def build_conversation_out(db: Session, conv: Conversation, viewer: User) -> ConversationOut:
    participant_id = conv.user2_id if conv.user1_id == viewer.id else conv.user1_id
    participant = db.get(User, participant_id)
    if not participant:
        from fastapi import HTTPException

        raise HTTPException(status_code=500, detail="Conversation participant missing")
    messages = db.scalars(
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.created_at)
    ).all()
    msg_outs = [build_message_out(m) for m in messages]
    last = msg_outs[-1] if msg_outs else MessageOut(
        id=0, sender_id=viewer.id, content="", created_at=to_iso(conv.updated_at), is_read=True
    )
    unread = sum(1 for m in messages if not m.is_read and m.sender_id != viewer.id)
    return ConversationOut(
        id=conv.id,
        participant=build_user_out(db, participant, viewer),
        messages=msg_outs,
        last_message=last,
        unread_count=unread,
    )


def list_conversations(db: Session, viewer: User) -> list[ConversationOut]:
    convs = db.scalars(
        select(Conversation)
        .where((Conversation.user1_id == viewer.id) | (Conversation.user2_id == viewer.id))
        .order_by(desc(Conversation.updated_at))
    ).all()
    return [build_conversation_out(db, c, viewer) for c in convs]


def get_messages_with_user(db: Session, viewer: User, username: str) -> ConversationOut:
    other = get_user_by_username(db, username)
    if not other:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="User not found")
    conv = get_or_create_conversation(db, viewer, other)
    db.flush()

    unread = db.scalars(
        select(Message).where(
            Message.conversation_id == conv.id,
            Message.sender_id != viewer.id,
            Message.is_read.is_(False),
        )
    ).all()
    for msg in unread:
        msg.is_read = True
    db.commit()

    return build_conversation_out(db, conv, viewer)


def send_message(db: Session, viewer: User, username: str, content: str) -> MessageOut:
    other = get_user_by_username(db, username)
    if not other:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="User not found")
    if other.id == viewer.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    conv = get_or_create_conversation(db, viewer, other)
    msg = Message(
        conversation_id=conv.id,
        sender_id=viewer.id,
        content=content,
        is_read=False,
    )
    conv.updated_at = datetime.now(timezone.utc)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return build_message_out(msg)
