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
    participant: UserOut
    messages: list[MessageOut]
    last_message: MessageOut
    unread_count: int


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
