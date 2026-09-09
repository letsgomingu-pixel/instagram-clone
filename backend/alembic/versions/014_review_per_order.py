"""Migration 014: unique review per order."""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "014_review_per_order"
down_revision: Union[str, None] = "013_orders_and_payments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_REVIEW_ORDER_WHERE = sa.text("post_type = 'review' AND order_id IS NOT NULL")


def upgrade() -> None:
    op.create_index(
        "uq_posts_review_order_id",
        "posts",
        ["order_id"],
        unique=True,
        sqlite_where=_REVIEW_ORDER_WHERE,
        postgresql_where=_REVIEW_ORDER_WHERE,
    )


def downgrade() -> None:
    op.drop_index("uq_posts_review_order_id", table_name="posts")
