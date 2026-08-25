"""Replace external picsum post/reel/story URLs with local media files."""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Post, Reel, StoryItem
from app.utils.media import create_seed_image

PICSUM_RE = re.compile(r"https://picsum\.photos/seed/([^/]+)/(\d+)/(\d+)")


def local_url_for_picsum(url: str, default_subdir: str, *, force: bool = False) -> str | None:
    match = PICSUM_RE.match(url)
    if not match:
        return None
    seed, width, height = match.group(1), int(match.group(2)), int(match.group(3))
    return create_seed_image(seed, default_subdir, width, height, force=force)


def local_url_for_seed_path(url: str, default_subdir: str, *, force: bool = False) -> str | None:
    prefix = f"/media/{default_subdir}/seed-"
    if not url.startswith(prefix) or not url.endswith(".jpg"):
        return None
    stem = url[len(prefix) : -len(".jpg")]
    if "-" not in stem:
        return None
    seed_part, size_part = stem.rsplit("-", 1)
    if "x" not in size_part:
        return None
    width_str, height_str = size_part.split("x", 1)
    if not (width_str.isdigit() and height_str.isdigit()):
        return None
    return create_seed_image(seed_part, default_subdir, int(width_str), int(height_str), force=force)


def refresh_media_urls() -> None:
    db = SessionLocal()
    updated = {"posts": 0, "reels": 0, "story_items": 0}
    try:
        for post in db.scalars(select(Post)).all():
            local = local_url_for_picsum(post.image_url, "posts", force=True)
            if not local:
                local = local_url_for_seed_path(post.image_url, "posts", force=True)
            if local:
                post.image_url = local
                updated["posts"] += 1

        for reel in db.scalars(select(Reel)).all():
            local = local_url_for_picsum(reel.thumbnail_url, "reels", force=True)
            if not local:
                local = local_url_for_seed_path(reel.thumbnail_url, "reels", force=True)
            if local:
                reel.thumbnail_url = local
                updated["reels"] += 1

        for item in db.scalars(select(StoryItem)).all():
            local = local_url_for_picsum(item.image_url, "stories", force=True)
            if not local:
                local = local_url_for_seed_path(item.image_url, "stories", force=True)
            if local:
                item.image_url = local
                updated["story_items"] += 1

        db.commit()
        print(
            "[OK] refreshed media URLs:",
            f"posts={updated['posts']}",
            f"reels={updated['reels']}",
            f"story_items={updated['story_items']}",
        )
    finally:
        db.close()


if __name__ == "__main__":
    refresh_media_urls()
