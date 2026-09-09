"""Migration 016: cart, order items, and order email preference."""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "016_cart_order_items_email"
down_revision: Union[str, None] = "015_order_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cart_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),
    )
    op.create_index("ix_cart_items_user_id", "cart_items", ["user_id"])

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Integer(), nullable=False),
        sa.Column("subtotal", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])

    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT id, product_id, quantity, unit_price, subtotal FROM orders"
        )
    ).fetchall()
    for row in rows:
        conn.execute(
            sa.text(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) "
                "VALUES (:order_id, :product_id, :quantity, :unit_price, :subtotal)"
            ),
            {
                "order_id": row[0],
                "product_id": row[1],
                "quantity": row[2],
                "unit_price": row[3],
                "subtotal": row[4],
            },
        )

    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.add_column(
            sa.Column("notify_orders_email", sa.Boolean(), nullable=False, server_default=sa.text("true"))
        )
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.alter_column("notify_orders_email", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.drop_column("notify_orders_email")

    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_table("order_items")

    op.drop_index("ix_cart_items_user_id", table_name="cart_items")
    op.drop_table("cart_items")
