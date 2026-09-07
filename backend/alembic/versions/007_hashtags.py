"""add hashtags and post_hashtags tables

Revision ID: 007_hashtags
Revises: 006_post_media
Create Date: 2026-09-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "007_hashtags"
down_revision: Union[str, None] = "006_post_media"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "hashtags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_hashtag_name"),
    )
    op.create_index(op.f("ix_hashtags_id"), "hashtags", ["id"], unique=False)
    op.create_index(op.f("ix_hashtags_name"), "hashtags", ["name"], unique=False)

    op.create_table(
        "post_hashtags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("hashtag_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["hashtag_id"], ["hashtags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("post_id", "hashtag_id", name="uq_post_hashtag"),
    )
    op.create_index(op.f("ix_post_hashtags_id"), "post_hashtags", ["id"], unique=False)
    op.create_index(op.f("ix_post_hashtags_post_id"), "post_hashtags", ["post_id"], unique=False)
    op.create_index(op.f("ix_post_hashtags_hashtag_id"), "post_hashtags", ["hashtag_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_post_hashtags_hashtag_id"), table_name="post_hashtags")
    op.drop_index(op.f("ix_post_hashtags_post_id"), table_name="post_hashtags")
    op.drop_index(op.f("ix_post_hashtags_id"), table_name="post_hashtags")
    op.drop_table("post_hashtags")
    op.drop_index(op.f("ix_hashtags_name"), table_name="hashtags")
    op.drop_index(op.f("ix_hashtags_id"), table_name="hashtags")
    op.drop_table("hashtags")
