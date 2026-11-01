"""Migration 023: product origin country."""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "023_product_origin"
down_revision: Union[str, None] = "022_payment_method"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("products") as batch_op:
        batch_op.add_column(sa.Column("origin", sa.String(30), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("products") as batch_op:
        batch_op.drop_column("origin")
