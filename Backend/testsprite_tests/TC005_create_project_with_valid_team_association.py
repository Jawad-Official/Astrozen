import requests
import uuid
import random
import string

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def test_create_project_with_valid_team_association():
    # Step 1: Register a new user (unique email)
    email = f"testuser_{random_string()}@example.com"
    password = "TestPass123!"
    first_name = "Test"
    last_name = "User"
    register_payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name
    }
    register_resp = requests.post(f"{BASE_URL}/auth/register", json=register_payload, timeout=TIMEOUT)
    assert register_resp.status_code == 201, f"User registration failed: {register_resp.text}"

    # Step 2: Login to obtain access token
    login_data = {
        "username": email,
        "password": password
    }
    login_resp = requests.post(f"{BASE_URL}/auth/login", data=login_data, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_json = login_resp.json()
    access_token = login_json.get("access_token")
    assert access_token, "Access token not found in login response"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Step 3: Create organization (which auto-creates default team)
    org_name = f"Test Organization {random_string(6)}"
    org_payload = {"name": org_name}
    org_resp = requests.post(f"{BASE_URL}/organizations", json=org_payload, headers=headers, timeout=TIMEOUT)
    assert org_resp.status_code == 201, f"Organization creation failed: {org_resp.text}"
    org_json = org_resp.json()
    org_id = org_json.get("id")
    assert org_id, "Organization ID missing in response"

    # Step 4: Get existing teams to find the default team created with the org
    teams_resp = requests.get(f"{BASE_URL}/teams", headers=headers, timeout=TIMEOUT)
    assert teams_resp.status_code == 200, f"Failed to fetch teams: {teams_resp.text}"
    teams = teams_resp.json()
    # Find a team that belongs to this org; since auto-created team is for the org user
    # Assuming teams contain "organization_id" or linked info; if not, just pick the first team
    default_team = None
    for team in teams:
        # If organization linkage is available, filter by org_id
        # Otherwise pick the first
        if "organization_id" in team and team["organization_id"] == org_id:
            default_team = team
            break
    if not default_team and teams:
        default_team = teams[0]
    assert default_team is not None, "No team found to associate with project"
    team_id = default_team.get("id")
    assert team_id, "Team ID missing"

    # Step 5: Create Project linked to the team
    project_name = f"Project {random_string(6)}"
    project_payload = {
        "name": project_name,
        "team_id": team_id,
        "icon": "default_icon",
        "color": "#000000"
    }

    project_resp = None
    project_id = None
    try:
        project_resp = requests.post(f"{BASE_URL}/projects", json=project_payload, headers=headers, timeout=TIMEOUT)
        assert project_resp.status_code == 201, f"Project creation failed: {project_resp.text}"
        project_json = project_resp.json()
        project_id = project_json.get("id")
        assert project_id, "Project ID missing in response"
        # Validate metadata matches request
        assert project_json.get("name") == project_name, "Project name mismatch"
        assert project_json.get("team_id") == team_id, "Project team_id mismatch"
    finally:
        # Cleanup: delete the created project if exists
        if project_id:
            requests.delete(f"{BASE_URL}/projects/{project_id}", headers=headers, timeout=TIMEOUT)
        # Optionally cleanup: organization and user could be deleted as well if API supports

test_create_project_with_valid_team_association()
