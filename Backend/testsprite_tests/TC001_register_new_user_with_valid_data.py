import requests

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

def test_register_new_user_with_valid_data():
    url = f"{BASE_URL}/auth/register"
    headers = {"Content-Type": "application/json"}
    payload = {
        "email": "testuser_valid@example.com",
        "password": "StrongPassw0rd!",
        "first_name": "Test",
        "last_name": "User"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 201, f"Expected status code 201, got {response.status_code}, response: {response.text}"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_register_new_user_with_valid_data()