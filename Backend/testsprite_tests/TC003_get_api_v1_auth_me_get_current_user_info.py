import requests
import uuid

base_url = "http://localhost:8080/api/v1"
timeout = 30


def test_get_api_v1_auth_me_get_current_user_info():
    # Unique user data
    unique_id = uuid.uuid4().hex[:8]
    email = f"user_{unique_id}@example.com"
    password = "TestPass123!"
    first_name = "TestFirst"
    last_name = "TestLast"

    # Register user
    register_url = f"{base_url}/auth/register"
    register_payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name
    }
    try:
        reg_resp = requests.post(register_url, json=register_payload, timeout=timeout)
        assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"
        user = reg_resp.json()
        assert "id" in user and user["email"] == email

        # Login user
        login_url = f"{base_url}/auth/login"
        login_payload = {
            "username": email,
            "password": password
        }
        login_resp = requests.post(login_url, data=login_payload, timeout=timeout)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token_resp = login_resp.json()
        token = token_resp.get("access_token") or token_resp.get("token") or token_resp.get("accessToken")
        assert token, "No access token received"

        headers = {
            "Authorization": f"Bearer {token}"
        }

        # Get current user info
        me_url = f"{base_url}/auth/me"
        me_resp = requests.get(me_url, headers=headers, timeout=timeout)
        assert me_resp.status_code == 200, f"Get current user info failed: {me_resp.text}"
        current_user = me_resp.json()
        # Validate response contains expected user fields
        assert isinstance(current_user, dict), "Current user response is not a dict"
        assert "id" in current_user and current_user["id"] == user["id"]
        assert "email" in current_user and current_user["email"] == email
        assert "first_name" in current_user and current_user["first_name"] == first_name
        assert "last_name" in current_user and current_user["last_name"] == last_name
    finally:
        # Cleanup: delete user if deletion endpoint existed (not specified in PRD)
        # Since no delete user endpoint given, skip cleanup
        pass


test_get_api_v1_auth_me_get_current_user_info()