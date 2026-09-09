"""Migration 011: user shipping address fields."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "011_user_shipping_fields"
down_revision: Union[str, None] = "010_instagram_parity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("phone", sa.String(20), nullable=False, server_default="010-0000-0000")
        )
        batch_op.add_column(
            sa.Column("postcode", sa.String(10), nullable=False, server_default="00000")
        )
        batch_op.add_column(
            sa.Column("address_line1", sa.String(255), nullable=False, server_default="")
        )
        batch_op.add_column(
            sa.Column("address_line2", sa.String(255), nullable=False, server_default="")
        )

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("phone", server_default=None)
        batch_op.alter_column("postcode", server_default=None)
        batch_op.alter_column("address_line1", server_default=None)
        batch_op.alter_column("address_line2", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("address_line2")
        batch_op.drop_column("address_line1")
        batch_op.drop_column("postcode")
        batch_op.drop_column("phone")
