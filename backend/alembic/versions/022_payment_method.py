"""Migration 022: card or bank deposit on a payment."""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "022_payment_method"
down_revision: Union[str, None] = "021_order_carrier"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("payments") as batch_op:
        batch_op.add_column(sa.Column("method", sa.String(20), nullable=False, server_default="card"))


def downgrade() -> None:
    with op.batch_alter_table("payments") as batch_op:
        batch_op.drop_column("method")
