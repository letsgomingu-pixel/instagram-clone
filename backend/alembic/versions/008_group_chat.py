"""group chat: participants table + group metadata on conversations

Revision ID: 008_group_chat
Revises: 007_hashtags
Create Date: 2026-09-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "008_group_chat"
down_revision: Union[str, None] = "007_hashtags"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # user1_id/user2_id stay as the fast-path identity for 1:1 conversations
    # (and keep the existing uq_conversation_users / ck_conversation_user_order
    # protections for that case), but both become nullable so a group
    # conversation — which has no single "other user" — can leave them NULL
    # and rely on conversation_participants instead. This needs SQLite's
    # batch/table-rebuild mode (render_as_batch handles Postgres natively).
    with op.batch_alter_table("conversations") as batch_op:
        batch_op.add_column(
            sa.Column("is_group", sa.Boolean(), nullable=False, server_default=sa.text("false"))
        )
        batch_op.add_column(sa.Column("title", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("created_by_id", sa.Integer(), nullable=True))
        batch_op.alter_column("user1_id", existing_type=sa.Integer(), nullable=True)
        batch_op.alter_column("user2_id", existing_type=sa.Integer(), nullable=True)
        batch_op.drop_constraint("ck_conversation_user_order", type_="check")
        batch_op.create_check_constraint(
            "ck_conversation_user_order",
            "user1_id IS NULL OR user2_id IS NULL OR user1_id < user2_id",
        )
        batch_op.create_foreign_key(
            "fk_conversations_created_by_id", "users", ["created_by_id"], ["id"], ondelete="SET NULL"
        )

    op.create_table(
        "conversation_participants",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("conversation_id", "user_id", name="uq_conversation_participant"),
    )
    op.create_index(
        op.f("ix_conversation_participants_id"), "conversation_participants", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_conversation_participants_conversation_id"),
        "conversation_participants",
        ["conversation_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_conversation_participants_user_id"),
        "conversation_participants",
        ["user_id"],
        unique=False,
    )

    # Backfill: give every existing (1:1) conversation its two participant
    # rows, so conversation listing/lookup can be participant-based for both
    # old and new conversations uniformly, instead of branching on is_group.
    op.execute(
        """
        INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
        SELECT id, user1_id, updated_at FROM conversations
        """
    )
    op.execute(
        """
        INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
        SELECT id, user2_id, updated_at FROM conversations
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_conversation_participants_user_id"), table_name="conversation_participants")
    op.drop_index(
        op.f("ix_conversation_participants_conversation_id"), table_name="conversation_participants"
    )
    op.drop_index(op.f("ix_conversation_participants_id"), table_name="conversation_participants")
    op.drop_table("conversation_participants")

    with op.batch_alter_table("conversations") as batch_op:
        batch_op.drop_constraint("fk_conversations_created_by_id", type_="foreignkey")
        batch_op.drop_constraint("ck_conversation_user_order", type_="check")
        batch_op.create_check_constraint("ck_conversation_user_order", "user1_id < user2_id")
        batch_op.alter_column("user2_id", existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column("user1_id", existing_type=sa.Integer(), nullable=False)
        batch_op.drop_column("created_by_id")
        batch_op.drop_column("title")
        batch_op.drop_column("is_group")
