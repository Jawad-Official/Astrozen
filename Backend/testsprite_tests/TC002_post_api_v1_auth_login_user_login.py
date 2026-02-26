import requests
import uuid

BASE_URL = "http://localhost:8080/api/v1"
TIMEOUT = 30

def test_post_api_v1_auth_login_user_login():
    # Generate unique user info for registration to ensure valid login
    unique_suffix = str(uuid.uuid4())[:8]
    email = f"user_{unique_suffix}@example.com"
    password = "StrongP@ssw0rd!"
    first_name = "Test"
    last_name = "User"

    # Register new user first
    register_url = f"{BASE_URL}/auth/register"
    register_payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name
    }
    try:
        reg_resp = requests.post(register_url, json=register_payload, timeout=TIMEOUT)
        assert reg_resp.status_code == 201, f"Expected 201 Created but got {reg_resp.status_code}"
        reg_json = reg_resp.json()
        assert "id" in reg_json and reg_json["email"] == email

        # Now login with registered user credentials using form-data
        login_url = f"{BASE_URL}/auth/login"
        login_form = {
            "username": email,
            "password": password
        }
        login_resp = requests.post(login_url, data=login_form, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Expected 200 OK but got {login_resp.status_code}"
        login_json = login_resp.json()
        # Expect access token JWT
        assert "access_token" in login_json and isinstance(login_json["access_token"], str) and len(login_json["access_token"]) > 0
        assert login_json.get("token_type", "").lower() == "bearer"
    finally:
        # Cleanup: no explicit delete user endpoint described, so nothing to delete
        pass

test_post_api_v1_auth_login_user_login()