import requests
import uuid

BASE_URL = "http://localhost:8080/api/v1"
TIMEOUT = 30

def test_post_api_v1_auth_register_user_registration():
    unique_id = uuid.uuid4().hex[:8]
    email = f"testuser_{unique_id}@example.com"
    password = "TestPassword123!"
    first_name = f"FirstName{unique_id}"
    last_name = f"LastName{unique_id}"

    url = f"{BASE_URL}/auth/register"
    payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name
    }
    headers = {
        "Content-Type": "application/json"
    }

    response = None
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 201, f"Expected 201 Created, got {response.status_code}"
        user = response.json()
        assert "id" in user, "Response JSON does not contain 'id'"
        assert user.get("email") == email, f"Expected email {email}, got {user.get('email')}"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_v1_auth_register_user_registration()