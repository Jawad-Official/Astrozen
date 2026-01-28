import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30


def test_user_login_with_correct_credentials():
    # Generate unique user data
    unique_suffix = str(uuid.uuid4())
    email = f"user_{unique_suffix}@example.com"
    password = "StrongPassword123!"
    first_name = "TestFirstName"
    last_name = "TestLastName"

    # Register new user
    register_url = f"{BASE_URL}/auth/register"
    register_payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
    }
    try:
        register_response = requests.post(register_url, json=register_payload, timeout=TIMEOUT)
        assert register_response.status_code == 201 or register_response.status_code == 200, \
            f"Registration failed: {register_response.status_code} {register_response.text}"

        # Login with created user credentials
        login_url = f"{BASE_URL}/auth/login"
        login_payload = {
            "username": email,
            "password": password
        }
        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }
        login_response = requests.post(login_url, data=login_payload, headers=headers, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Login failed: {login_response.status_code} {login_response.text}"

        login_json = login_response.json()
        assert "access_token" in login_json, "Access token is missing in login response"
        assert isinstance(login_json["access_token"], str) and len(login_json["access_token"]) > 0, \
            "Access token is empty or invalid"

        # Optionally check token type if present
        if "token_type" in login_json:
            assert login_json["token_type"].lower() == "bearer", "Unexpected token_type in login response"

    finally:
        # No user deletion endpoint described, so no cleanup possible here
        pass


test_user_login_with_correct_credentials()