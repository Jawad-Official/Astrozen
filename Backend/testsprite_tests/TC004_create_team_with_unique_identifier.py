import requests
import uuid
import random
import string

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def test_create_team_with_unique_identifier():
    email = f"user_{random_string()}@example.com"
    password = "StrongP@ssw0rd"
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
    r = requests.post(f"{BASE_URL}/auth/register", json=register_payload, timeout=TIMEOUT)
    assert r.status_code == 201 or r.status_code == 200, f"Registration failed: {r.text}"

    # Login user
    login_payload = {
        "username": email,
        "password": password
    }
    r = requests.post(f"{BASE_URL}/auth/login", data=login_payload, timeout=TIMEOUT)
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json().get("access_token")
    assert token, "Access token missing in login response"

    auth_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Create organization (which auto creates default team)
    org_name = f"Org_{random_string()}"
    org_payload = {"name": org_name}
    r = requests.post(f"{BASE_URL}/organizations", json=org_payload, headers=auth_headers, timeout=TIMEOUT)
    assert r.status_code == 201 or r.status_code == 200, f"Organization creation failed: {r.text}"
    organization = r.json()
    org_id = organization.get("id")
    assert org_id, "Organization id missing"

    created_team_ids = []

    try:
        # Create first new team with unique identifier
        team_identifier = f"team-{uuid.uuid4()}"
        team_name = f"Team {random_string(6)}"
        team_payload = {
            "name": team_name,
            "identifier": team_identifier
        }
        r = requests.post(f"{BASE_URL}/teams", json=team_payload, headers=auth_headers, timeout=TIMEOUT)
        assert r.status_code == 201 or r.status_code == 200, f"Team creation failed: {r.text}"
        team = r.json()
        team_id = team.get("id")
        assert team_id, "Team id missing after creation"
        created_team_ids.append(team_id)
        assert team.get("identifier") == team_identifier, "Team identifier mismatch"

        # Attempt to create a duplicate team with the same identifier
        duplicate_payload = {
            "name": f"Duplicate {random_string(6)}",
            "identifier": team_identifier
        }
        r = requests.post(f"{BASE_URL}/teams", json=duplicate_payload, headers=auth_headers, timeout=TIMEOUT)
        # Should fail due to duplicate identifier
        assert r.status_code == 400 or r.status_code == 409, f"Duplicate team creation should fail but got: {r.status_code} - {r.text}"

    finally:
        # Cleanup created teams
        for tid in created_team_ids:
            requests.delete(f"{BASE_URL}/teams/{tid}", headers=auth_headers, timeout=TIMEOUT)
        # Cleanup organization
        if org_id:
            requests.delete(f"{BASE_URL}/organizations/{org_id}", headers=auth_headers, timeout=TIMEOUT)

test_create_team_with_unique_identifier()