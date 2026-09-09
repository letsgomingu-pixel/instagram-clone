from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    postcode: Mapped[str] = mapped_column(String(10), nullable=False)
    address_line1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line2: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    reels = relationship("Reel", back_populates="user", cascade="all, delete-orphan")
    reel_likes = relationship("ReelLike", back_populates="user", cascade="all, delete-orphan")
    tagged_in_posts = relationship("PostTag", back_populates="user", cascade="all, delete-orphan")
    story_views = relationship("StoryView", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("Message", back_populates="sender", cascade="all, delete-orphan")
    notifications_received = relationship(
        "Notification",
        foreign_keys="Notification.recipient_id",
        back_populates="recipient",
        cascade="all, delete-orphan",
    )
    notifications_sent = relationship(
        "Notification",
        foreign_keys="Notification.actor_id",
        back_populates="actor",
        cascade="all, delete-orphan",
    )
    settings = relationship(
        "UserSettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    login_sessions = relationship(
        "LoginSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    products = relationship("Product", back_populates="seller", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")
    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan")
