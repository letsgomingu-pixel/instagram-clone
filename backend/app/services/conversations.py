from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile
from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Conversation, ConversationParticipant, Message, StoryItem, User
from app.schemas.conversation import ConversationOut, MessageOut
from app.services.blocks import is_blocked
from app.services.users import build_user_out, get_user_by_username
from app.utils.datetime_fmt import to_iso
from app.utils.media import save_image


def conversation_pair(user_a: int, user_b: int) -> tuple[int, int]:
    return (user_a, user_b) if user_a < user_b else (user_b, user_a)


def get_or_create_conversation(db: Session, user: User, other: User) -> Conversation:
    if is_blocked(db, user.id, other.id):
        raise HTTPException(status_code=403, detail="Cannot message this user")
    u1, u2 = conversation_pair(user.id, other.id)
    conv = db.scalar(select(Conversation).where(Conversation.user1_id == u1, Conversation.user2_id == u2))
    if conv:
        return conv
    conv = Conversation(user1_id=u1, user2_id=u2, updated_at=datetime.now(timezone.utc))
    db.add(conv)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        return db.scalar(select(Conversation).where(Conversation.user1_id == u1, Conversation.user2_id == u2))

    db.add(ConversationParticipant(conversation_id=conv.id, user_id=u1))
    db.add(ConversationParticipant(conversation_id=conv.id, user_id=u2))
    db.flush()
    return conv


def create_group_conversation(
    db: Session, creator: User, usernames: list[str], title: str | None
) -> Conversation:
    resolved: list[User] = []
    seen_ids = {creator.id}
    for name in usernames:
        member = get_user_by_username(db, name)
        if not member:
            raise HTTPException(status_code=404, detail=f"'{name}' 사용자를 찾을 수 없습니다")
        if is_blocked(db, creator.id, member.id):
            raise HTTPException(status_code=403, detail=f"'{name}'에게 메시지를 보낼 수 없습니다")
        if member.id in seen_ids:
            continue
        seen_ids.add(member.id)
        resolved.append(member)

    if len(resolved) < 2:
        raise HTTPException(status_code=400, detail="그룹은 본인 외 최소 2명 이상이 필요합니다")

    conv = Conversation(
        is_group=True,
        title=title.strip() if title and title.strip() else None,
        created_by_id=creator.id,
        updated_at=datetime.now(timezone.utc),
    )
    db.add(conv)
    db.flush()

    db.add(ConversationParticipant(conversation_id=conv.id, user_id=creator.id))
    for member in resolved:
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=member.id))

    db.add(
        Message(
            conversation_id=conv.id,
            sender_id=creator.id,
            content=f"{creator.username}님이 그룹을 만들었습니다.",
            is_read=False,
        )
    )
    db.commit()
    db.refresh(conv)
    return conv


def _is_participant(db: Session, conversation_id: int, user_id: int) -> bool:
    return (
        db.scalar(
            select(ConversationParticipant.id).where(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id,
            )
        )
        is not None
    )


def get_group_conversation_or_404(db: Session, conversation_id: int, viewer: User) -> Conversation:
    conv = db.get(Conversation, conversation_id)
    if not conv or not conv.is_group:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not _is_participant(db, conversation_id, viewer.id):
        raise HTTPException(status_code=403, detail="Not a participant of this conversation")
    return conv


def _group_participants_out(db: Session, conv: Conversation, viewer: User) -> list:
    member_rows = db.scalars(
        select(ConversationParticipant).where(ConversationParticipant.conversation_id == conv.id)
    ).all()
    member_ids = [row.user_id for row in member_rows]
    if not member_ids:
        return []
    members = db.scalars(select(User).where(User.id.in_(member_ids))).all()
    return [build_user_out(db, m, viewer) for m in members]


def build_message_out(msg: Message) -> MessageOut:
    if msg.deleted_at:
        content = "메시지가 삭제되었습니다."
    else:
        content = msg.content or ""
    return MessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        content=content,
        created_at=to_iso(msg.created_at),
        is_read=msg.is_read,
        media_url=None if msg.deleted_at else msg.media_url,
        media_type=None if msg.deleted_at else msg.media_type,
        story_item_id=None if msg.deleted_at else msg.story_item_id,
        is_deleted=msg.deleted_at is not None,
    )


def _fetch_messages(db: Session, conversation_id: int, *, before_id: int | None, limit: int) -> list[Message]:
    query = select(Message).where(Message.conversation_id == conversation_id)
    if before_id:
        query = query.where(Message.id < before_id)
    return list(db.scalars(query.order_by(desc(Message.id)).limit(limit)).all())[::-1]


def build_conversation_out(
    db: Session, conv: Conversation, viewer: User, *, before_id: int | None = None, msg_limit: int = 50
) -> ConversationOut:
    messages = _fetch_messages(db, conv.id, before_id=before_id, limit=msg_limit)
    msg_outs = [build_message_out(m) for m in messages]
    last = msg_outs[-1] if msg_outs else MessageOut(
        id=0, sender_id=viewer.id, content="", created_at=to_iso(conv.updated_at), is_read=True
    )
    unread = sum(1 for m in messages if not m.is_read and m.sender_id != viewer.id)

    if conv.is_group:
        return ConversationOut(
            id=conv.id,
            is_group=True,
            title=conv.title,
            participant=None,
            participants=_group_participants_out(db, conv, viewer),
            messages=msg_outs,
            last_message=last,
            unread_count=unread,
            has_more_messages=len(messages) == msg_limit,
        )

    participant_id = conv.user2_id if conv.user1_id == viewer.id else conv.user1_id
    participant = db.get(User, participant_id)
    if not participant:
        raise HTTPException(status_code=500, detail="Conversation participant missing")
    return ConversationOut(
        id=conv.id,
        is_group=False,
        title=None,
        participant=build_user_out(db, participant, viewer),
        participants=[],
        messages=msg_outs,
        last_message=last,
        unread_count=unread,
        has_more_messages=len(messages) == msg_limit,
    )


def list_conversations(db: Session, viewer: User) -> list[ConversationOut]:
    has_message = select(Message.id).where(Message.conversation_id == Conversation.id).exists()
    my_conversation_ids = select(ConversationParticipant.conversation_id).where(
        ConversationParticipant.user_id == viewer.id
    )
    convs = db.scalars(
        select(Conversation)
        .where(Conversation.id.in_(my_conversation_ids), has_message)
        .order_by(desc(Conversation.updated_at))
    ).all()
    return [build_conversation_out(db, c, viewer, msg_limit=1) for c in convs]


def get_messages_with_user(
    db: Session, viewer: User, username: str, *, before_id: int | None = None, limit: int = 50
) -> ConversationOut:
    other = get_user_by_username(db, username)
    if not other:
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

    return build_conversation_out(db, conv, viewer, before_id=before_id, msg_limit=limit)


def send_message(
    db: Session,
    viewer: User,
    username: str,
    content: str | None = None,
    *,
    media_url: str | None = None,
    media_type: str | None = None,
    story_item_id: int | None = None,
) -> MessageOut:
    other = get_user_by_username(db, username)
    if not other:
        raise HTTPException(status_code=404, detail="User not found")
    if other.id == viewer.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    if not content and not media_url:
        raise HTTPException(status_code=400, detail="Message content or media required")

    conv = get_or_create_conversation(db, viewer, other)
    msg = Message(
        conversation_id=conv.id,
        sender_id=viewer.id,
        content=content,
        media_url=media_url,
        media_type=media_type,
        story_item_id=story_item_id,
        is_read=False,
    )
    conv.updated_at = datetime.now(timezone.utc)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return build_message_out(msg)


def send_story_reply(db: Session, viewer: User, story_item_id: int, content: str) -> MessageOut:
    from app.models import Story

    item = db.get(StoryItem, story_item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Story not found")
    story = db.get(Story, item.story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    owner = db.get(User, story.user_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Story owner not found")
    return send_message(db, viewer, owner.username, content=content, story_item_id=story_item_id)


def delete_message(db: Session, viewer: User, message_id: int) -> None:
    msg = db.get(Message, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != viewer.id:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")
    if not _is_participant(db, msg.conversation_id, viewer.id):
        raise HTTPException(status_code=403, detail="Not a participant")
    msg.deleted_at = datetime.now(timezone.utc)
    msg.content = None
    msg.media_url = None
    db.commit()


async def send_message_with_media(
    db: Session, viewer: User, username: str, content: str | None, image: UploadFile
) -> MessageOut:
    media_url = save_image(image, "messages")
    return send_message(db, viewer, username, content=content, media_url=media_url, media_type="image")


def get_group_messages(
    db: Session, viewer: User, conversation_id: int, *, before_id: int | None = None, limit: int = 50
) -> ConversationOut:
    conv = get_group_conversation_or_404(db, conversation_id, viewer)

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

    return build_conversation_out(db, conv, viewer, before_id=before_id, msg_limit=limit)


def send_group_message(
    db: Session,
    viewer: User,
    conversation_id: int,
    content: str | None = None,
    *,
    media_url: str | None = None,
    media_type: str | None = None,
) -> MessageOut:
    conv = get_group_conversation_or_404(db, conversation_id, viewer)
    if not content and not media_url:
        raise HTTPException(status_code=400, detail="Message content or media required")
    msg = Message(
        conversation_id=conv.id,
        sender_id=viewer.id,
        content=content,
        media_url=media_url,
        media_type=media_type,
        is_read=False,
    )
    conv.updated_at = datetime.now(timezone.utc)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return build_message_out(msg)


async def send_group_message_with_media(
    db: Session, viewer: User, conversation_id: int, content: str | None, image: UploadFile
) -> MessageOut:
    media_url = save_image(image, "messages")
    return send_group_message(
        db, viewer, conversation_id, content=content, media_url=media_url, media_type="image"
    )


def get_group_participants(db: Session, conversation_id: int, viewer: User) -> list:
    conv = get_group_conversation_or_404(db, conversation_id, viewer)
    return _group_participants_out(db, conv, viewer)
