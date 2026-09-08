"""Delete all users except admin accounts (hard delete with DB cascades)."""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.database import SessionLocal
from app.models import User


def purge_non_admin_users(*, yes: bool = False) -> int:
    db = SessionLocal()
    try:
        non_admin = db.scalars(select(User).where(User.is_admin.is_(False)).order_by(User.id)).all()
        if not non_admin:
            print("[OK] No non-admin users to delete.")
            return 0

        print(f"Will delete {len(non_admin)} user(s):")
        for user in non_admin:
            print(f"  - id={user.id} @{user.username} ({user.email})")

        if not yes:
            confirm = input("Type 'yes' to confirm: ")
            if confirm.strip().lower() != "yes":
                print("Aborted.")
                return 1

        for user in non_admin:
            db.delete(user)
        db.commit()

        from sqlalchemy import func

        admin_users = db.scalars(select(User).where(User.is_admin.is_(True)).order_by(User.id)).all()
        admin_count = db.scalar(select(func.count()).select_from(User).where(User.is_admin.is_(True))) or 0
        print(f"[OK] Deleted {len(non_admin)} user(s). {admin_count} admin account(s) kept.")
        for admin in admin_users:
            print(f"  - kept @{admin.username}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Delete all non-admin users")
    parser.add_argument("--yes", action="store_true", help="Skip confirmation prompt")
    args = parser.parse_args()
    raise SystemExit(purge_non_admin_users(yes=args.yes))
