"""Migration 012: products table and post_type for e-commerce feed."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "012_products_and_post_type"
down_revision: Union[str, None] = "011_user_shipping_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("posts") as batch_op:
        batch_op.add_column(
            sa.Column("post_type", sa.String(20), nullable=False, server_default="standard")
        )
        batch_op.add_column(sa.Column("reviewed_product_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("order_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("rating", sa.Integer(), nullable=True))

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("seller_id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column("storage_type", sa.String(30), nullable=False),
        sa.Column("availability", sa.String(20), nullable=False),
        sa.Column("season_start", sa.Date(), nullable=True),
        sa.Column("season_end", sa.Date(), nullable=True),
        sa.Column("stock", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("post_id", name="uq_product_post"),
    )
    op.create_index("ix_products_seller_id", "products", ["seller_id"])
    op.create_index("ix_products_post_id", "products", ["post_id"])

    with op.batch_alter_table("posts") as batch_op:
        batch_op.create_foreign_key(
            "fk_posts_reviewed_product_id",
            "products",
            ["reviewed_product_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.alter_column("post_type", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("posts") as batch_op:
        batch_op.drop_constraint("fk_posts_reviewed_product_id", type_="foreignkey")
        batch_op.drop_column("rating")
        batch_op.drop_column("order_id")
        batch_op.drop_column("reviewed_product_id")
        batch_op.drop_column("post_type")

    op.drop_index("ix_products_post_id", table_name="products")
    op.drop_index("ix_products_seller_id", table_name="products")
    op.drop_table("products")
