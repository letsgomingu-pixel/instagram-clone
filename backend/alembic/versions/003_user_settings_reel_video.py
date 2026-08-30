"""user settings and reel video url

Revision ID: 003_user_settings_reel_video
Revises: 002_story_media_overlays
Create Date: 2026-08-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003_user_settings_reel_video"
down_revision: Union[str, None] = "002_story_media_overlays"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("notify_likes", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_comments", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_follows", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_mentions", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_private", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("show_activity_status", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("allow_story_replies", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("comments_privacy", sa.String(length=20), nullable=False, server_default="everyone"),
        sa.Column("mentions_privacy", sa.String(length=20), nullable=False, server_default="everyone"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )

    with op.batch_alter_table("reels") as batch_op:
        batch_op.add_column(sa.Column("video_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("reels") as batch_op:
        batch_op.drop_column("video_url")
    op.drop_table("user_settings")
