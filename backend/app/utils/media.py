import uuid
from io import BytesIO
from pathlib import Path

import httpx
from fastapi import HTTPException, UploadFile
from PIL import Image, ImageDraw

from app.config import settings

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES
MAX_BYTES = settings.max_upload_size_mb * 1024 * 1024


def ensure_media_dirs() -> None:
    root = Path(settings.media_root)
    for sub in ("avatars", "posts", "stories", "reels"):
        (root / sub).mkdir(parents=True, exist_ok=True)


def save_image(upload: UploadFile, subdir: str) -> str:
    data = upload.file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_upload_size_mb}MB limit")
    if len(data) < 32:
        raise HTTPException(status_code=400, detail="Invalid image file")

    ensure_media_dirs()
    filename = f"{uuid.uuid4().hex}.jpg"
    dest = Path(settings.media_root) / subdir / filename

    try:
        with Image.open(BytesIO(data)) as img:
            img = img.convert("RGB")
            img.save(dest, format="JPEG", quality=85)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid image file") from exc

    return f"/media/{subdir}/{filename}"


def save_video(upload: UploadFile, subdir: str) -> str:
    if upload.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported video type")

    data = upload.file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_upload_size_mb}MB limit")
    if len(data) < 1024:
        raise HTTPException(status_code=400, detail="Invalid video file")

    ensure_media_dirs()
    ext = {
        "video/mp4": ".mp4",
        "video/webm": ".webm",
        "video/quicktime": ".mov",
    }.get(upload.content_type or "", ".mp4")
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = Path(settings.media_root) / subdir / filename
    dest.write_bytes(data)
    return f"/media/{subdir}/{filename}"


def save_story_media(upload: UploadFile, subdir: str = "stories") -> tuple[str, str]:
    content_type = upload.content_type or ""
    if content_type.startswith("video/"):
        return save_video(upload, subdir), "video"
    if content_type.startswith("image/"):
        return save_image(upload, subdir), "image"
    raise HTTPException(status_code=400, detail="Unsupported media type")


def save_post_media(upload: UploadFile, subdir: str = "posts") -> tuple[str, str]:
    return save_story_media(upload, subdir)


def save_reel_placeholder_thumbnail(subdir: str = "reels") -> str:
    ensure_media_dirs()
    filename = f"{uuid.uuid4().hex}.jpg"
    dest = Path(settings.media_root) / subdir / filename
    with Image.new("RGB", (480, 854), color=(38, 38, 38)) as img:
        img.save(dest, format="JPEG", quality=85)
    return f"/media/{subdir}/{filename}"


def _seed_color(seed: str) -> tuple[int, int, int]:
    value = abs(hash(seed))
    return ((value * 7) % 196 + 40, (value * 13) % 196 + 40, (value * 23) % 196 + 40)


def _write_gradient_placeholder(seed: str, width: int, height: int, dest: Path) -> None:
    base = _seed_color(seed)
    accent = _seed_color(f"{seed}-accent")
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)
    for y in range(height):
        t = y / max(height - 1, 1)
        color = (
            int(base[0] * (1 - t) + accent[0] * t),
            int(base[1] * (1 - t) + accent[1] * t),
            int(base[2] * (1 - t) + accent[2] * t),
        )
        draw.line([(0, y), (width, y)], fill=color)
    img.save(dest, format="JPEG", quality=85)


def _bundled_seed_asset(seed: str, width: int, height: int, dest: Path) -> bool:
    safe_seed = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in seed)
    filename = f"seed-{safe_seed}-{width}x{height}.jpg"
    bundled = Path(__file__).resolve().parent.parent.parent / "seed_assets" / dest.parent.name / filename
    if not bundled.is_file():
        return False
    dest.write_bytes(bundled.read_bytes())
    return True


def _download_picsum_photo(seed: str, width: int, height: int, dest: Path) -> bool:
    url = f"https://picsum.photos/seed/{seed}/{width}/{height}"
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            if len(response.content) < 1024:
                return False
            with Image.open(BytesIO(response.content)) as img:
                img = img.convert("RGB")
                if img.size != (width, height):
                    img = img.resize((width, height), Image.Resampling.LANCZOS)
                img.save(dest, format="JPEG", quality=85)
        return True
    except Exception:
        return False


def create_seed_image(
    seed: str,
    subdir: str,
    width: int,
    height: int,
    *,
    force: bool = False,
) -> str:
    """Download a deterministic photo locally for seed/demo content."""
    ensure_media_dirs()
    safe_seed = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in seed)
    filename = f"seed-{safe_seed}-{width}x{height}.jpg"
    dest = Path(settings.media_root) / subdir / filename
    if force or not dest.exists():
        if _bundled_seed_asset(seed, width, height, dest):
            pass
        elif not _download_picsum_photo(seed, width, height, dest):
            _write_gradient_placeholder(seed, width, height, dest)
    return f"/media/{subdir}/{filename}"
