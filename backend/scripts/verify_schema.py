"""Verify SQLite schema matches backend.md v2 (16 tables)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import sqlite3

from app.config import settings

EXPECTED_TABLES = {
    "comments",
    "conversations",
    "follows",
    "likes",
    "messages",
    "notifications",
    "post_tags",
    "posts",
    "reel_likes",
    "reels",
    "saved_posts",
    "stories",
    "story_items",
    "story_views",
    "user_settings",
    "users",
}


def db_path() -> str:
    url = settings.database_url
    if url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "", 1)
    raise ValueError(f"Unsupported DATABASE_URL: {url}")


def main() -> None:
    path = db_path()
    if not Path(path).exists():
        print(f"[FAIL] Database file not found: {path}")
        sys.exit(1)

    conn = sqlite3.connect(path)
    tables = {
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
    }

    missing = EXPECTED_TABLES - tables
    extra = tables - EXPECTED_TABLES

    print(f"Database: {path}")
    print(f"Tables ({len(tables)}): {', '.join(sorted(tables))}")

    if missing:
        print(f"[FAIL] Missing tables: {sorted(missing)}")
        sys.exit(1)
    if extra:
        print(f"[WARN] Extra tables: {sorted(extra)}")

    counts = {
        "users": conn.execute("SELECT COUNT(*) FROM users").fetchone()[0],
        "posts": conn.execute("SELECT COUNT(*) FROM posts").fetchone()[0],
        "reels": conn.execute("SELECT COUNT(*) FROM reels").fetchone()[0],
        "post_tags": conn.execute("SELECT COUNT(*) FROM post_tags").fetchone()[0],
        "messages": conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0],
        "notifications": conn.execute("SELECT COUNT(*) FROM notifications").fetchone()[0],
    }
    print("Row counts:", counts)
    print("[OK] Schema verification passed (16 app tables + alembic_version optional)")


if __name__ == "__main__":
    main()
