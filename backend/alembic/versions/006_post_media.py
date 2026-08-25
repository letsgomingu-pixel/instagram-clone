"""add post_media table for carousel and video posts

Revision ID: 006_post_media
Revises: 005_admin_role
Create Date: 2026-08-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "006_post_media"
down_revision: Union[str, None] = "005_admin_role"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "post_media",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("media_url", sa.String(length=500), nullable=False),
        sa.Column("media_type", sa.String(length=10), server_default="image", nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_post_media_id"), "post_media", ["id"], unique=False)
    op.create_index(op.f("ix_post_media_post_id"), "post_media", ["post_id"], unique=False)

    op.execute(
        """
        INSERT INTO post_media (post_id, media_url, media_type, position, created_at)
        SELECT id, image_url, 'image', 0, created_at FROM posts
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_post_media_post_id"), table_name="post_media")
    op.drop_index(op.f("ix_post_media_id"), table_name="post_media")
    op.drop_table("post_media")
