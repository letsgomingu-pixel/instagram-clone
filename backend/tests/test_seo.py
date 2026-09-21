"""SEO sitemap — public URLs only, no private account content."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

SEED_EMAIL = "letsgomingu.test@example.com"
SEED_PASSWORD = "12345"


def _login() -> dict:
    r = client.post("/api/v1/auth/login", json={"username": SEED_EMAIL, "password": SEED_PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_sitemap_is_valid_xml():
    r = client.get("/api/v1/sitemap.xml")
    assert r.status_code == 200, r.text
    assert "xml" in r.headers["content-type"]
    body = r.text
    assert body.startswith("<?xml")
    assert "<urlset" in body
    assert "https://www.iamnotafishmonger.com/" in body
    assert "/explore" in body
    assert "/info/about" in body
    assert "/info/wholesale" in body
    assert "/login" in body
    assert "/signup" in body
    assert "https://www.iamnotafishmonger.com/admin" not in body
    assert "https://www.iamnotafishmonger.com/messages" not in body
    assert "https://www.iamnotafishmonger.com/settings" not in body
    assert "https://www.iamnotafishmonger.com/checkout" not in body
    assert "https://www.iamnotafishmonger.com/orders" not in body
    assert "https://www.iamnotafishmonger.com/notifications" not in body
    assert "https://www.iamnotafishmonger.com/reset-password" not in body


def test_sitemap_includes_public_posts_and_profiles():
    r = client.get("/api/v1/sitemap.xml")
    body = r.text
    assert "/p/" in body
    assert "/profile/letsgomingu" in body


def test_sitemap_excludes_private_profiles_and_their_posts():
    headers = _login()
    me = client.get("/api/v1/users/me", headers=headers)
    assert me.status_code == 200
    username = me.json()["username"]

    public = client.get("/api/v1/sitemap.xml").text
    assert f"/profile/{username}" in public

    upd = client.put("/api/v1/users/me/settings", headers=headers, json={"is_private": True})
    assert upd.status_code == 200

    try:
        private = client.get("/api/v1/sitemap.xml").text
        assert f"/profile/{username}" not in private
    finally:
        restore = client.put(
            "/api/v1/users/me/settings",
            headers=headers,
            json={"is_private": False},
        )
        assert restore.status_code == 200
