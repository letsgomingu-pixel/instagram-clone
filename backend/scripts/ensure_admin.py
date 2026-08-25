"""Ensure default admin account exists."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.admin_bootstrap import ensure_admin_user

if __name__ == "__main__":
    ensure_admin_user()
    print("[OK] admin user ready: admin / pass123")
