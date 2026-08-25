"""Write Alembic initial migration file from model metadata."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from alembic.autogenerate import produce_migrations, render_python_code
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, pool

import app.models  # noqa: F401
from app.database import Base

MIGRATION_PATH = (
    Path(__file__).resolve().parent.parent
    / "alembic"
    / "versions"
    / "001_initial_schema_v2.py"
)


def main() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=pool.StaticPool,
    )

    with engine.connect() as connection:
        context = MigrationContext.configure(connection)
        revision = produce_migrations(context, Base.metadata)
        rendered = render_python_code(revision.upgrade_ops)
    rendered = rendered.replace("sa.text('now()')", "sa.text('(CURRENT_TIMESTAMP)')")

    header = '''"""initial schema v2 — 15 tables

Revision ID: 001_initial_schema_v2
Revises:
Create Date: 2026-08-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "001_initial_schema_v2"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
'''

    footer = '''

def downgrade() -> None:
    pass
'''

    MIGRATION_PATH.parent.mkdir(parents=True, exist_ok=True)
    MIGRATION_PATH.write_text(header + rendered + footer, encoding="utf-8")
    print(f"[OK] Wrote {MIGRATION_PATH} ({len(revision.upgrade_ops.ops)} operations)")


if __name__ == "__main__":
    main()
