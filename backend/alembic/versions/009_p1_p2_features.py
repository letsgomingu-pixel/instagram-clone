"""P1/P2 backlog: replies, comment likes, blocks, message media, story likes,
reel comments/views, recent searches, saved collections, trusted device token

Revision ID: 009_p1_p2_features
Revises: 008_group_chat
Create Date: 2026-09-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "009_p1_p2_features"
down_revision: Union[str, None] = "008_group_chat"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("comments") as batch_op:
        batch_op.add_column(sa.Column("parent_id", sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column("like_count", sa.Integer(), nullable=False, server_default=sa.text("0"))
        )
        batch_op.create_foreign_key(
            "fk_comments_parent_id", "comments", ["parent_id"], ["id"], ondelete="CASCADE"
        )
        batch_op.create_index("ix_comments_parent_id", ["parent_id"])

    op.create_table(
        "comment_likes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("comment_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["comment_id"], ["comments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("comment_id", "user_id", name="uq_comment_like"),
    )
    op.create_index("ix_comment_likes_comment_id", "comment_likes", ["comment_id"])

    op.create_table(
        "user_blocks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("blocker_id", sa.Integer(), nullable=False),
        sa.Column("blocked_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["blocker_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["blocked_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("blocker_id", "blocked_id", name="uq_user_block"),
        sa.CheckConstraint("blocker_id != blocked_id", name="ck_user_block_self"),
    )
    op.create_index("ix_user_blocks_blocker_id", "user_blocks", ["blocker_id"])
    op.create_index("ix_user_blocks_blocked_id", "user_blocks", ["blocked_id"])

    with op.batch_alter_table("messages") as batch_op:
        batch_op.alter_column("content", existing_type=sa.Text(), nullable=True)
        batch_op.add_column(sa.Column("media_url", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("media_type", sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("story_item_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_messages_story_item_id", "story_items", ["story_item_id"], ["id"], ondelete="SET NULL"
        )

    op.create_table(
        "story_likes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("story_item_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["story_item_id"], ["story_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("story_item_id", "user_id", name="uq_story_like"),
    )

    op.create_table(
        "reel_comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("reel_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["reel_id"], ["reels.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reel_comments_reel_id", "reel_comments", ["reel_id"])

    op.create_table(
        "reel_views",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("reel_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("session_key", sa.String(length=64), nullable=True),
        sa.Column(
            "viewed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["reel_id"], ["reels.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reel_id", "user_id", name="uq_reel_view_user"),
        sa.UniqueConstraint("reel_id", "session_key", name="uq_reel_view_session"),
    )

    op.create_table(
        "recent_searches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("query", sa.String(length=200), nullable=False),
        sa.Column("search_type", sa.String(length=20), nullable=False, server_default="user"),
        sa.Column(
            "searched_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recent_searches_user_id", "recent_searches", ["user_id"])

    op.create_table(
        "saved_collections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("cover_post_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["cover_post_id"], ["posts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "saved_collection_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("collection_id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["collection_id"], ["saved_collections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("collection_id", "post_id", name="uq_collection_post"),
    )

    with op.batch_alter_table("login_sessions") as batch_op:
        batch_op.add_column(sa.Column("trust_token", sa.String(length=64), nullable=True))
        batch_op.create_index("ix_login_sessions_trust_token", ["trust_token"], unique=True)


def downgrade() -> None:
    with op.batch_alter_table("login_sessions") as batch_op:
        batch_op.drop_index("ix_login_sessions_trust_token")
        batch_op.drop_column("trust_token")

    op.drop_table("saved_collection_items")
    op.drop_table("saved_collections")
    op.drop_table("recent_searches")
    op.drop_table("reel_views")
    op.drop_table("reel_comments")
    op.drop_table("story_likes")

    with op.batch_alter_table("messages") as batch_op:
        batch_op.drop_constraint("fk_messages_story_item_id", type_="foreignkey")
        batch_op.drop_column("story_item_id")
        batch_op.drop_column("deleted_at")
        batch_op.drop_column("media_type")
        batch_op.drop_column("media_url")
        batch_op.alter_column("content", existing_type=sa.Text(), nullable=False)

    op.drop_table("user_blocks")
    op.drop_table("comment_likes")

    with op.batch_alter_table("comments") as batch_op:
        batch_op.drop_index("ix_comments_parent_id")
        batch_op.drop_constraint("fk_comments_parent_id", type_="foreignkey")
        batch_op.drop_column("like_count")
        batch_op.drop_column("parent_id")
