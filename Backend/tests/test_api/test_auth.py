"""Auth flow tests - the highest-priority gap identified in
TESTING_CI_FINDINGS.md TEST-3: a regression here is both easy to
introduce and immediately serious, and this is the one area Phase 1
found is currently correct (JWT algorithm pinning, bcrypt defaults) -
these tests pin down behavior that's already right.
"""


def test_register_then_login_then_me(client):
    """Happy path: register -> login -> /me returns the same user."""
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "alice@example.com",
            "password": "SecurePass123",
            "first_name": "Alice",
            "last_name": "Smith",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["email"] == "alice@example.com"
    assert "password" not in body
    assert "hashed_password" not in body

    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "alice@example.com", "password": "SecurePass123"},
    )
    assert resp.status_code == 200, resp.text
    token_body = resp.json()
    assert token_body["token_type"] == "bearer"
    token = token_body["access_token"]
    assert token

    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["email"] == "alice@example.com"


def test_login_sets_httponly_cookie(client):
    """The backend should set an httpOnly auth_token cookie on login,
    independent of the JSON access_token."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "cookie@example.com", "password": "SecurePass123",
              "first_name": "C", "last_name": "K"},
    )
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "cookie@example.com", "password": "SecurePass123"},
    )
    assert resp.status_code == 200
    assert "auth_token" in resp.cookies


def test_sec7_cookie_is_cross_origin_capable_and_logout_clears_it(client):
    """SEC-7: the frontend no longer keeps a client-readable copy of the
    token (removed from localStorage) - auth must work via the cookie
    alone, and the cookie must be usable cross-origin (SameSite=None,
    Secure) since the frontend (Netlify) and this API (Render) are
    different origins. logout must be able to actually end the session,
    since the frontend can no longer clear an httpOnly cookie itself."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "sec7@example.com", "password": "SecurePass123",
              "first_name": "Sec7", "last_name": "Test"},
    )
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "sec7@example.com", "password": "SecurePass123"},
    )
    assert resp.status_code == 200
    set_cookie = resp.headers.get("set-cookie", "").lower()
    assert "samesite=none" in set_cookie, set_cookie
    assert "secure" in set_cookie, set_cookie
    assert "httponly" in set_cookie, set_cookie

    # /me must succeed via the cookie alone - the client sends no
    # Authorization header in any of these calls.
    me_resp = client.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "sec7@example.com"

    logout_resp = client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 200
    logout_set_cookie = logout_resp.headers.get("set-cookie", "").lower()
    assert "max-age=0" in logout_set_cookie or "1970" in logout_set_cookie, logout_set_cookie

    # The session is genuinely over - not just a client-side illusion.
    after_logout_resp = client.get("/api/v1/auth/me")
    assert after_logout_resp.status_code == 401


def test_register_duplicate_email_rejected(client):
    payload = {"email": "dupe@example.com", "password": "SecurePass123",
               "first_name": "D", "last_name": "P"}
    resp1 = client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    resp2 = client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 400
    # Must not leak whether it was the email or username that collided,
    # and must never echo back the submitted password.
    assert "SecurePass123" not in resp2.text


def test_register_weak_password_rejected(client):
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": "weak@example.com", "password": "short",
              "first_name": "W", "last_name": "P"},
    )
    assert resp.status_code == 422


def test_login_wrong_password_rejected(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "bob@example.com", "password": "SecurePass123",
              "first_name": "Bob", "last_name": "Jones"},
    )
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "bob@example.com", "password": "WrongPassword999"},
    )
    assert resp.status_code == 401
    assert "access_token" not in resp.text


def test_login_nonexistent_user_rejected(client):
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "nobody@example.com", "password": "SecurePass123"},
    )
    assert resp.status_code == 401


def test_me_without_token_rejected(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_me_with_invalid_token_rejected(client):
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert resp.status_code == 401
