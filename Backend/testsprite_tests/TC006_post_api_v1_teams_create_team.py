import requests
import uuid
import random
import string

BASE_URL = "http://localhost:8080/api/v1"
TIMEOUT = 30

def test_post_api_v1_teams_create_team():
    # Generate unique user data for registration
    unique_suffix = str(uuid.uuid4())[:8]
    email = f"user_{unique_suffix}@example.com"
    password = "Password123!"
    first_name = "TestFirst"
    last_name = "TestLast"

    # Register user
    register_payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
    }
    register_resp = requests.post(f"{BASE_URL}/auth/register", json=register_payload, headers={"Content-Type": "application/json"}, timeout=TIMEOUT)
    assert register_resp.status_code == 201, f"User registration failed: {register_resp.text}"
    user = register_resp.json()
    assert "email" in user and user["email"] == email

    # Login user to get token
    login_data = {
        "username": email,
        "password": password,
    }
    login_resp = requests.post(f"{BASE_URL}/auth/login", data=login_data, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"User login failed: {login_resp.text}"
    login_json = login_resp.json()
    assert "access_token" in login_json
    token = login_json["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Organization (required before creating a team)
    org_name = f"Org_{unique_suffix}"
    org_desc = "Test Organization Description"
    org_payload = {"name": org_name, "description": org_desc}
    org_resp = requests.post(f"{BASE_URL}/organizations", json=org_payload, headers=headers, timeout=TIMEOUT)
    assert org_resp.status_code == 201, f"Organization creation failed: {org_resp.text}"
    organization = org_resp.json()
    org_id = organization.get("id")
    assert org_id is not None

    # Create Team with unique identifier (max 5 chars)
    team_name = f"Team {unique_suffix}"
    # Generate random 5-char identifier (alphanumeric)
    team_identifier = ''.join(random.choices(string.ascii_letters + string.digits, k=5))
    team_payload = {"name": team_name, "identifier": team_identifier}

    created_team_id = None
    try:
        team_resp = requests.post(f"{BASE_URL}/teams", json=team_payload, headers=headers, timeout=TIMEOUT)
        assert team_resp.status_code == 201, f"Team creation failed: {team_resp.text}"
        team = team_resp.json()
        created_team_id = team.get("id")
        assert created_team_id is not None
        assert team.get("name") == team_name
        # identifier returned should match (case sensitive)
        assert team.get("identifier") == team_identifier
    finally:
        # Cleanup: delete created team if exists
        if created_team_id:
            del_resp = requests.delete(f"{BASE_URL}/teams/{created_team_id}", headers=headers, timeout=TIMEOUT)
            # 204 No Content expected on successful deletion
            assert del_resp.status_code == 204 or del_resp.status_code == 404

test_post_api_v1_teams_create_team()
