"""Database initialization via Alembic migrations."""

from sqlalchemy import text

import app.models  # noqa: F401
from app.database import Base, engine
from app.migrations import upgrade


def init_db() -> None:
    """Apply all pending Alembic migrations (upgrade to head)."""
    upgrade("head")


def drop_db() -> None:
    """Drop all application tables and Alembic version (development reset only)."""
    Base.metadata.drop_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
