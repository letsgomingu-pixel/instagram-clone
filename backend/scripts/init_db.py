"""Database schema initialization CLI (SQLite or PostgreSQL via DATABASE_URL)."""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db_init import drop_db, init_db
from app.migrations import migration_target_label


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Initialize database schema via Alembic (uses DATABASE_URL from .env)"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop all tables before creating (destroys existing data)",
    )
    parser.add_argument(
        "--seed",
        action="store_true",
        help="Run seed script after schema creation",
    )
    args = parser.parse_args()

    print(f"[*] Database: {migration_target_label()}")

    if args.reset:
        print("[!] Dropping all tables...")
        drop_db()

    print("[*] Running Alembic migrations (upgrade head)...")
    init_db()

    if args.seed:
        from scripts.seed import seed

        seed()


if __name__ == "__main__":
    main()
