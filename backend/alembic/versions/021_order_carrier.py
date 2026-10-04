"""Migration 021: courier company on a delivery order."""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "021_order_carrier"
down_revision: Union[str, None] = "020_web_push"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("orders") as batch_op:
        batch_op.add_column(sa.Column("carrier", sa.String(20), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("orders") as batch_op:
        batch_op.drop_column("carrier")
