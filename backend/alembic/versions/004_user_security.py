"""user security: login sessions and 2FA settings

Revision ID: 004_user_security
Revises: 003_user_settings_reel_video
Create Date: 2026-08-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "004_user_security"
down_revision: Union[str, None] = "003_user_settings_reel_video"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.add_column(
            sa.Column("login_email_alerts", sa.Boolean(), nullable=False, server_default=sa.text("true"))
        )
        batch_op.add_column(
            sa.Column("two_factor_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false"))
        )
        batch_op.add_column(sa.Column("two_factor_secret", sa.String(length=64), nullable=True))

    op.create_table(
        "login_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("ip_address", sa.String(length=45), nullable=False),
        sa.Column("user_agent", sa.String(length=500), nullable=False),
        sa.Column("device_name", sa.String(length=100), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("is_trusted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "last_active_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_login_sessions_user_id", "login_sessions", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_login_sessions_user_id", table_name="login_sessions")
    op.drop_table("login_sessions")
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.drop_column("two_factor_secret")
        batch_op.drop_column("two_factor_enabled")
        batch_op.drop_column("login_email_alerts")
