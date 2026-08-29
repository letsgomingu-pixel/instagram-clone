from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db_init import init_db
from app.routers import admin, auth, health, posts, reels, search, social, stories, users
from app.services.admin_bootstrap import ensure_admin_user, ensure_seed_test_user
from app.utils.media import ensure_media_dirs

init_db()
ensure_media_dirs()
if settings.seed_demo_users:
    ensure_admin_user()
    ensure_seed_test_user()

app = FastAPI(
    title="Instagram Clone API",
    description="FastAPI backend for Instagram clone",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

media_path = Path(settings.media_root)
media_path.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_path)), name="media")

prefix = "/api/v1"
app.include_router(health.router, prefix=prefix, tags=["health"])
app.include_router(auth.router, prefix=prefix)
app.include_router(users.router, prefix=prefix)
app.include_router(posts.router, prefix=prefix)
app.include_router(stories.router, prefix=prefix)
app.include_router(reels.router, prefix=prefix)
app.include_router(social.conversations_router, prefix=prefix)
app.include_router(social.notifications_router, prefix=prefix)
app.include_router(search.router, prefix=prefix)
app.include_router(admin.router, prefix=prefix)


@app.get("/")
def root():
    return {"message": "Instagram Clone API", "docs": "/docs"}
