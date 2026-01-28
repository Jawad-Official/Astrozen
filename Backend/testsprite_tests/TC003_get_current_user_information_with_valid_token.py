import requests

BASE_URL = "http://localhost:8000/api/v1"
USERNAME = "user@example.com"
PASSWORD = "string"
TIMEOUT = 30


def test_get_current_user_information_with_valid_token():
    # Login to get JWT token
    login_url = f"{BASE_URL}/auth/login"
    login_data = {
        "username": USERNAME,
        "password": PASSWORD
    }
    try:
        login_response = requests.post(login_url, data=login_data, timeout=TIMEOUT)
        login_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    login_json = login_response.json()
    assert "access_token" in login_json, "No access_token in login response"
    access_token = login_json["access_token"]
    assert isinstance(access_token, str) and access_token, "Invalid access_token"

    # Use token to get current user info
    me_url = f"{BASE_URL}/auth/me"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        me_response = requests.get(me_url, headers=headers, timeout=TIMEOUT)
        me_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Get current user information failed: {e}"

    assert me_response.status_code == 200, f"Expected 200 status code, got {me_response.status_code}"

    user_info = me_response.json()
    assert isinstance(user_info, dict), "User info response is not a JSON object"
    # Check presence of expected user fields, at least username or email should be there
    keys_to_check = ["email", "username", "id"]
    assert any(k in user_info for k in keys_to_check), "User info missing expected fields"


test_get_current_user_information_with_valid_token()