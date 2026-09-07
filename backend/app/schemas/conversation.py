from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class MessageOut(BaseModel):
    id: int
    sender_id: int
    content: str
    created_at: str
    is_read: bool
    media_url: str | None = None
    media_type: str | None = None
    story_item_id: int | None = None
    is_deleted: bool = False


class ConversationOut(BaseModel):
    id: int
    is_group: bool = False
    title: str | None = None
    participant: UserOut | None = None
    participants: list[UserOut] = []
    messages: list[MessageOut]
    last_message: MessageOut
    unread_count: int
    has_more_messages: bool = False


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class GroupConversationCreate(BaseModel):
    title: str | None = Field(default=None, max_length=100)
    usernames: list[str] = Field(min_length=2, max_length=49)
