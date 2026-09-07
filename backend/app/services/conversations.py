from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Conversation, ConversationParticipant, Message, User
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
    try:
        db.flush()
    except IntegrityError:
        # Two simultaneous first-messages between the same pair of users can
        # both pass the SELECT above; the loser re-fetches the winner's row
        # (which already has its participant rows) instead of surfacing a 500.
        db.rollback()
        return db.scalar(select(Conversation).where(Conversation.user1_id == u1, Conversation.user2_id == u2))

    # Brand-new conversation id — no existing participant row can reference
    # it yet, so these two inserts can't conflict.
    db.add(ConversationParticipant(conversation_id=conv.id, user_id=u1))
    db.add(ConversationParticipant(conversation_id=conv.id, user_id=u2))
    db.flush()
    return conv


def create_group_conversation(
    db: Session, creator: User, usernames: list[str], title: str | None
) -> Conversation:
    from fastapi import HTTPException

    resolved: list[User] = []
    seen_ids = {creator.id}
    for name in usernames:
        member = get_user_by_username(db, name)
        if not member:
            raise HTTPException(status_code=404, detail=f"'{name}' 사용자를 찾을 수 없습니다")
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

    # A real message (rather than a bare empty row) so this group shows up
    # in everyone's inbox immediately — list_conversations only surfaces
    # conversations that have at least one message, same rule as 1:1 chats.
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
    from fastapi import HTTPException

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
    return MessageOut(
        id=msg.id,
        sender_id=msg.sender_id,
        content=msg.content,
        created_at=to_iso(msg.created_at),
        is_read=msg.is_read,
    )


def build_conversation_out(db: Session, conv: Conversation, viewer: User) -> ConversationOut:
    messages = db.scalars(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at)
    ).all()
    msg_outs = [build_message_out(m) for m in messages]
    last = msg_outs[-1] if msg_outs else MessageOut(
        id=0, sender_id=viewer.id, content="", created_at=to_iso(conv.updated_at), is_read=True
    )
    # NOTE: is_read is a single boolean per message (built for 1:1, where one
    # boolean fully captures "has the other person read it"). For a group
    # it only ever answers "has at least one other participant read it" —
    # there's no per-participant read table — so unread_count and any "읽음"
    # UI built on this for groups is a known approximation, not exact.
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
        )

    participant_id = conv.user2_id if conv.user1_id == viewer.id else conv.user1_id
    participant = db.get(User, participant_id)
    if not participant:
        from fastapi import HTTPException

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
    )


def list_conversations(db: Session, viewer: User) -> list[ConversationOut]:
    # Opening a chat screen (a plain GET) lazily creates the Conversation row
    # via get_or_create_conversation even before either side has sent a
    # message. Without this filter that empty row would immediately show up
    # in the OTHER participant's inbox as a "start the conversation" entry —
    # real Instagram DMs never surface a thread until a message exists.
    has_message = select(Message.id).where(Message.conversation_id == Conversation.id).exists()
    my_conversation_ids = select(ConversationParticipant.conversation_id).where(
        ConversationParticipant.user_id == viewer.id
    )
    convs = db.scalars(
        select(Conversation)
        .where(Conversation.id.in_(my_conversation_ids), has_message)
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
        from fastapi import HTTPException

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


def get_group_messages(db: Session, viewer: User, conversation_id: int) -> ConversationOut:
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

    return build_conversation_out(db, conv, viewer)


def send_group_message(db: Session, viewer: User, conversation_id: int, content: str) -> MessageOut:
    conv = get_group_conversation_or_404(db, conversation_id, viewer)
    msg = Message(conversation_id=conv.id, sender_id=viewer.id, content=content, is_read=False)
    conv.updated_at = datetime.now(timezone.utc)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return build_message_out(msg)


def get_group_participants(db: Session, conversation_id: int, viewer: User) -> list:
    conv = get_group_conversation_or_404(db, conversation_id, viewer)
    return _group_participants_out(db, conv, viewer)
