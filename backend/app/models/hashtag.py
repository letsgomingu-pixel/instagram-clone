from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Hashtag(Base):
    __tablename__ = "hashtags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    posts = relationship("PostHashtag", back_populates="hashtag", cascade="all, delete-orphan")


class PostHashtag(Base):
    __tablename__ = "post_hashtags"
    __table_args__ = (UniqueConstraint("post_id", "hashtag_id", name="uq_post_hashtag"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    hashtag_id: Mapped[int] = mapped_column(ForeignKey("hashtags.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    post = relationship("Post", back_populates="hashtags")
    hashtag = relationship("Hashtag", back_populates="posts")
