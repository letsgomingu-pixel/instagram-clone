"""Core API integration tests — auth, posts, social features."""
import io
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)

SEED_EMAIL = "letsgomingu@gmail.com"
SEED_PASSWORD = "12345"


def _login(username: str = SEED_EMAIL, password: str = SEED_PASSWORD) -> dict:
    r = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_image_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (100, 100), color="red").save(buf, format="JPEG")
    return buf.getvalue()


def _make_video_bytes() -> bytes:
    fixture = Path(__file__).resolve().parents[2] / "e2e" / "fixtures" / "test-video.mp4"
    if fixture.exists():
        return fixture.read_bytes()
    header = b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2mp41"
    return header + b"\x00" * 4096


@pytest.fixture
def auth_headers():
    return _login()


# ── Health & Auth ──────────────────────────────────────────────────────────


def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_with_email():
    r = client.post(
        "/api/v1/auth/login",
        json={"username": SEED_EMAIL, "password": SEED_PASSWORD},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["username"] == "letsgomingu"


def test_login_with_username():
    r = client.post(
        "/api/v1/auth/login",
        json={"username": "letsgomingu", "password": SEED_PASSWORD},
    )
    assert r.status_code == 200
    assert r.json()["user"]["username"] == "letsgomingu"


def test_login_invalid_password():
    r = client.post(
        "/api/v1/auth/login",
        json={"username": SEED_EMAIL, "password": "wrong"},
    )
    assert r.status_code == 401


def test_register_and_me():
    suffix = "testuser99"
    r = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"{suffix}@example.com",
            "username": suffix,
            "full_name": "Test User",
            "password": "password123",
        },
    )
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["username"] == suffix


def test_register_duplicate_username():
    r = client.post(
        "/api/v1/auth/register",
        json={
            "email": "other@example.com",
            "username": "letsgomingu",
            "full_name": "Dup",
            "password": "password123",
        },
    )
    assert r.status_code == 400


def test_check_username():
    r = client.get("/api/v1/users/check-username", params={"username": "letsgomingu"})
    assert r.status_code == 200
    assert r.json()["available"] is False

    r2 = client.get("/api/v1/users/check-username", params={"username": "brand_new_user"})
    assert r2.status_code == 200
    assert r2.json()["available"] is True


# ── Users & Profile ────────────────────────────────────────────────────────


def test_get_profile(auth_headers):
    r = client.get("/api/v1/users/alice_kim", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "alice_kim"
    assert "post_count" in body
    assert "is_following" in body


def test_suggested_users(auth_headers):
    r = client.get("/api/v1/users/suggested", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert len(body) >= 1
    assert "username" in body[0]
    assert "reason" in body[0]


def test_suggested_users_guest():
    r = client.get("/api/v1/users/suggested")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1


def test_follow_unfollow(auth_headers):
    # bob_lee id is typically 3 in seed
    profile = client.get("/api/v1/users/bob_lee", headers=auth_headers).json()
    user_id = profile["id"]

    r = client.post(f"/api/v1/users/{user_id}/follow", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["is_following"] is True

    r2 = client.delete(f"/api/v1/users/{user_id}/follow", headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["is_following"] is False


def test_update_profile(auth_headers):
    r = client.put(
        "/api/v1/users/me",
        headers=auth_headers,
        json={"full_name": "Pytest User", "bio": "API test bio", "website": "https://example.com"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["full_name"] == "Pytest User"
    assert body["bio"] == "API test bio"
    assert body["website"] == "https://example.com"


def test_upload_avatar(auth_headers):
    r = client.post(
        "/api/v1/users/me/avatar",
        headers=auth_headers,
        files={"avatar": ("avatar.jpg", _make_image_bytes(), "image/jpeg")},
    )
    assert r.status_code == 200, r.text
    assert r.json()["avatar_url"].startswith("/media/avatars/")


def test_upload_avatar_octet_stream(auth_headers):
    r = client.post(
        "/api/v1/users/me/avatar",
        headers=auth_headers,
        files={"avatar": ("avatar.jpg", _make_image_bytes(), "application/octet-stream")},
    )
    assert r.status_code == 200, r.text
    assert r.json()["avatar_url"].startswith("/media/avatars/")


def test_follow_creates_notification():
    suffix = "follownotify01"
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"{suffix}@example.com",
            "username": suffix,
            "full_name": "Follow Notify",
            "password": "password123",
        },
    )
    assert reg.status_code == 201, reg.text
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    bob = client.get("/api/v1/users/bob_lee", headers=headers).json()
    follow = client.post(f"/api/v1/users/{bob['id']}/follow", headers=headers)
    assert follow.status_code == 200

    bob_headers = _login("bob_lee", SEED_PASSWORD)
    notes = client.get("/api/v1/notifications?tab=you", headers=bob_headers).json()
    assert any(
        n["type"] == "follow" and n["actor"]["username"] == suffix for n in notes
    ), notes


def test_messages_mark_read(auth_headers):
    convs = client.get("/api/v1/conversations", headers=auth_headers).json()
    mike = next((c for c in convs if c["participant"]["username"] == "mike_jung"), None)
    assert mike is not None
    assert mike["unread_count"] >= 1

    me = client.get("/api/v1/auth/me", headers=auth_headers).json()
    detail = client.get("/api/v1/conversations/mike_jung/messages", headers=auth_headers)
    assert detail.status_code == 200
    for msg in detail.json()["messages"]:
        if msg["sender_id"] != me["id"]:
            assert msg["is_read"] is True

    convs_after = client.get("/api/v1/conversations", headers=auth_headers).json()
    mike_after = next(c for c in convs_after if c["participant"]["username"] == "mike_jung")
    assert mike_after["unread_count"] == 0


def test_invalid_notification_tab(auth_headers):
    r = client.get("/api/v1/notifications?tab=invalid", headers=auth_headers)
    assert r.status_code == 400


def test_user_posts_reels_tagged(auth_headers):
    for path in (
        "/api/v1/users/letsgomingu/posts",
        "/api/v1/users/letsgomingu/reels",
        "/api/v1/users/letsgomingu/tagged",
    ):
        r = client.get(path, headers=auth_headers)
        assert r.status_code == 200, f"{path}: {r.text}"
        body = r.json()
        assert "items" in body
        assert "total" in body


# ── Posts ──────────────────────────────────────────────────────────────────


def test_feed(auth_headers):
    r = client.get("/api/v1/posts/feed", params={"page": 1, "limit": 4}, headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body["items"]) > 0
    assert body["next_page"] is not None
    post = body["items"][0]
    assert "user" in post
    assert "is_liked" in post

    r2 = client.get("/api/v1/posts/feed", params={"page": 2, "limit": 4}, headers=auth_headers)
    assert r2.status_code == 200
    assert len(r2.json()["items"]) == 4


def test_explore():
    r = client.get("/api/v1/posts/explore")
    assert r.status_code == 200
    assert len(r.json()["items"]) > 0


def test_get_post_detail(auth_headers):
    created = client.post(
        "/api/v1/posts",
        headers=auth_headers,
        files={"image": ("test.jpg", _make_image_bytes(), "image/jpeg")},
        data={"caption": "detail test"},
    )
    assert created.status_code == 201
    post_id = created.json()["id"]

    r = client.get(f"/api/v1/posts/{post_id}", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == post_id
    assert isinstance(body.get("comments"), list)
    assert isinstance(body.get("media"), list)
    assert len(body["media"]) >= 1


def test_post_likes_list(auth_headers):
    created = client.post(
        "/api/v1/posts",
        headers=auth_headers,
        files={"image": ("test.jpg", _make_image_bytes(), "image/jpeg")},
    )
    assert created.status_code == 201
    post_id = created.json()["id"]

    liked = client.post(f"/api/v1/posts/{post_id}/like", headers=auth_headers)
    assert liked.status_code == 200

    r = client.get(f"/api/v1/posts/{post_id}/likes", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert "username" in body["items"][0]


def test_post_comments_list(auth_headers):
    created = client.post(
        "/api/v1/posts",
        headers=auth_headers,
        files={"image": ("test.jpg", _make_image_bytes(), "image/jpeg")},
    )
    assert created.status_code == 201
    post_id = created.json()["id"]

    client.post(
        f"/api/v1/posts/{post_id}/comments",
        headers=auth_headers,
        json={"content": "목록 테스트"},
    )

    r = client.get(f"/api/v1/posts/{post_id}/comments", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_delete_comment(auth_headers):
    created = client.post(
        "/api/v1/posts",
        headers=auth_headers,
        files={"image": ("test.jpg", _make_image_bytes(), "image/jpeg")},
    )
    assert created.status_code == 201
    post_id = created.json()["id"]

    created_comment = client.post(
        f"/api/v1/posts/{post_id}/comments",
        headers=auth_headers,
        json={"content": "삭제 테스트 댓글"},
    )
    assert created_comment.status_code == 201
    comment_id = created_comment.json()["id"]
    deleted = client.delete(f"/api/v1/posts/{post_id}/comments/{comment_id}", headers=auth_headers)
    assert deleted.status_code == 204


def test_toggle_like(auth_headers):
    r1 = client.post("/api/v1/posts/2/like", headers=auth_headers)
    assert r1.status_code == 200
    liked = r1.json()["is_liked"]
    count1 = r1.json()["like_count"]

    r2 = client.post("/api/v1/posts/2/like", headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["is_liked"] is not liked
    if liked:
        assert r2.json()["like_count"] == count1 - 1


def test_toggle_save(auth_headers):
    r = client.post("/api/v1/posts/2/save", headers=auth_headers)
    assert r.status_code == 200
    assert "is_saved" in r.json()

    saved = client.get("/api/v1/posts/saved", headers=auth_headers)
    assert saved.status_code == 200


def test_add_comment(auth_headers):
    r = client.post(
        "/api/v1/posts/1/comments",
        headers=auth_headers,
        json={"content": "API 테스트 댓글"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["content"] == "API 테스트 댓글"
    assert "user" in body


def test_create_post(auth_headers):
    r = client.post(
        "/api/v1/posts",
        headers=auth_headers,
        files={"image": ("test.jpg", _make_image_bytes(), "image/jpeg")},
        data={"caption": "pytest upload", "location": "Seoul"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["caption"] == "pytest upload"
    assert body["image_url"].startswith("/media/posts/")
    assert len(body["media"]) == 1
    assert body["media"][0]["media_type"] == "image"


# ── Stories, Reels ─────────────────────────────────────────────────────────


def test_stories_feed(auth_headers):
    r = client.get("/api/v1/stories/feed", headers=auth_headers)
    assert r.status_code == 200
    stories = r.json()
    assert isinstance(stories, list)
    if stories:
        assert "items" in stories[0]
        story_id = stories[0]["id"]
        view = client.post(f"/api/v1/stories/{story_id}/view", headers=auth_headers)
        assert view.status_code == 200


def test_create_story(auth_headers):
    own_before = next(
        s for s in client.get("/api/v1/stories/feed", headers=auth_headers).json()
        if s["user"]["username"] == "letsgomingu"
    )
    items_before = len(own_before["items"])

    r = client.post(
        "/api/v1/stories",
        headers=auth_headers,
        files={"media": ("story.jpg", _make_image_bytes(), "image/jpeg")},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["user"]["username"] == "letsgomingu"
    assert len(body["items"]) == items_before + 1
    assert body["items"][-1]["image_url"].startswith("/media/stories/")
    assert body["items"][-1]["media_type"] == "image"


def test_create_story_with_overlays(auth_headers):
    overlays = [
        {
            "id": "t1",
            "type": "text",
            "content": "Hello Story",
            "x": 50,
            "y": 40,
            "color": "#ffffff",
            "font_size": 28,
        },
        {
            "id": "s1",
            "type": "sticker",
            "content": "🔥",
            "x": 60,
            "y": 60,
        },
    ]
    r = client.post(
        "/api/v1/stories",
        headers=auth_headers,
        data={"overlays": json.dumps(overlays)},
        files={"media": ("story.jpg", _make_image_bytes(), "image/jpeg")},
    )
    assert r.status_code == 201, r.text
    item = r.json()["items"][-1]
    assert len(item["overlays"]) == 2
    assert item["overlays"][0]["content"] == "Hello Story"
    assert item["overlays"][1]["content"] == "🔥"


def test_create_story_video(auth_headers):
    r = client.post(
        "/api/v1/stories",
        headers=auth_headers,
        files={"media": ("story.mp4", _make_video_bytes(), "video/mp4")},
    )
    assert r.status_code == 201, r.text
    item = r.json()["items"][-1]
    assert item["media_type"] == "video"
    assert item["image_url"].startswith("/media/stories/")
    assert item["image_url"].endswith((".mp4", ".webm", ".mov"))


def test_reels_feed(auth_headers):
    r = client.get("/api/v1/reels/feed", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()["items"]) > 0

    reel_id = r.json()["items"][0]["id"]
    like = client.post(f"/api/v1/reels/{reel_id}/like", headers=auth_headers)
    assert like.status_code == 200
    view = client.post(f"/api/v1/reels/{reel_id}/view", headers=auth_headers)
    assert view.status_code == 200


def test_user_settings(auth_headers):
    r = client.get("/api/v1/users/me/settings", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "notify_likes" in body

    upd = client.put(
        "/api/v1/users/me/settings",
        headers=auth_headers,
        json={"notify_likes": False, "is_private": True, "comments_privacy": "followers"},
    )
    assert upd.status_code == 200, upd.text
    updated = upd.json()
    assert updated["notify_likes"] is False
    assert updated["is_private"] is True
    assert updated["comments_privacy"] == "followers"

    restore = client.put(
        "/api/v1/users/me/settings",
        headers=auth_headers,
        json={"notify_likes": True, "is_private": False, "comments_privacy": "everyone"},
    )
    assert restore.status_code == 200


def test_change_password(auth_headers):
    r = client.put(
        "/api/v1/users/me/password",
        headers=auth_headers,
        json={"current_password": "wrong", "new_password": "newpass12"},
    )
    assert r.status_code == 400

    ok = client.put(
        "/api/v1/users/me/password",
        headers=auth_headers,
        json={"current_password": SEED_PASSWORD, "new_password": "newpass12"},
    )
    assert ok.status_code == 204

    login_new = client.post(
        "/api/v1/auth/login",
        json={"username": SEED_EMAIL, "password": "newpass12"},
    )
    assert login_new.status_code == 200

    # Restore seed password for other tests (12345 is shorter than API min length)
    from app.database import SessionLocal
    from app.models import User
    from app.utils.security import hash_password

    db = SessionLocal()
    try:
        user = db.get(User, 1)
        assert user is not None
        user.password_hash = hash_password(SEED_PASSWORD)
        db.commit()
    finally:
        db.close()


def test_create_reel(auth_headers):
    r = client.post(
        "/api/v1/reels",
        headers=auth_headers,
        files={"video": ("clip.mp4", _make_video_bytes(), "video/mp4")},
        data={"caption": "pytest reel", "audio_name": "Test audio"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["caption"] == "pytest reel"
    assert body["video_url"].startswith("/media/reels/")
    assert body["thumbnail_url"].startswith("/media/reels/")


def test_security_login_sessions(auth_headers):
    r = client.get("/api/v1/users/me/security", headers=auth_headers)
    assert r.status_code == 200, r.text
    summary = r.json()
    assert "login_email_alerts" in summary
    assert "two_factor_enabled" in summary

    sessions = client.get("/api/v1/users/me/login-sessions", headers=auth_headers)
    assert sessions.status_code == 200, sessions.text
    body = sessions.json()
    assert isinstance(body, list)
    assert len(body) >= 1
    current = next(item for item in body if item["is_current"])
    assert current["device_name"]

    alerts = client.put(
        "/api/v1/users/me/security/login-email-alerts",
        headers=auth_headers,
        json={"enabled": False},
    )
    assert alerts.status_code == 200
    assert alerts.json()["login_email_alerts"] is False

    restore = client.put(
        "/api/v1/users/me/security/login-email-alerts",
        headers=auth_headers,
        json={"enabled": True},
    )
    assert restore.status_code == 200
    assert restore.json()["login_email_alerts"] is True

    trust = client.patch(
        f"/api/v1/users/me/login-sessions/{current['id']}",
        headers=auth_headers,
        json={"is_trusted": True},
    )
    assert trust.status_code == 200
    assert trust.json()["is_trusted"] is True

    untrust = client.patch(
        f"/api/v1/users/me/login-sessions/{current['id']}",
        headers=auth_headers,
        json={"is_trusted": False},
    )
    assert untrust.status_code == 200
    assert untrust.json()["is_trusted"] is False


def test_two_factor_auth(auth_headers):
    import pyotp

    setup = client.post("/api/v1/users/me/security/2fa/setup", headers=auth_headers)
    assert setup.status_code == 200, setup.text
    secret = setup.json()["secret"]
    code = pyotp.TOTP(secret).now()

    enable = client.post(
        "/api/v1/users/me/security/2fa/enable",
        headers=auth_headers,
        json={"code": code},
    )
    assert enable.status_code == 200, enable.text
    assert enable.json()["two_factor_enabled"] is True

    blocked = client.post(
        "/api/v1/auth/login",
        json={"username": SEED_EMAIL, "password": SEED_PASSWORD},
    )
    assert blocked.status_code == 403
    assert blocked.json()["detail"]["requires_2fa"] is True

    ok = client.post(
        "/api/v1/auth/login",
        json={
            "username": SEED_EMAIL,
            "password": SEED_PASSWORD,
            "totp_code": pyotp.TOTP(secret).now(),
        },
    )
    assert ok.status_code == 200, ok.text

    disable = client.request(
        "DELETE",
        "/api/v1/users/me/security/2fa",
        headers=auth_headers,
        json={"password": SEED_PASSWORD, "code": pyotp.TOTP(secret).now()},
    )
    assert disable.status_code == 200, disable.text
    assert disable.json()["two_factor_enabled"] is False


# ── Messages & Notifications ───────────────────────────────────────────────


def test_conversations(auth_headers):
    r = client.get("/api/v1/conversations", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) > 0


def test_send_message(auth_headers):
    r = client.post(
        "/api/v1/conversations/alice_kim/messages",
        headers=auth_headers,
        json={"content": "pytest message"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["content"] == "pytest message"


def test_notifications(auth_headers):
    for tab in ("you", "following"):
        r = client.get(f"/api/v1/notifications?tab={tab}", headers=auth_headers)
        assert r.status_code == 200, tab
        notes = r.json()
        assert isinstance(notes, list)
        if notes and tab == "following":
            assert notes[0].get("target_username") is not None or notes[0].get("post_id") is None

    notes = client.get("/api/v1/notifications?tab=you", headers=auth_headers).json()
    if notes:
        nid = notes[0]["id"]
        patch = client.patch(
            f"/api/v1/notifications/{nid}/read",
            headers=auth_headers,
            json={"is_read": True},
        )
        assert patch.status_code == 200
        assert patch.json()["is_read"] is True


def test_search_users(auth_headers):
    r = client.get("/api/v1/search/users?q=alice", headers=auth_headers)
    assert r.status_code == 200
    assert any(u["username"] == "alice_kim" for u in r.json())


def test_unauthorized_feed():
    r = client.get("/api/v1/posts/feed")
    assert r.status_code == 401


def _admin_login() -> dict:
    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "pass123"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["is_admin"] is True
    return {"Authorization": f"Bearer {body['access_token']}"}


def test_admin_stats():
    headers = _admin_login()
    r = client.get("/api/v1/admin/stats", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "total_users" in data
    assert "total_posts" in data


def test_admin_users_and_posts():
    headers = _admin_login()
    users = client.get("/api/v1/admin/users", headers=headers)
    assert users.status_code == 200
    assert users.json()["total"] >= 1
    assert "created_at" in users.json()["items"][0]

    posts = client.get("/api/v1/admin/posts", headers=headers)
    assert posts.status_code == 200
    assert posts.json()["total"] >= 1

    post_id = posts.json()["items"][0]["id"]
    deleted = client.delete(f"/api/v1/admin/posts/{post_id}", headers=headers)
    assert deleted.status_code == 200


def test_admin_forbidden_for_regular_user(auth_headers):
    r = client.get("/api/v1/admin/stats", headers=auth_headers)
    assert r.status_code == 403
