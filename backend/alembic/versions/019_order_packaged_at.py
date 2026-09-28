"""Migration 019: when the seller marks a pickup order packaged."""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "019_order_packaged_at"
down_revision: Union[str, None] = "018_order_pickup"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("orders") as batch_op:
        batch_op.add_column(sa.Column("packaged_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("orders") as batch_op:
        batch_op.drop_column("packaged_at")
