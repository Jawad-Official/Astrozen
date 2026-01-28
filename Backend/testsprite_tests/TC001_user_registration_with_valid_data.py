import requests
import uuid
import time

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

def test_user_registration_with_valid_data():
    unique_suffix = str(int(time.time() * 1000))
    email = f"user_{unique_suffix}@example.com"
    password = "StrongPassw0rd!"
    first_name = f"FirstName{unique_suffix}"
    last_name = f"LastName{unique_suffix}"
    
    url = f"{BASE_URL}/auth/register"
    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"
    
    assert response.status_code in (200, 201), f"Expected 200 or 201, got {response.status_code}, response: {response.text}"
    try:
        json_response = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"
    
    # Verify response contains at least an identifier or success confirmation
    assert "email" in json_response, "Response JSON missing 'email' key"
    assert json_response.get("email") == email, f"Registered email mismatch, expected {email}"
    
    # Additional keys can be validated if known, but not specified in PRD; just check success implied
    # The test assumes success response includes registered user email
    
test_user_registration_with_valid_data()