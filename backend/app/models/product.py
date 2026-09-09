from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

STORAGE_TYPES = ("fresh", "frozen", "dried", "smoked")
AVAILABILITY_TYPES = ("year_round", "seasonal")
POST_TYPES = ("standard", "product", "review")
FEED_TABS = ("products", "reviews")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    storage_type: Mapped[str] = mapped_column(String(30), nullable=False)
    availability: Mapped[str] = mapped_column(String(20), nullable=False)
    season_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    season_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    seller = relationship("User", back_populates="products")
    post = relationship("Post", back_populates="product", foreign_keys=[post_id])
    orders = relationship("Order", back_populates="product")
    cart_items = relationship("CartItem", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")
