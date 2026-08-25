from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

PRIVACY_LEVELS = ("everyone", "followers", "off")


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    notify_likes: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_comments: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_follows: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_mentions: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    show_activity_status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_story_replies: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    comments_privacy: Mapped[str] = mapped_column(String(20), default="everyone", nullable=False)
    mentions_privacy: Mapped[str] = mapped_column(String(20), default="everyone", nullable=False)
    login_email_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    two_factor_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        onupdate=func.now(),
        server_default=func.now(),
    )

    user = relationship("User", back_populates="settings")
