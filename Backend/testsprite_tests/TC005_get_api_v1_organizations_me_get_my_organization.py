import requests
import uuid
import random
import string

BASE_URL = "http://localhost:8080/api/v1"
TIMEOUT = 30

def random_email():
    return f"testuser_{uuid.uuid4().hex[:8]}@example.com"

def random_name():
    return f"Name{uuid.uuid4().hex[:6]}"

def random_team_identifier():
    # max 5 chars as per instruction
    return ''.join(random.choices(string.ascii_lowercase, k=5))

def test_get_my_organization():
    session = requests.Session()

    # Step 1: Register user
    register_url = f"{BASE_URL}/auth/register"
    email = random_email()
    password = "StrongPassword123!"
    first_name = random_name()
    last_name = random_name()
    register_body = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name
    }
    r = session.post(register_url, json=register_body, timeout=TIMEOUT)
    assert r.status_code == 201, f"Registration failed: {r.status_code}, {r.text}"
    user = r.json()
    assert "id" in user and user["email"] == email

    # Step 2: Login user
    login_url = f"{BASE_URL}/auth/login"
    login_data = {
        "username": email,
        "password": password
    }
    r = session.post(login_url, data=login_data, timeout=TIMEOUT)
    assert r.status_code == 200, f"Login failed: {r.status_code}, {r.text}"
    token_data = r.json()
    assert "access_token" in token_data
    access_token = token_data["access_token"]

    headers = {"Authorization": f"Bearer {access_token}"}

    # Step 3: Create organization
    org_url = f"{BASE_URL}/organizations"
    org_name = f"Org_{uuid.uuid4().hex[:8]}"
    org_description = "Test organization for TC005"
    org_body = {
        "name": org_name,
        "description": org_description,
    }
    r = session.post(org_url, json=org_body, headers=headers, timeout=TIMEOUT)
    assert r.status_code == 201, f"Organization creation failed: {r.status_code}, {r.text}"
    organization = r.json()
    assert "id" in organization and organization["name"] == org_name

    org_id = organization["id"]

    try:
        # Step 4: Get my organization details
        get_org_me_url = f"{BASE_URL}/organizations/me"
        r = session.get(get_org_me_url, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 200, f"Get my organization failed: {r.status_code}, {r.text}"
        org_details = r.json()
        assert "id" in org_details and org_details["id"] == org_id
        assert org_details.get("name") == org_name

    finally:
        # Cleanup - delete org? API does not show delete org, so skip cleanup here.
        # User deletion not described; skipping cleanup.
        pass

test_get_my_organization()