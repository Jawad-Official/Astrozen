import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"
REGISTER_ENDPOINT = f"{BASE_URL}/register"
TIMEOUT = 30

def test_register_new_user_with_valid_and_invalid_data():
    # Valid user data
    valid_user = {
        "email": f"user_{uuid.uuid4()}@example.com",
        "password": "StrongPassword123!"
    }

    # Invalid emails and missing fields for testing
    invalid_users = [
        {"email": "invalid-email", "password": "SomePass123!"},   # invalid email format
        {"email": "missingpassword@example.com"},                 # missing password
        {"password": "nopassword123"},                            # missing email
        {"email": "", "password": "SomePass123!"},               # empty email
        {"email": "   ", "password": "SomePass123!"}             # blank email
    ]

    # Test valid registration
    try:
        response = requests.post(REGISTER_ENDPOINT, json=valid_user, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to register endpoint failed for valid data: {e}"
    assert response.status_code == 201, f"Expected 201 Created for valid user registration, got {response.status_code}"

    # Test invalid registrations
    for user_data in invalid_users:
        try:
            response = requests.post(REGISTER_ENDPOINT, json=user_data, timeout=TIMEOUT)
        except requests.RequestException as e:
            assert False, f"Request to register endpoint failed for invalid data {user_data}: {e}"
        # Expect client error 400 or similar for invalid data submissions
        assert response.status_code >= 400 and response.status_code < 500, (
            f"Expected 4xx status for invalid user data {user_data}, got {response.status_code}"
        )

test_register_new_user_with_valid_and_invalid_data()