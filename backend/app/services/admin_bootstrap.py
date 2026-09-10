from sqlalchemy import select

from app.constants.shipping import DEFAULT_SHIPPING
from app.database import SessionLocal
from app.models import User, UserSettings
from app.services.settings import get_or_create_settings
from app.utils.security import hash_password, verify_password

ADMIN_USERNAME = "fishmonger"
LEGACY_ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "letsgomingu@gmail.com"
LEGACY_ADMIN_EMAIL = "admin@instagram.local"
ADMIN_PASSWORD = "pass123"
ADMIN_FULL_NAME = "관리자"

LEGACY_SEED_USERNAME = "letsgomingu"


def _release_email(db, email: str, *, except_user_id: int | None = None) -> bool:
    occupant = db.scalar(select(User).where(User.email == email))
    if not occupant or occupant.id == except_user_id:
        return False
    occupant.email = f"{occupant.username}.legacy@instagram.local"
    db.flush()
    return True


def ensure_admin_user() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.username == ADMIN_USERNAME))
        renamed = False
        if not user:
            legacy = db.scalar(select(User).where(User.username == LEGACY_ADMIN_USERNAME))
            if legacy:
                legacy.username = ADMIN_USERNAME
                user = legacy
                renamed = True
        if not user:
            user = db.scalar(select(User).where(User.email == LEGACY_ADMIN_EMAIL))
        if not user:
            user = db.scalar(select(User).where(User.is_admin.is_(True)))

        if user:
            changed = renamed
            if not user.is_admin:
                user.is_admin = True
                changed = True
            if not user.is_active:
                user.is_active = True
                changed = True
            if user.username != ADMIN_USERNAME:
                user.username = ADMIN_USERNAME
                changed = True
            if user.email != ADMIN_EMAIL:
                if _release_email(db, ADMIN_EMAIL, except_user_id=user.id):
                    changed = True
                user.email = ADMIN_EMAIL
                changed = True
            if not verify_password(ADMIN_PASSWORD, user.password_hash):
                user.password_hash = hash_password(ADMIN_PASSWORD)
                changed = True

            settings = db.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
            if settings and settings.two_factor_enabled:
                settings.two_factor_enabled = False
                settings.two_factor_secret = None
                changed = True

            if changed:
                db.commit()
            return

        _release_email(db, ADMIN_EMAIL)
        user = User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            full_name=ADMIN_FULL_NAME,
            is_admin=True,
            is_active=True,
            **DEFAULT_SHIPPING,
        )
        db.add(user)
        db.flush()
        get_or_create_settings(db, user, commit=False)
        db.commit()
    finally:
        db.close()


def remove_legacy_seed_test_user() -> None:
    """Remove the public demo login account (letsgomingu/12345) when disabled."""
    db = SessionLocal()
    try:
        user = db.scalar(
            select(User).where(
                User.username == LEGACY_SEED_USERNAME,
                User.is_admin.is_(False),
            )
        )
        if not user:
            return
        db.delete(user)
        db.commit()
    finally:
        db.close()
