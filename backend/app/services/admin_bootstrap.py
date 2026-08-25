from sqlalchemy import select

from app.database import SessionLocal
from app.models import User, UserSettings
from app.services.settings import get_or_create_settings
from app.utils.security import hash_password, verify_password

ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "admin@instagram.local"
ADMIN_PASSWORD = "pass123"
ADMIN_FULL_NAME = "관리자"

SEED_USERNAME = "letsgomingu"
SEED_EMAIL = "letsgomingu@gmail.com"
SEED_PASSWORD = "12345"
SEED_FULL_NAME = "민구"


def ensure_admin_user() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.username == ADMIN_USERNAME))
        if user:
            changed = False
            if not user.is_admin:
                user.is_admin = True
                changed = True
            if not user.is_active:
                user.is_active = True
                changed = True
            if changed:
                db.commit()
            return

        user = User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            full_name=ADMIN_FULL_NAME,
            is_admin=True,
            is_active=True,
        )
        db.add(user)
        db.flush()
        get_or_create_settings(db, user, commit=False)
        db.commit()
    finally:
        db.close()


def ensure_seed_test_user() -> None:
    """Keep the demo login account usable after password changes or failed tests."""
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.username == SEED_USERNAME))
        if not user:
            user = User(
                username=SEED_USERNAME,
                email=SEED_EMAIL,
                password_hash=hash_password(SEED_PASSWORD),
                full_name=SEED_FULL_NAME,
                is_active=True,
            )
            db.add(user)
            db.flush()
            get_or_create_settings(db, user, commit=False)
            db.commit()
            return

        changed = False
        if not verify_password(SEED_PASSWORD, user.password_hash):
            user.password_hash = hash_password(SEED_PASSWORD)
            changed = True
        if not user.is_active:
            user.is_active = True
            changed = True

        settings = db.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
        if settings and settings.two_factor_enabled:
            settings.two_factor_enabled = False
            settings.two_factor_secret = None
            changed = True

        if changed:
            db.commit()
    finally:
        db.close()
