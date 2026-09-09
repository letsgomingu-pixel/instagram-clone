"""Migration 015: order notifications."""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "015_order_notifications"
down_revision: Union[str, None] = "014_review_per_order"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("notifications") as batch_op:
        batch_op.add_column(sa.Column("order_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_notifications_order_id",
            "orders",
            ["order_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index("ix_notifications_order_id", ["order_id"])

    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.add_column(
            sa.Column("notify_orders", sa.Boolean(), nullable=False, server_default=sa.text("true"))
        )
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.alter_column("notify_orders", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.drop_column("notify_orders")

    with op.batch_alter_table("notifications") as batch_op:
        batch_op.drop_constraint("fk_notifications_order_id", type_="foreignkey")
        batch_op.drop_index("ix_notifications_order_id")
        batch_op.drop_column("order_id")
