import requests

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

def test_login_user_with_valid_credentials():
    register_url = f"{BASE_URL}/auth/register"
    login_url = f"{BASE_URL}/auth/login"

    user_data = {
        "email": "user@example.com",
        "password": "string",
        "first_name": "Test",
        "last_name": "User"
    }

    # Register the user first (in case not exists)
    try:
        reg_response = requests.post(register_url, json=user_data, timeout=TIMEOUT)
        # Accept 201 Created or 409 Conflict for duplicate registration
        assert reg_response.status_code in (201, 409)
    except requests.RequestException as e:
        assert False, f"Registration request failed: {e}"

    # Login with valid credentials
    login_data = {
        "username": user_data["email"],
        "password": user_data["password"]
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }

    try:
        login_response = requests.post(login_url, data=login_data, headers=headers, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Expected login status 200 but got {login_response.status_code}"
        json_resp = login_response.json()
        assert "access_token" in json_resp, "access_token not found in login response"
        assert isinstance(json_resp["access_token"], str) and len(json_resp["access_token"]) > 0, "access_token is empty or not a string"
        assert "token_type" in json_resp and json_resp["token_type"].lower() == "bearer"
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"
    except ValueError:
        assert False, "Login response is not a valid JSON"

test_login_user_with_valid_credentials()