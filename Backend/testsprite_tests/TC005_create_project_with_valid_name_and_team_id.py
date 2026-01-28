import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

def test_create_project_with_valid_name_and_team_id():
    # User registration data
    user_data = {
        "email": "user_for_project_" + str(uuid.uuid4()) + "@example.com",
        "password": "string",
        "first_name": "Test",
        "last_name": "User"
    }
    # Register user
    register_resp = requests.post(f"{BASE_URL}/auth/register", json=user_data, timeout=TIMEOUT)
    assert register_resp.status_code == 201, f"User registration failed: {register_resp.text}"

    # Login to get token
    login_data = {
        "username": user_data["email"],
        "password": user_data["password"]
    }
    login_resp = requests.post(f"{BASE_URL}/auth/login", data=login_data, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("access_token")
    assert token, "No access token received"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Create organization
    org_name = "OrgForProject_" + str(uuid.uuid4())
    org_payload = {"name": org_name}
    org_resp = requests.post(f"{BASE_URL}/organizations", json=org_payload, headers=headers, timeout=TIMEOUT)
    assert org_resp.status_code == 201, f"Organization creation failed: {org_resp.text}"
    org_id = org_resp.json().get("id")
    assert org_id, "No organization ID returned"

    # Create team
    team_name = "TeamForProject_" + str(uuid.uuid4())
    team_key = "TFP" + str(uuid.uuid4())[:8]
    team_payload = {
        "name": team_name,
        "key": team_key
    }
    team_resp = requests.post(f"{BASE_URL}/teams", json=team_payload, headers=headers, timeout=TIMEOUT)
    assert team_resp.status_code == 201, f"Team creation failed: {team_resp.text}"
    team_id = team_resp.json().get("id")
    assert team_id, "No team ID returned"

    # Create project linked to the team with required fields
    project_name = "Project_" + str(uuid.uuid4())
    project_payload = {
        "name": project_name,
        "team_id": team_id,
        "icon": "📁",
        "color": "#123abc"
    }

    project_resp = requests.post(f"{BASE_URL}/projects", json=project_payload, headers=headers, timeout=TIMEOUT)
    try:
        assert project_resp.status_code == 201, f"Project creation failed: {project_resp.text}"
        project_data = project_resp.json()
        assert project_data.get("name") == project_name, "Project name mismatch"
        assert project_data.get("team_id") == team_id, "Project team_id mismatch"
    finally:
        # Cleanup: delete project, team, organization if IDs are available
        if project_resp.status_code == 201:
            project_id = project_resp.json().get("id")
            if project_id:
                requests.delete(f"{BASE_URL}/projects/{project_id}", headers=headers, timeout=TIMEOUT)
        if team_id:
            requests.delete(f"{BASE_URL}/teams/{team_id}", headers=headers, timeout=TIMEOUT)
        if org_id:
            requests.delete(f"{BASE_URL}/organizations/{org_id}", headers=headers, timeout=TIMEOUT)

test_create_project_with_valid_name_and_team_id()
