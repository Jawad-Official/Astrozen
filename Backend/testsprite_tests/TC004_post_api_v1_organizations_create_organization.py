import requests
import uuid

BASE_URL = "http://localhost:8080/api/v1"
TIMEOUT = 30

def test_create_organization():
    # Generate unique user data for registration
    unique_id = uuid.uuid4().hex[:8]
    email = f"user_{unique_id}@example.com"
    password = "TestPass123!"
    first_name = "TestFirst"
    last_name = "TestLast"

    headers = {"Content-Type": "application/json"}

    # Register user
    register_payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name
    }
    register_resp = requests.post(f"{BASE_URL}/auth/register", json=register_payload, headers=headers, timeout=TIMEOUT)
    assert register_resp.status_code == 201, f"Registration failed: {register_resp.text}"
    user = register_resp.json()
    assert "email" in user and user["email"] == email

    # Login user
    login_data = {
        "username": email,
        "password": password
    }
    login_resp = requests.post(f"{BASE_URL}/auth/login", data=login_data, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token_data = login_resp.json()
    assert "access_token" in token_data and isinstance(token_data["access_token"], str)
    token = token_data["access_token"]

    # Create organization
    org_payload = {
        "name": f"Org_{unique_id}",
        "description": "Test organization description"
    }
    auth_headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    org_resp = requests.post(f"{BASE_URL}/organizations", json=org_payload, headers=auth_headers, timeout=TIMEOUT)
    assert org_resp.status_code == 201, f"Organization creation failed: {org_resp.text}"
    org = org_resp.json()
    assert "id" in org and "name" in org
    assert org["name"] == org_payload["name"]

test_create_organization()