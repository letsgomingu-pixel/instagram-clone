"""Migration 018: pickup fulfillment and seller-set ready time."""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "018_order_pickup"
down_revision: Union[str, None] = "017_password_reset_reports"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("orders") as batch_op:
        batch_op.add_column(
            sa.Column("fulfillment_type", sa.String(length=20), nullable=False, server_default="delivery")
        )
        batch_op.add_column(sa.Column("pickup_ready_minutes", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("pickup_ready_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("orders") as batch_op:
        batch_op.drop_column("pickup_ready_at")
        batch_op.drop_column("pickup_ready_minutes")
        batch_op.drop_column("fulfillment_type")
