"""Alembic migration CLI wrapper."""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from alembic import command

from app.config import settings
from app.db_init import drop_db
from app.migrations import alembic_config, migration_target_label, upgrade


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run Alembic database migrations (SQLite local / PostgreSQL server via DATABASE_URL)"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("upgrade", help="Apply migrations (upgrade head)")
    sub.add_parser("downgrade", help="Revert all migrations (downgrade base)")
    sub.add_parser("current", help="Show current revision")
    sub.add_parser("history", help="Show migration history")
    sub.add_parser("check", help="Verify models match migrations")

    reset = sub.add_parser("reset", help="Drop all tables and re-apply migrations")
    reset.add_argument("--seed", action="store_true", help="Seed after reset")

    args = parser.parse_args()
    cfg = alembic_config()

    print(f"[*] Target: {migration_target_label()} (dialect={settings.database_dialect})")

    if args.command == "upgrade":
        upgrade("head")
    elif args.command == "downgrade":
        command.downgrade(cfg, "base")
        print("[OK] downgrade base")
    elif args.command == "current":
        command.current(cfg)
    elif args.command == "history":
        command.history(cfg)
    elif args.command == "check":
        command.check(cfg)
    elif args.command == "reset":
        print("[!] Dropping all tables...")
        drop_db()
        upgrade("head")
        if args.seed:
            from scripts.seed import seed

            seed(reset=True)
            print("[OK] Seed completed")


if __name__ == "__main__":
    main()
