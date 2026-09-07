from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ReelView(Base):
    __tablename__ = "reel_views"
    __table_args__ = (
        UniqueConstraint("reel_id", "user_id", name="uq_reel_view_user"),
        UniqueConstraint("reel_id", "session_key", name="uq_reel_view_session"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reel_id: Mapped[int] = mapped_column(ForeignKey("reels.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    session_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
