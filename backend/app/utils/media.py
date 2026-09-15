import logging
import shutil
import subprocess
import sys
import tempfile
import threading
import uuid
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import httpx
from fastapi import HTTPException, UploadFile
from PIL import Image, ImageDraw, ImageOps

from app.config import settings

_logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic", ".heif"}
VIDEO_EXTENSIONS = {".mp4", ".m4v", ".webm", ".mov"}
HEIC_BRANDS = {b"heic", b"heix", b"heif", b"mif1", b"msf1"}
MAX_IMAGE_BYTES = settings.max_upload_size_mb * 1024 * 1024
MAX_VIDEO_BYTES = settings.max_video_upload_size_mb * 1024 * 1024


def ensure_media_dirs() -> None:
    if settings.storage_backend == "s3":
        return
    root = Path(settings.media_root)
    for sub in ("avatars", "posts", "stories", "reels"):
        (root / sub).mkdir(parents=True, exist_ok=True)


@lru_cache
def _s3_client():
    import boto3

    return boto3.client("s3", region_name=settings.aws_region)


def _store_bytes(data: bytes, subdir: str, filename: str, content_type: str) -> str:
    """Persist bytes to whichever backend is configured and return the
    public URL the frontend should use to fetch it directly (no proxying
    through this API for either backend)."""
    if settings.storage_backend == "s3":
        from botocore.exceptions import BotoCoreError, ClientError

        key = f"{subdir}/{filename}"
        if not settings.aws_s3_bucket or not settings.media_cdn_base_url:
            raise HTTPException(
                status_code=500,
                detail="STORAGE_BACKEND=s3 but AWS_S3_BUCKET/MEDIA_CDN_BASE_URL are not set",
            )
        try:
            _s3_client().put_object(
                Bucket=settings.aws_s3_bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        except (BotoCoreError, ClientError) as exc:
            raise HTTPException(status_code=502, detail="Media upload failed") from exc
        return f"{settings.media_cdn_base_url.rstrip('/')}/{key}"

    ensure_media_dirs()
    dest = Path(settings.media_root) / subdir / filename
    dest.write_bytes(data)
    return f"/media/{subdir}/{filename}"


def _flatten_to_rgb(img: Image.Image) -> Image.Image:
    """JPEG has no alpha. Explorer shows transparent PNGs on white, so flatten
    onto white rather than Pillow's default black — otherwise a white-looking
    logo becomes a black circle and looks like the avatar never changed."""
    img = ImageOps.exif_transpose(img) or img
    if img.mode in {"RGBA", "LA"} or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        background = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        return Image.alpha_composite(background, rgba).convert("RGB")
    return img.convert("RGB")


def save_image(upload: UploadFile, subdir: str) -> str:
    data = upload.file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_upload_size_mb}MB limit")
    if len(data) < 32:
        raise HTTPException(status_code=400, detail="Invalid image file")

    if len(data) >= 12 and data[4:8] == b"ftyp" and data[8:12] in HEIC_BRANDS:
        raise HTTPException(status_code=400, detail="HEIC photos are not supported")

    try:
        with Image.open(BytesIO(data)) as img:
            img = _flatten_to_rgb(img)
            buffer = BytesIO()
            img.save(buffer, format="JPEG", quality=85)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid image file") from exc

    filename = f"{uuid.uuid4().hex}.jpg"
    return _store_bytes(buffer.getvalue(), subdir, filename, "image/jpeg")


def _normalize_video_content_type(upload: UploadFile) -> str:
    content_type = (upload.content_type or "").split(";")[0].strip().lower()
    if content_type in ALLOWED_VIDEO_TYPES:
        return content_type
    filename = (upload.filename or "").lower()
    ext_map = {
        ".mp4": "video/mp4",
        ".m4v": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
    }
    for ext, mime in ext_map.items():
        if filename.endswith(ext):
            return mime
    if content_type in {"", "application/octet-stream", "binary/octet-stream"}:
        return "video/mp4"
    raise HTTPException(status_code=400, detail="Unsupported video type")


def save_video(upload: UploadFile, subdir: str) -> str:
    data, ext, content_type = _prepared_video_from_upload(upload)
    filename = f"{uuid.uuid4().hex}{ext}"
    return _store_bytes(data, subdir, filename, content_type)


def save_reel_video(
    upload: UploadFile,
    thumbnail: UploadFile | None = None,
    subdir: str = "reels",
) -> tuple[str, str]:
    data, ext, content_type = _prepared_video_from_upload(upload)
    video_url = _store_bytes(data, subdir, f"{uuid.uuid4().hex}{ext}", content_type)
    if thumbnail is not None:
        return video_url, save_image(thumbnail, subdir)
    poster = extract_mp4_poster(data)
    if poster:
        return video_url, _store_bytes(poster, subdir, f"{uuid.uuid4().hex}.jpg", "image/jpeg")
    return video_url, save_reel_placeholder_thumbnail(subdir)


def _prepared_video_from_upload(upload: UploadFile) -> tuple[bytes, str, str]:
    content_type = _normalize_video_content_type(upload)

    data = upload.file.read()
    if len(data) > MAX_VIDEO_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Video exceeds {settings.max_video_upload_size_mb}MB limit",
        )
    if len(data) < 1024:
        raise HTTPException(status_code=400, detail="Invalid video file")

    ext = {
        "video/mp4": ".mp4",
        "video/webm": ".webm",
        "video/quicktime": ".mov",
    }.get(content_type, ".mp4")
    return _prepare_web_video(data, ext)


_CONTAINER_ATOMS = {b"moov", b"trak", b"mdia", b"minf", b"stbl", b"edts"}


def _iter_atoms(data: bytes, start: int = 0, end: int | None = None):
    pos = start
    stop = len(data) if end is None else end
    while pos + 8 <= stop:
        size = int.from_bytes(data[pos : pos + 4], "big")
        kind = data[pos + 4 : pos + 8]
        hdr = 8
        if size == 1:
            if pos + 16 > stop:
                break
            size = int.from_bytes(data[pos + 8 : pos + 16], "big")
            hdr = 16
        if size < hdr or pos + size > stop:
            break
        yield pos, size, kind, hdr
        pos += size


def _patch_chunk_offsets(moov: bytearray, delta: int) -> None:
    stack = [(8, len(moov))]
    while stack:
        start, stop = stack.pop()
        pos = start
        while pos + 8 <= stop:
            size = int.from_bytes(moov[pos : pos + 4], "big")
            kind = bytes(moov[pos + 4 : pos + 8])
            hdr = 8
            if size == 1:
                if pos + 16 > stop:
                    break
                size = int.from_bytes(moov[pos + 8 : pos + 16], "big")
                hdr = 16
            if size < hdr or pos + size > stop:
                break
            if kind in (b"stco", b"co64"):
                width = 4 if kind == b"stco" else 8
                count_at = pos + hdr + 4
                if count_at + 4 > pos + size:
                    pos += size
                    continue
                count = int.from_bytes(moov[count_at : count_at + 4], "big")
                cursor = count_at + 4
                for _ in range(count):
                    if cursor + width > pos + size:
                        break
                    value = int.from_bytes(moov[cursor : cursor + width], "big") + delta
                    moov[cursor : cursor + width] = value.to_bytes(width, "big")
                    cursor += width
            elif kind in _CONTAINER_ATOMS:
                stack.append((pos + hdr, pos + size))
            pos += size


def faststart_mp4(data: bytes) -> bytes:
    """Move the `moov` atom before `mdat` so browsers can start playback without
    downloading the whole file. Phone-camera MP4s often keep `moov` at the end,
    which shows up as a black Reels player until the entire video has loaded.
    """
    if len(data) < 16 or data[4:8] != b"ftyp":
        return data

    atoms = list(_iter_atoms(data))
    if not atoms:
        return data
    kinds = [kind for _, _, kind, _ in atoms]
    if b"moov" not in kinds or b"mdat" not in kinds:
        return data
    if kinds.index(b"moov") < kinds.index(b"mdat"):
        return data

    moov_pos, moov_size, _, _ = next(atom for atom in atoms if atom[2] == b"moov")
    moov = bytearray(data[moov_pos : moov_pos + moov_size])
    try:
        _patch_chunk_offsets(moov, moov_size)
    except Exception:
        return data

    parts = [data[pos : pos + size] for pos, size, kind, _ in atoms if kind != b"moov"]
    ftyp, rest = parts[0], parts[1:]
    return b"".join([ftyp, bytes(moov), *rest])


def _bytes_look_like_hevc(data: bytes) -> bool:
    sample = data[:65536] + data[-min(len(data), 2_000_000) :]
    return b"hvc1" in sample or b"hev1" in sample or b"dvh1" in sample


def _ffmpeg_exe() -> str | None:
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def _run_h264_ffmpeg(src: Path, dst: Path) -> bool:
    exe = _ffmpeg_exe()
    if not exe:
        _logger.warning("ffmpeg not available; cannot transcode HEVC for browser playback")
        return False
    common = [
        exe,
        "-y",
        "-i",
        str(src),
        "-c:v",
        "libx264",
        "-tag:v",
        "avc1",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "veryfast",
        "-crf",
        "26",
        "-vf",
        "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-movflags",
        "+faststart",
    ]
    attempts = [
        [*common, "-c:a", "aac", "-ac", "2", str(dst)],
        [*common, "-an", str(dst)],
    ]
    last_err = b""
    for cmd in attempts:
        if dst.exists():
            dst.unlink()
        try:
            result = subprocess.run(cmd, capture_output=True, timeout=600)
        except subprocess.TimeoutExpired:
            _logger.warning("ffmpeg transcode timed out")
            continue
        if result.returncode == 0 and dst.is_file() and dst.stat().st_size >= 1024:
            return True
        last_err = result.stderr or b""
    _logger.warning("ffmpeg transcode failed: %s", last_err[-500:] if last_err else "no stderr")
    return False


def _transcode_to_h264(data: bytes, src_suffix: str) -> bytes | None:
    suffix = src_suffix if src_suffix in {".mp4", ".m4v", ".mov", ".webm"} else ".mp4"
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / f"in{suffix}"
        dst = Path(tmp) / "out.mp4"
        src.write_bytes(data)
        if not _run_h264_ffmpeg(src, dst):
            return None
        return dst.read_bytes()


def extract_mp4_poster_from_path(src: Path) -> bytes | None:
    exe = _ffmpeg_exe()
    if not exe or not src.is_file():
        return None
    with tempfile.TemporaryDirectory() as tmp:
        dst = Path(tmp) / "poster.jpg"
        try:
            result = subprocess.run(
                [exe, "-y", "-ss", "0.2", "-i", str(src), "-frames:v", "1", "-q:v", "3", str(dst)],
                capture_output=True,
                timeout=30,
            )
        except subprocess.TimeoutExpired:
            return None
        if result.returncode != 0 or not dst.is_file() or dst.stat().st_size < 32:
            return None
        return dst.read_bytes()


def extract_mp4_poster(data: bytes) -> bytes | None:
    if len(data) < 1024:
        return None
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "in.mp4"
        src.write_bytes(data)
        return extract_mp4_poster_from_path(src)


def _prepare_web_video(data: bytes, ext: str) -> tuple[bytes, str, str]:
    """Make a browser-playable MP4. Chrome cannot play HEVC from iPhone cameras."""
    if ext == ".webm":
        return data, ext, "video/webm"
    if _bytes_look_like_hevc(data) or ext == ".mov":
        converted = _transcode_to_h264(data, ext)
        if converted:
            return converted, ".mp4", "video/mp4"
        if _bytes_look_like_hevc(data):
            _logger.error("HEVC video stored without H.264 transcode; Chrome will show a black reel")
    if ext in {".mp4", ".m4v", ".mov"}:
        data = faststart_mp4(data)
    content_type = {
        ".mp4": "video/mp4",
        ".m4v": "video/mp4",
        ".mov": "video/quicktime",
    }.get(ext, "video/mp4")
    return data, ext, content_type


def mp4_needs_faststart(path: Path) -> bool:
    try:
        with path.open("rb") as handle:
            while True:
                header = handle.read(8)
                if len(header) < 8:
                    return False
                size = int.from_bytes(header[:4], "big")
                kind = header[4:8]
                extra = 0
                if size == 1:
                    wide = handle.read(8)
                    if len(wide) < 8:
                        return False
                    size = int.from_bytes(wide, "big")
                    extra = 8
                if size < 8 + extra:
                    return False
                if kind == b"moov":
                    return False
                if kind == b"mdat":
                    return True
                handle.seek(size - 8 - extra, 1)
    except OSError:
        return False


def _public_media_url(path: Path) -> str:
    root = Path(settings.media_root).resolve()
    return f"/media/{path.resolve().relative_to(root).as_posix()}"


def _rewrite_reel_media(old_video_url: str, new_video_url: str, new_thumb_url: str | None) -> None:
    from sqlalchemy import select

    from app.database import SessionLocal
    from app.models.reel import Reel

    db = SessionLocal()
    try:
        reels = db.scalars(select(Reel).where(Reel.video_url == old_video_url)).all()
        for reel in reels:
            reel.video_url = new_video_url
            if new_thumb_url:
                reel.thumbnail_url = new_thumb_url
        db.commit()
    except Exception:
        db.rollback()
        _logger.exception("failed to rewrite reel urls from %s to %s", old_video_url, new_video_url)
    finally:
        db.close()


def _path_looks_like_hevc(path: Path) -> bool:
    try:
        size = path.stat().st_size
        with path.open("rb") as handle:
            head = handle.read(65536)
            if size > 2_000_000:
                handle.seek(max(size - 2_000_000, 0))
                tail = handle.read(2_000_000)
            else:
                tail = b""
        sample = head + tail
        return b"hvc1" in sample or b"hev1" in sample or b"dvh1" in sample
    except OSError:
        return False


def repair_local_mp4_faststart() -> None:
    if settings.storage_backend == "s3" or "pytest" in sys.modules:
        return
    root = Path(settings.media_root)
    if not root.is_dir():
        return
    if not _ffmpeg_exe():
        _logger.warning("ffmpeg not available; HEVC reels will stay black in Chrome")
    reel_root = root / "reels"
    targets = list(reel_root.glob("*.mp4")) if reel_root.is_dir() else []
    targets.extend(path for path in root.glob("**/*.mp4") if path.parent.name != "reels")
    for path in targets:
        try:
            transcode_hevc = path.parent.name == "reels" and _path_looks_like_hevc(path)
            if not transcode_hevc and not mp4_needs_faststart(path):
                continue
            if transcode_hevc:
                dst = path.with_name(f"{uuid.uuid4().hex}.mp4")
                if _run_h264_ffmpeg(path, dst):
                    poster = extract_mp4_poster_from_path(dst)
                    thumb_url = None
                    if poster:
                        thumb_path = path.with_name(f"{uuid.uuid4().hex}.jpg")
                        thumb_path.write_bytes(poster)
                        thumb_url = _public_media_url(thumb_path)
                    _rewrite_reel_media(_public_media_url(path), _public_media_url(dst), thumb_url)
                    path.unlink(missing_ok=True)
                    _logger.info("transcoded HEVC reel to H.264: %s -> %s", path.name, dst.name)
                    continue
            original = path.read_bytes()
            fixed = faststart_mp4(original)
            if fixed != original:
                path.write_bytes(fixed)
        except (OSError, subprocess.TimeoutExpired):
            continue


def start_local_mp4_repair() -> None:
    if "pytest" in sys.modules:
        return
    threading.Thread(target=repair_local_mp4_faststart, daemon=True, name="repair-mp4").start()




def _file_suffix(filename: str | None) -> str:
    return Path(filename or "").suffix.lower()


def detect_media_kind(header: bytes, content_type: str | None, filename: str | None) -> str:
    """Classify an upload from MIME, filename, or magic bytes.

    Mobile browsers (especially iOS) often send an empty or generic
    Content-Type. Relying on `image/*` / `video/*` prefixes alone dropped
    those files with 400 before they could be saved.
    """
    mime = (content_type or "").split(";")[0].strip().lower()
    suffix = _file_suffix(filename)

    if mime.startswith("video/") or suffix in VIDEO_EXTENSIONS:
        return "video"
    if mime.startswith("image/") or suffix in IMAGE_EXTENSIONS:
        return "image"

    if len(header) >= 12:
        if header[:3] == b"\xff\xd8\xff" or header[:8] == b"\x89PNG\r\n\x1a\n":
            return "image"
        if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
            return "image"
        if header[4:8] == b"ftyp":
            return "image" if header[8:12] in HEIC_BRANDS else "video"
        if header[:4] == b"\x1aE\xdf\xa3":
            return "video"

    if mime in {"", "application/octet-stream", "binary/octet-stream"}:
        raise HTTPException(status_code=400, detail="Unsupported media type")
    raise HTTPException(status_code=400, detail="Unsupported media type")


def save_story_media(upload: UploadFile, subdir: str = "stories") -> tuple[str, str]:
    header = upload.file.read(64)
    try:
        upload.file.seek(0)
    except OSError:
        pass
    kind = detect_media_kind(header, upload.content_type, upload.filename)
    if kind == "video":
        return save_video(upload, subdir), "video"
    return save_image(upload, subdir), "image"


def save_post_media(upload: UploadFile, subdir: str = "posts") -> tuple[str, str]:
    return save_story_media(upload, subdir)


def save_reel_placeholder_thumbnail(subdir: str = "reels") -> str:
    buffer = BytesIO()
    with Image.new("RGB", (480, 854), color=(38, 38, 38)) as img:
        img.save(buffer, format="JPEG", quality=85)
    filename = f"{uuid.uuid4().hex}.jpg"
    return _store_bytes(buffer.getvalue(), subdir, filename, "image/jpeg")


# NOTE: everything below is for local dev / demo seed data only (used by
# scripts/seed.py and the SEED_DEMO_USERS bootstrap) and intentionally
# always writes to local disk regardless of STORAGE_BACKEND — it never
# runs against a real S3-backed production deployment since seeding is
# off there.
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
    # Always ensures the *local* directory, unlike ensure_media_dirs() which
    # no-ops under STORAGE_BACKEND=s3 — this function only ever writes
    # locally (see module note above), so it needs the folder regardless.
    (Path(settings.media_root) / subdir).mkdir(parents=True, exist_ok=True)
    safe_seed = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in seed)
    filename = f"seed-{safe_seed}-{width}x{height}.jpg"
    dest = Path(settings.media_root) / subdir / filename
    if force or not dest.exists():
        if _bundled_seed_asset(seed, width, height, dest):
            pass
        elif not _download_picsum_photo(seed, width, height, dest):
            _write_gradient_placeholder(seed, width, height, dest)
    return f"/media/{subdir}/{filename}"
