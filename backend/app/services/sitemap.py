from datetime import datetime, timezone
from urllib.parse import quote
from xml.sax.saxutils import escape

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Hashtag, Post, PostHashtag, Reel, User, UserSettings

SITE_ORIGIN = "https://www.iamnotafishmonger.com"
MAX_POSTS = 20_000
MAX_PROFILES = 10_000
MAX_REELS = 10_000
MAX_HASHTAGS = 5_000

STATIC_URLS: list[tuple[str, str, str]] = [
    ("/", "daily", "1.0"),
    ("/explore", "daily", "0.9"),
    ("/search", "daily", "0.8"),
    ("/reels", "daily", "0.8"),
    ("/info/about", "monthly", "0.7"),
    ("/info/wholesale", "monthly", "0.8"),
    ("/info/retail", "monthly", "0.8"),
    ("/info/help", "monthly", "0.5"),
    ("/info/terms", "yearly", "0.3"),
    ("/info/privacy", "yearly", "0.3"),
    ("/login", "monthly", "0.4"),
    ("/signup", "monthly", "0.5"),
]


def _lastmod(dt: datetime | None) -> str:
    if dt is None:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d")


def _loc(path: str) -> str:
    encoded = "/".join(quote(part, safe="") for part in path.split("/"))
    return f"{SITE_ORIGIN}{encoded}"


def _url(path: str, *, lastmod: str, changefreq: str, priority: str) -> str:
    return (
        "  <url>\n"
        f"    <loc>{escape(_loc(path))}</loc>\n"
        f"    <lastmod>{escape(lastmod)}</lastmod>\n"
        f"    <changefreq>{escape(changefreq)}</changefreq>\n"
        f"    <priority>{escape(priority)}</priority>\n"
        "  </url>"
    )


def _public_user_clause():
    return or_(UserSettings.is_private.is_(False), UserSettings.user_id.is_(None))


def _public_posts(db: Session) -> list[str]:
    rows = db.execute(
        select(Post.id, Post.post_type, Post.created_at, Post.updated_at)
        .join(User, Post.user_id == User.id)
        .outerjoin(UserSettings, UserSettings.user_id == User.id)
        .where(
            User.is_active.is_(True),
            Post.is_archived.is_(False),
            _public_user_clause(),
        )
        .order_by(Post.created_at.desc(), Post.id.desc())
        .limit(MAX_POSTS)
    ).all()
    entries: list[str] = []
    for post_id, post_type, created_at, updated_at in rows:
        priority = {"product": "0.8", "review": "0.7"}.get(post_type or "standard", "0.6")
        entries.append(
            _url(
                f"/p/{post_id}",
                lastmod=_lastmod(updated_at or created_at),
                changefreq="weekly",
                priority=priority,
            )
        )
    return entries


def _public_profiles(db: Session) -> list[str]:
    rows = db.execute(
        select(User.username, User.created_at, User.updated_at)
        .outerjoin(UserSettings, UserSettings.user_id == User.id)
        .where(User.is_active.is_(True), _public_user_clause())
        .order_by(User.created_at.desc())
        .limit(MAX_PROFILES)
    ).all()
    return [
        _url(
            f"/profile/{username}",
            lastmod=_lastmod(updated_at or created_at),
            changefreq="weekly",
            priority="0.6",
        )
        for username, created_at, updated_at in rows
    ]


def _public_reels(db: Session) -> list[str]:
    rows = db.execute(
        select(Reel.id, Reel.created_at)
        .join(User, Reel.user_id == User.id)
        .outerjoin(UserSettings, UserSettings.user_id == User.id)
        .where(User.is_active.is_(True), _public_user_clause())
        .order_by(Reel.created_at.desc(), Reel.id.desc())
        .limit(MAX_REELS)
    ).all()
    return [
        _url(
            f"/reels/{reel_id}",
            lastmod=_lastmod(created_at),
            changefreq="weekly",
            priority="0.6",
        )
        for reel_id, created_at in rows
    ]


def _public_hashtags(db: Session) -> list[str]:
    rows = db.execute(
        select(Hashtag.name, func.max(Post.created_at))
        .join(PostHashtag, PostHashtag.hashtag_id == Hashtag.id)
        .join(Post, Post.id == PostHashtag.post_id)
        .join(User, Post.user_id == User.id)
        .outerjoin(UserSettings, UserSettings.user_id == User.id)
        .where(
            User.is_active.is_(True),
            Post.is_archived.is_(False),
            _public_user_clause(),
        )
        .group_by(Hashtag.id, Hashtag.name)
        .order_by(func.count(Post.id).desc())
        .limit(MAX_HASHTAGS)
    ).all()
    return [
        _url(
            f"/explore/tags/{name}",
            lastmod=_lastmod(latest),
            changefreq="weekly",
            priority="0.7",
        )
        for name, latest in rows
    ]


def build_content_sitemap(db: Session) -> str:
    today = _lastmod(None)
    entries = [
        _url(path, lastmod=today, changefreq=changefreq, priority=priority)
        for path, changefreq, priority in STATIC_URLS
    ]
    entries.extend(_public_posts(db))
    entries.extend(_public_profiles(db))
    entries.extend(_public_reels(db))
    entries.extend(_public_hashtags(db))
    body = "\n".join(entries)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{body}\n"
        "</urlset>\n"
    )
