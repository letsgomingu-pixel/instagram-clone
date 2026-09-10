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

SHIPPING_PAYLOAD = {
    "phone": "010-9876-5432",
    "postcode": "06234",
    "address_line1": "서울특별시 강남구 테헤란로 123",
    "address_line2": "101호",
}


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
            **SHIPPING_PAYLOAD,
        },
    )
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    body = me.json()
    assert body["username"] == suffix
    assert body["phone"] == SHIPPING_PAYLOAD["phone"]
    assert body["postcode"] == SHIPPING_PAYLOAD["postcode"]


def test_register_duplicate_username():
    r = client.post(
        "/api/v1/auth/register",
        json={
            "email": "other@example.com",
            "username": "letsgomingu",
            "full_name": "Dup",
            "password": "password123",
            **SHIPPING_PAYLOAD,
        },
    )
    assert r.status_code == 400


def test_register_requires_shipping_fields():
    r = client.post(
        "/api/v1/auth/register",
        json={
            "email": "noship@example.com",
            "username": "noshipuser01",
            "full_name": "No Ship",
            "password": "password123",
        },
    )
    assert r.status_code == 422


def test_update_shipping_address(auth_headers):
    r = client.put(
        "/api/v1/users/me",
        headers=auth_headers,
        json={
            "phone": "010-5555-6666",
            "postcode": "12345",
            "address_line1": "서울특별시 종로구 새문안로 1",
            "address_line2": "2층",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["phone"] == "010-5555-6666"
    assert body["postcode"] == "12345"
    assert body["address_line1"] == "서울특별시 종로구 새문안로 1"
    assert body["address_line2"] == "2층"


def test_shipping_hidden_from_other_profiles(auth_headers):
    suffix = "shiphide01"
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"{suffix}@example.com",
            "username": suffix,
            "full_name": "Ship Hide",
            "password": "password123",
            **SHIPPING_PAYLOAD,
        },
    )
    assert reg.status_code == 201, reg.text

    profile = client.get(f"/api/v1/users/{suffix}", headers=auth_headers).json()
    assert profile.get("phone") is None
    assert profile.get("postcode") is None


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
            **SHIPPING_PAYLOAD,
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
    admin_headers = _admin_login()
    _create_admin_product(admin_headers, name="피드테스트", price=25000)

    r = client.get(
        "/api/v1/posts/feed",
        params={"page": 1, "limit": 4, "tab": "products"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["items"]) > 0
    post = body["items"][0]
    assert post["post_type"] == "product"
    assert post["product"] is not None
    assert "user" in post
    assert "is_liked" in post

    if body.get("next_page"):
        r2 = client.get(
            "/api/v1/posts/feed",
            params={"page": 2, "limit": 4, "tab": "products"},
            headers=auth_headers,
        )
        assert r2.status_code == 200


def test_explore():
    admin_headers = _admin_login()
    _create_admin_product(admin_headers, name="탐색테스트", price=15000)

    r = client.get("/api/v1/posts/explore", params={"tab": "products"})
    assert r.status_code == 200
    assert len(r.json()["items"]) > 0


def test_get_post_detail(auth_headers):
    created = _create_test_post()
    post_id = created["id"]

    r = client.get(f"/api/v1/posts/{post_id}", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == post_id
    assert isinstance(body.get("comments"), list)
    assert isinstance(body.get("media"), list)
    assert len(body["media"]) >= 1


def test_post_likes_list(auth_headers):
    post_id = _create_test_post()["id"]

    liked = client.post(f"/api/v1/posts/{post_id}/like", headers=auth_headers)
    assert liked.status_code == 200

    r = client.get(f"/api/v1/posts/{post_id}/likes", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert "username" in body["items"][0]


def test_post_comments_list(auth_headers):
    post_id = _create_test_post()["id"]

    client.post(
        f"/api/v1/posts/{post_id}/comments",
        headers=auth_headers,
        json={"content": "목록 테스트"},
    )

    r = client.get(f"/api/v1/posts/{post_id}/comments", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_delete_comment(auth_headers):
    post_id = _create_test_post()["id"]

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


def test_create_post():
    headers = _admin_login()
    r = client.post(
        "/api/v1/posts",
        headers=headers,
        files={"image": ("test.jpg", _make_image_bytes(), "image/jpeg")},
        data={"caption": "pytest upload", "location": "Seoul"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["caption"] == "pytest upload"
    assert body["image_url"].startswith("/media/posts/")
    assert len(body["media"]) == 1
    assert body["media"][0]["media_type"] == "image"


def test_delete_own_post():
    headers = _admin_login()
    created = client.post(
        "/api/v1/posts",
        headers=headers,
        files={"image": ("test.jpg", _make_image_bytes(), "image/jpeg")},
        data={"caption": "to delete"},
    )
    assert created.status_code == 201
    post_id = created.json()["id"]

    deleted = client.delete(f"/api/v1/posts/{post_id}", headers=headers)
    assert deleted.status_code == 204

    missing = client.get(f"/api/v1/posts/{post_id}", headers=headers)
    assert missing.status_code == 404


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


def test_post_edit_archive_hide_report(auth_headers):
    admin_headers = _admin_login()
    created = client.post(
        "/api/v1/posts",
        headers=admin_headers,
        files={"image": ("test.jpg", _make_image_bytes(), "image/jpeg")},
        data={"caption": "parity test"},
    )
    assert created.status_code == 201
    own_post_id = created.json()["id"]

    edit = client.patch(
        f"/api/v1/posts/{own_post_id}",
        headers=admin_headers,
        json={"caption": "pytest edited caption", "location": "Seoul"},
    )
    assert edit.status_code == 200, edit.text
    assert edit.json()["caption"] == "pytest edited caption"

    feed = client.get("/api/v1/posts/feed", headers=auth_headers).json()
    other_post_id = next((p["id"] for p in feed["items"] if p["id"] != own_post_id), None)
    if other_post_id:
        hide = client.post(f"/api/v1/posts/{other_post_id}/hide", headers=auth_headers)
        assert hide.status_code == 204, hide.text

        report = client.post(
            f"/api/v1/posts/{other_post_id}/report",
            headers=auth_headers,
            json={"reason": "spam"},
        )
        assert report.status_code == 204, report.text

    archive = client.post(f"/api/v1/posts/{own_post_id}/archive", headers=admin_headers)
    assert archive.status_code == 200, archive.text

    archived = client.get("/api/v1/posts/archived", headers=admin_headers)
    assert archived.status_code == 200
    assert any(p["id"] == own_post_id for p in archived.json()["items"])

    unarchive = client.delete(f"/api/v1/posts/{own_post_id}/archive", headers=admin_headers)
    assert unarchive.status_code == 200, unarchive.text

    client.delete(f"/api/v1/posts/{own_post_id}", headers=admin_headers)


def test_private_follow_request_flow():
    private_headers = _login("alice_kim", "12345")
    requester_headers = _login()

    me = client.get("/api/v1/auth/me", headers=private_headers).json()
    requester = client.get("/api/v1/auth/me", headers=requester_headers).json()

    client.delete(f"/api/v1/users/{me['id']}/follow", headers=requester_headers)

    client.put(
        "/api/v1/users/me/settings",
        headers=private_headers,
        json={"is_private": True},
    )

    follow = client.post(f"/api/v1/users/{me['id']}/follow", headers=requester_headers)
    assert follow.status_code == 200, follow.text
    body = follow.json()
    assert body["is_requested"] is True, body
    assert body["is_following"] is False

    requests = client.get("/api/v1/users/me/follow-requests", headers=private_headers)
    assert requests.status_code == 200
    assert any(u["id"] == requester["id"] for u in requests.json())

    accept = client.post(
        f"/api/v1/users/me/follow-requests/by-user/{requester['id']}/accept",
        headers=private_headers,
    )
    assert accept.status_code == 200, accept.text

    profile = client.get(f"/api/v1/users/{me['username']}", headers=requester_headers)
    assert profile.status_code == 200
    assert profile.json()["is_following"] is True

    client.put(
        "/api/v1/users/me/settings",
        headers=private_headers,
        json={"is_private": False},
    )


def test_private_account_hides_follow_lists_from_non_followers():
    private_headers = _login("alice_kim", "12345")
    stranger_headers = _login()

    client.put(
        "/api/v1/users/me/settings",
        headers=private_headers,
        json={"is_private": True},
    )

    me = client.get("/api/v1/auth/me", headers=private_headers).json()
    stranger = client.get("/api/v1/auth/me", headers=stranger_headers).json()
    client.delete(f"/api/v1/users/{me['id']}/follow", headers=stranger_headers)

    blocked = client.get(f"/api/v1/users/{me['username']}/followers", headers=stranger_headers)
    assert blocked.status_code == 403

    allowed = client.get(f"/api/v1/users/{me['username']}/followers", headers=private_headers)
    assert allowed.status_code == 200

    client.put(
        "/api/v1/users/me/settings",
        headers=private_headers,
        json={"is_private": False},
    )
    client.delete(f"/api/v1/users/{me['id']}/follow", headers=stranger_headers)


def test_username_change(auth_headers):
    me = client.get("/api/v1/auth/me", headers=auth_headers).json()
    original = me["username"]
    candidate = f"{original}_py"[:30]

    check = client.get("/api/v1/users/check-username", params={"username": candidate})
    assert check.status_code == 200

    if check.json()["available"]:
        updated = client.put(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"username": candidate},
        )
        assert updated.status_code == 200, updated.text
        assert updated.json()["username"] == candidate
        client.put("/api/v1/users/me", headers=auth_headers, json={"username": original})


def test_blocked_users_list(auth_headers):
    target = client.get("/api/v1/users/alice_kim").json()
    client.post(f"/api/v1/users/{target['id']}/block", headers=auth_headers)
    listed = client.get("/api/v1/users/me/blocked", headers=auth_headers)
    assert listed.status_code == 200
    assert any(u["id"] == target["id"] for u in listed.json())
    status = client.get(f"/api/v1/users/{target['id']}/block-status", headers=auth_headers)
    assert status.json()["blocked_by_me"] is True
    client.delete(f"/api/v1/users/{target['id']}/block", headers=auth_headers)
    after = client.get("/api/v1/users/me/blocked", headers=auth_headers)
    assert all(u["id"] != target["id"] for u in after.json())


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

    disposable = _create_admin_product(headers, name="삭제테스트", price=10000)
    deleted = client.delete(f"/api/v1/admin/posts/{disposable['id']}", headers=headers)
    assert deleted.status_code == 200


def test_admin_forbidden_for_regular_user(auth_headers):
    r = client.get("/api/v1/admin/stats", headers=auth_headers)
    assert r.status_code == 403


def _create_test_post(headers: dict | None = None) -> dict:
    return _create_admin_product(headers or _admin_login())


def _create_admin_product(headers: dict, *, name: str = "광어회", price: int = 35000) -> dict:
    r = client.post(
        "/api/v1/admin/products",
        headers=headers,
        data={
            "name": name,
            "price": str(price),
            "unit": "1kg",
            "storage_type": "fresh",
            "availability": "year_round",
            "stock": "10",
            "caption": "싱싱한 광어",
        },
        files={"image": ("fish.jpg", _make_image_bytes(), "image/jpeg")},
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_admin_create_product():
    headers = _admin_login()
    body = _create_admin_product(headers)
    assert body["post_type"] == "product"
    assert body["product"]["name"] == "광어회"
    assert body["product"]["price"] == 35000
    assert body["product"]["unit"] == "1kg"


def test_feed_products_tab(auth_headers):
    admin_headers = _admin_login()
    created = _create_admin_product(admin_headers, name="대방어", price=45000)

    feed = client.get("/api/v1/posts/feed", params={"tab": "products"}, headers=auth_headers)
    assert feed.status_code == 200
    ids = [p["id"] for p in feed.json()["items"]]
    assert created["id"] in ids
    product_post = next(p for p in feed.json()["items"] if p["id"] == created["id"])
    assert product_post["product"]["name"] == "대방어"


def test_feed_reviews_tab_excludes_products(auth_headers):
    admin_headers = _admin_login()
    created = _create_admin_product(admin_headers, name="오징어", price=12000)

    reviews = client.get("/api/v1/posts/feed", params={"tab": "reviews"}, headers=auth_headers)
    assert reviews.status_code == 200
    assert all(p["id"] != created["id"] for p in reviews.json()["items"])


def test_explore_products_tab():
    admin_headers = _admin_login()
    created = _create_admin_product(admin_headers, name="새우", price=18000)

    explore = client.get("/api/v1/posts/explore", params={"tab": "products"})
    assert explore.status_code == 200
    ids = [p["id"] for p in explore.json()["items"]]
    assert created["id"] in ids


def test_order_quote_and_checkout(auth_headers):
    admin_headers = _admin_login()
    product_post = _create_admin_product(admin_headers, name="주문테스트", price=30000)
    product_id = product_post["product"]["id"]

    quote = client.post(
        "/api/v1/orders/quote",
        headers=auth_headers,
        json={"product_id": product_id, "quantity": 2},
    )
    assert quote.status_code == 200, quote.text
    body = quote.json()
    assert body["subtotal"] == 60000
    assert body["shipping_fee"] == 4000
    assert body["total_amount"] == 64000

    quote2 = client.post(
        "/api/v1/orders/quote",
        headers=auth_headers,
        json={"product_id": product_id, "quantity": 1},
    )
    assert quote2.json()["shipping_fee"] == 4000
    assert quote2.json()["total_amount"] == 34000

    order_res = client.post(
        "/api/v1/orders",
        headers=auth_headers,
        json={
            "product_id": product_id,
            "quantity": 1,
            "shipping_name": "Test User",
            **SHIPPING_PAYLOAD,
        },
    )
    assert order_res.status_code == 201, order_res.text
    order = order_res.json()["order"]
    payment = order_res.json()["payment"]
    assert order["status"] == "pending"
    assert payment["mock"] is True

    confirm = client.post(f"/api/v1/payments/mock/{order['id']}/confirm", headers=auth_headers)
    assert confirm.status_code == 200, confirm.text
    assert confirm.json()["status"] == "paid"

    detail = client.get(f"/api/v1/orders/{order['id']}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["status"] == "paid"

    my_orders = client.get("/api/v1/orders/me", headers=auth_headers)
    assert my_orders.status_code == 200
    assert any(o["id"] == order["id"] for o in my_orders.json()["items"])


def _create_paid_order(auth_headers: dict, admin_headers: dict, *, name: str = "리뷰테스트") -> dict:
    product_post = _create_admin_product(admin_headers, name=name, price=30000)
    product_id = product_post["product"]["id"]
    order_res = client.post(
        "/api/v1/orders",
        headers=auth_headers,
        json={
            "product_id": product_id,
            "quantity": 1,
            "shipping_name": "Test User",
            **SHIPPING_PAYLOAD,
        },
    )
    assert order_res.status_code == 201, order_res.text
    order = order_res.json()["order"]
    confirm = client.post(f"/api/v1/payments/mock/{order['id']}/confirm", headers=auth_headers)
    assert confirm.status_code == 200, confirm.text
    return order


def test_admin_order_management(auth_headers):
    admin_headers = _admin_login()
    order = _create_paid_order(auth_headers, admin_headers)

    listed = client.get("/api/v1/admin/orders", headers=admin_headers)
    assert listed.status_code == 200
    assert any(o["id"] == order["id"] for o in listed.json()["items"])

    prep = client.patch(
        f"/api/v1/admin/orders/{order['id']}",
        headers=admin_headers,
        json={"status": "preparing"},
    )
    assert prep.status_code == 200, prep.text
    assert prep.json()["status"] == "preparing"

    ship = client.patch(
        f"/api/v1/admin/orders/{order['id']}",
        headers=admin_headers,
        json={"status": "shipped", "tracking_number": "1234567890"},
    )
    assert ship.status_code == 200, ship.text
    assert ship.json()["status"] == "shipped"
    assert ship.json()["tracking_number"] == "1234567890"

    deliver = client.patch(
        f"/api/v1/admin/orders/{order['id']}",
        headers=admin_headers,
        json={"status": "delivered"},
    )
    assert deliver.status_code == 200, deliver.text
    assert deliver.json()["status"] == "delivered"

    detail = client.get(f"/api/v1/orders/{order['id']}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["can_review"] is True
    assert detail.json()["review_post_id"] is None


def test_get_users_me(auth_headers):
    r = client.get("/api/v1/users/me", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["username"] == "letsgomingu"
    assert body["phone"]
    assert body["postcode"]
    assert body["address_line1"]


def test_consumer_cannot_create_standard_post(auth_headers):
    r = client.post(
        "/api/v1/posts",
        headers=auth_headers,
        data={"caption": "blocked"},
        files={"image": ("x.jpg", _make_image_bytes(), "image/jpeg")},
    )
    assert r.status_code == 403


def test_create_review_after_delivery(auth_headers):
    admin_headers = _admin_login()
    order = _create_paid_order(auth_headers, admin_headers, name="리뷰상품")

    for status in ("preparing", "shipped", "delivered"):
        r = client.patch(
            f"/api/v1/admin/orders/{order['id']}",
            headers=admin_headers,
            json={"status": status},
        )
        assert r.status_code == 200, r.text

    review = client.post(
        "/api/v1/posts/reviews",
        headers=auth_headers,
        data={"order_id": str(order["id"]), "rating": "5", "caption": "아주 신선해요"},
        files={"image": ("review.jpg", _make_image_bytes(), "image/jpeg")},
    )
    assert review.status_code == 201, review.text
    body = review.json()
    assert body["post_type"] == "review"
    assert body["rating"] == 5
    assert body["product"]["name"] == "리뷰상품"

    detail = client.get(f"/api/v1/orders/{order['id']}", headers=auth_headers)
    assert detail.json()["can_review"] is False
    assert detail.json()["review_post_id"] == body["id"]

    duplicate = client.post(
        "/api/v1/posts/reviews",
        headers=auth_headers,
        data={"order_id": str(order["id"]), "rating": "4"},
        files={"image": ("review2.jpg", _make_image_bytes(), "image/jpeg")},
    )
    assert duplicate.status_code == 409

    reviews_feed = client.get("/api/v1/posts/feed", params={"tab": "reviews"}, headers=auth_headers)
    assert reviews_feed.status_code == 200
    assert any(p["id"] == body["id"] for p in reviews_feed.json()["items"])


def test_search_products():
    admin_headers = _admin_login()
    created = _create_admin_product(admin_headers, name="냉동새우", price=22000)
    product_id = created["product"]["id"]

    by_name = client.get("/api/v1/search/products", params={"q": "냉동새우"})
    assert by_name.status_code == 200
    assert any(p["id"] == product_id for p in by_name.json())

    by_storage = client.get("/api/v1/search/products", params={"storage_type": "fresh"})
    assert by_storage.status_code == 200
    assert all(p["storage_type"] == "fresh" for p in by_storage.json())


def test_admin_update_product():
    admin_headers = _admin_login()
    created = _create_admin_product(admin_headers, name="수정테스트", price=10000)
    product_id = created["product"]["id"]

    updated = client.patch(
        f"/api/v1/admin/products/{product_id}",
        headers=admin_headers,
        json={"price": 15000, "stock": 5},
    )
    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["price"] == 15000
    assert body["stock"] == 5

    sold_out = client.patch(
        f"/api/v1/admin/products/{product_id}",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert sold_out.status_code == 200
    assert sold_out.json()["is_active"] is False
    assert sold_out.json()["is_available"] is False


def test_order_quote_includes_stock(auth_headers):
    admin_headers = _admin_login()
    product_post = _create_admin_product(admin_headers, name="재고테스트", price=20000)
    product_id = product_post["product"]["id"]

    quote = client.post(
        "/api/v1/orders/quote",
        headers=auth_headers,
        json={"product_id": product_id, "quantity": 1},
    )
    assert quote.status_code == 200
    body = quote.json()
    assert body["stock"] == 10
    assert body["image_url"]


def test_cart_and_cancel(auth_headers):
    admin_headers = _admin_login()
    product_a = _create_admin_product(admin_headers, name="장바구니A", price=10000)
    product_b = _create_admin_product(admin_headers, name="장바구니B", price=15000)

    add1 = client.post(
        "/api/v1/cart/items",
        headers=auth_headers,
        json={"product_id": product_a["product"]["id"], "quantity": 2},
    )
    assert add1.status_code == 200, add1.text
    assert add1.json()["subtotal"] == 20000

    add2 = client.post(
        "/api/v1/cart/items",
        headers=auth_headers,
        json={"product_id": product_b["product"]["id"], "quantity": 1},
    )
    assert add2.status_code == 200
    assert add2.json()["total_amount"] == 39000

    checkout = client.post(
        "/api/v1/cart/checkout",
        headers=auth_headers,
        json={
            "shipping_name": "Test User",
            **SHIPPING_PAYLOAD,
        },
    )
    assert checkout.status_code == 201, checkout.text
    order = checkout.json()["order"]
    assert len(order["items"]) == 2
    assert order["subtotal"] == 35000

    confirm = client.post(f"/api/v1/payments/mock/{order['id']}/confirm", headers=auth_headers)
    assert confirm.status_code == 200

    cancel = client.post(f"/api/v1/orders/{order['id']}/cancel", headers=auth_headers)
    assert cancel.status_code == 200, cancel.text
    assert cancel.json()["status"] == "cancelled"

    cart_after = client.get("/api/v1/cart", headers=auth_headers)
    assert cart_after.status_code == 200
    assert len(cart_after.json()["items"]) == 0


def test_cancel_pending_order(auth_headers):
    admin_headers = _admin_login()
    product_post = _create_admin_product(admin_headers, name="취소테스트", price=20000)
    product_id = product_post["product"]["id"]

    order_res = client.post(
        "/api/v1/orders",
        headers=auth_headers,
        json={
            "product_id": product_id,
            "quantity": 1,
            "shipping_name": "Test User",
            **SHIPPING_PAYLOAD,
        },
    )
    assert order_res.status_code == 201
    order_id = order_res.json()["order"]["id"]

    cancel = client.post(f"/api/v1/orders/{order_id}/cancel", headers=auth_headers)
    assert cancel.status_code == 200, cancel.text
    assert cancel.json()["status"] == "cancelled"


def test_forgot_password_always_succeeds(monkeypatch):
    monkeypatch.setattr(
        "app.services.password_reset.send_auth_email",
        lambda **kwargs: None,
    )

    r = client.post("/api/v1/auth/forgot-password", json={"email": "unknown@example.com"})
    assert r.status_code == 204
    r2 = client.post("/api/v1/auth/forgot-password", json={"email": SEED_EMAIL})
    assert r2.status_code == 204


def test_forgot_username_succeeds_with_mock_email(monkeypatch):
    monkeypatch.setattr(
        "app.services.account_recovery.send_auth_email",
        lambda **kwargs: None,
    )
    r = client.post("/api/v1/auth/forgot-username", json={"email": "unknown@example.com"})
    assert r.status_code == 204
    r2 = client.post("/api/v1/auth/forgot-username", json={"email": SEED_EMAIL})
    assert r2.status_code == 204


def test_forgot_password_requires_email_delivery(monkeypatch):
    from app.services.email import EmailDeliveryError

    def _fail(**kwargs):
        raise EmailDeliveryError("not configured")

    monkeypatch.setattr("app.services.password_reset.send_auth_email", _fail)

    r = client.post("/api/v1/auth/forgot-password", json={"email": SEED_EMAIL})
    assert r.status_code == 503


def test_reset_password_invalid_token():
    r = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "invalid-token-value", "password": "newpass123"},
    )
    assert r.status_code == 400


def test_user_report(auth_headers):
    target = client.get("/api/v1/users/suggested", headers=auth_headers).json()[0]
    r = client.post(
        f"/api/v1/users/{target['id']}/report",
        headers=auth_headers,
        json={"reason": "spam"},
    )
    assert r.status_code == 204


def test_admin_reports(auth_headers):
    admin_headers = _admin_login()
    posts = client.get("/api/v1/admin/reports/posts", headers=admin_headers)
    assert posts.status_code == 200
    users = client.get("/api/v1/admin/reports/users", headers=admin_headers)
    assert users.status_code == 200
    reels = client.get("/api/v1/admin/reports/reels", headers=admin_headers)
    assert reels.status_code == 200
