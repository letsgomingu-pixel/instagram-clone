from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StoryLike(Base):
    __tablename__ = "story_likes"
    __table_args__ = (UniqueConstraint("story_item_id", "user_id", name="uq_story_like"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    story_item_id: Mapped[int] = mapped_column(
        ForeignKey("story_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
