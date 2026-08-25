"""SQLite schema initialization CLI."""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db_init import drop_db, init_db  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialize SQLite database schema (15 tables)")
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

    if args.reset:
        print("[!] Dropping all tables...")
        drop_db()

    print("[*] Running Alembic migrations (upgrade head)...")
    init_db()
    print("[OK] Migrations applied (15 tables, revision: 001_initial_schema_v2)")

    if args.seed:
        from scripts.seed import seed

        seed()


if __name__ == "__main__":
    main()
