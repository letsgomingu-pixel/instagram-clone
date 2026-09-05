"""Pytest setup — isolated DB with full seed data before app import."""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

TEST_DB = BACKEND_ROOT / ".test_db" / "pytest.sqlite"
TEST_DB.parent.mkdir(parents=True, exist_ok=True)
if TEST_DB.exists():
    TEST_DB.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ.setdefault("SEED_DEMO_USERS", "true")

from scripts.seed import seed

seed(reset=True)
