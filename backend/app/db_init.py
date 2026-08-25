"""Database initialization via Alembic migrations."""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text

import app.models  # noqa: F401
from app.config import settings
from app.database import Base, engine


def _alembic_config() -> Config:
    cfg = Config(str(Path(__file__).resolve().parent.parent / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", settings.database_url)
    return cfg


def init_db() -> None:
    """Apply all pending Alembic migrations (upgrade to head)."""
    command.upgrade(_alembic_config(), "head")


def drop_db() -> None:
    """Drop all application tables and Alembic version (development reset only)."""
    Base.metadata.drop_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
