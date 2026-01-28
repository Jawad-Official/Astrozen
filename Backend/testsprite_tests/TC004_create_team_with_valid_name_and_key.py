import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

REGISTER_URL = f"{BASE_URL}/auth/register"
LOGIN_URL = f"{BASE_URL}/auth/login"
ORGANIZATIONS_URL = f"{BASE_URL}/organizations"
TEAMS_URL = f"{BASE_URL}/teams"

USER_EMAIL = "user_tc004@example.com"
USER_PASSWORD = "StrongPassword123!"
USER_FIRST_NAME = "Test"
USER_LAST_NAME = "User"


def test_create_team_with_valid_name_and_key():
    # Register user
    register_payload = {
        "email": USER_EMAIL,
        "password": USER_PASSWORD,
        "first_name": USER_FIRST_NAME,
        "last_name": USER_LAST_NAME,
    }
    resp = requests.post(REGISTER_URL, json=register_payload, timeout=30)
    assert resp.status_code == 201 or resp.status_code == 400  # 400 if user already exists

    # Login user
    login_data = {
        "username": USER_EMAIL,
        "password": USER_PASSWORD,
    }
    resp = requests.post(LOGIN_URL, data=login_data, timeout=30)
    assert resp.status_code == 200
    json_resp = resp.json()
    assert "access_token" in json_resp
    token = json_resp["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    created_organization_id = None
    created_team_id = None

    try:
        # Create Organization - required to create a Team under it logically (even though API doesn't specify org_id for team)
        org_name = f"Org_TC004_{uuid.uuid4()}"
        org_payload = {"name": org_name}
        resp = requests.post(ORGANIZATIONS_URL, json=org_payload, headers=headers, timeout=30)
        assert resp.status_code == 201
        org_resp = resp.json()
        assert "id" in org_resp
        created_organization_id = org_resp["id"]

        # Create Team with valid name and key
        team_name = f"Team_TC004_{uuid.uuid4()}"
        team_key = f"TK{uuid.uuid4().hex[:6]}"
        team_payload = {
            "name": team_name,
            "key": team_key,
        }
        resp = requests.post(TEAMS_URL, json=team_payload, headers=headers, timeout=30)
        assert resp.status_code == 201
        team_resp = resp.json()
        assert "id" in team_resp
        assert team_resp["name"] == team_name
        created_team_id = team_resp["id"]

    finally:
        # Cleanup: delete created team
        if created_team_id:
            requests.delete(f"{TEAMS_URL}/{created_team_id}", headers=headers, timeout=30)
        # Cleanup: delete created organization
        if created_organization_id:
            requests.delete(f"{ORGANIZATIONS_URL}/{created_organization_id}", headers=headers, timeout=30)


test_create_team_with_valid_name_and_key()
