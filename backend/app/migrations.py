"""Alembic helpers — DATABASE_URL from .env selects SQLite (local) or PostgreSQL (server)."""

from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config

from app.config import settings

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def escape_alembic_url(url: str) -> str:
    """Alembic ConfigParser treats % as interpolation; escape for special chars in passwords."""
    return url.replace("%", "%%")


def alembic_config() -> Config:
    cfg = Config(str(ALEMBIC_INI))
    cfg.set_main_option("sqlalchemy.url", escape_alembic_url(settings.database_url))
    return cfg


def migration_target_label() -> str:
    dialect = settings.database_dialect
    if settings.is_sqlite:
        return f"{dialect} ({settings.database_url})"
    # Hide credentials in logs for remote databases.
    return f"{dialect} ({settings.database_url.split('@')[-1]})"


def upgrade(revision: str = "head") -> None:
    print(f"[*] Alembic upgrade {revision} -> {migration_target_label()}")
    command.upgrade(alembic_config(), revision)
    print(f"[OK] Database schema at revision {revision}")
