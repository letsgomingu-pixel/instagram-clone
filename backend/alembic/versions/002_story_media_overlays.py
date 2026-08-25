"""story media type and overlays

Revision ID: 002_story_media_overlays
Revises: 001_initial_schema_v2
Create Date: 2026-08-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "002_story_media_overlays"
down_revision: Union[str, None] = "001_initial_schema_v2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("story_items") as batch_op:
        batch_op.add_column(
            sa.Column("media_type", sa.String(length=10), nullable=False, server_default="image")
        )
        batch_op.add_column(sa.Column("overlays", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("story_items") as batch_op:
        batch_op.drop_column("overlays")
        batch_op.drop_column("media_type")
