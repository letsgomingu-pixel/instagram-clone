from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class MessageOut(BaseModel):
    id: int
    sender_id: int
    content: str
    created_at: str
    is_read: bool


class ConversationOut(BaseModel):
    id: int
    is_group: bool = False
    title: str | None = None
    # Populated for 1:1 conversations only — the other person. Group chats
    # have no single "other person", so this is None there; use
    # `participants` (every member, including the viewer) instead.
    participant: UserOut | None = None
    participants: list[UserOut] = []
    messages: list[MessageOut]
    last_message: MessageOut
    unread_count: int


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class GroupConversationCreate(BaseModel):
    title: str | None = Field(default=None, max_length=100)
    # At least 2 OTHER members (so the group has >= 3 people including the
    # creator) — a 2-person thread should just use the normal 1:1 flow.
    usernames: list[str] = Field(min_length=2, max_length=49)
