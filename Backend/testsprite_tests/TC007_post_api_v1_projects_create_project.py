import requests
import string
import random
import time

BASE_URL = "http://localhost:8080/api/v1"
TIMEOUT = 30

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def test_tc007_post_api_v1_projects_create_project():
    # Step 1: Register user
    unique_email = f"testuser_{int(time.time())}@example.com"
    register_data = {
        "email": unique_email,
        "password": "StrongPass123!",
        "first_name": "Test",
        "last_name": "User"
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=register_data, timeout=TIMEOUT)
    assert r.status_code == 201, f"User registration failed: {r.text}"
    user = r.json()
    assert "id" in user and user["email"] == unique_email

    # Step 2: Login user
    login_data = {
        "username": unique_email,
        "password": "StrongPass123!"
    }
    r = requests.post(f"{BASE_URL}/auth/login", data=login_data, timeout=TIMEOUT)
    assert r.status_code == 200, f"User login failed: {r.text}"
    token = r.json().get("access_token")
    assert token, "No access_token received after login"
    headers = {"Authorization": f"Bearer {token}"}

    # Prepare to create organization, team, then project
    organization_id = None
    team_id = None
    project_id = None

    try:
        # Step 3: Create organization
        org_name = f"Org_{random_string(6)}"
        org_desc = "Test organization for project creation"
        org_data = {
            "name": org_name,
            "description": org_desc
        }
        r = requests.post(f"{BASE_URL}/organizations", json=org_data, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 201, f"Organization creation failed: {r.text}"
        organization = r.json()
        organization_id = organization.get("id")
        assert organization_id, "Organization ID missing in response"

        # Step 4: Create team
        team_name = f"Team_{random_string(6)}"
        team_identifier = random_string(5)
        team_data = {
            "name": team_name,
            "identifier": team_identifier
        }
        r = requests.post(f"{BASE_URL}/teams", json=team_data, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 201, f"Team creation failed: {r.text}"
        team = r.json()
        team_id = team.get("id")
        assert team_id, "Team ID missing in response"

        # Step 5: Create project
        project_name = f"Project_{random_string(6)}"
        project_desc = "Test project created via API"
        visibility = "private"
        project_data = {
            "name": project_name,
            "description": project_desc,
            "team_id": team_id,
            "visibility": visibility
        }
        r = requests.post(f"{BASE_URL}/projects", json=project_data, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 201, f"Project creation failed: {r.text}"
        project = r.json()
        project_id = project.get("id")
        assert project_id, "Project ID missing in response"
        assert project.get("name") == project_name
        assert project.get("description") == project_desc
        assert project.get("team_id") == team_id
        assert project.get("visibility") == visibility

    finally:
        # Cleanup created project
        if project_id:
            try:
                r = requests.delete(f"{BASE_URL}/projects/{project_id}", headers=headers, timeout=TIMEOUT)
                assert r.status_code == 204, f"Project deletion failed: {r.text}"
            except Exception:
                pass

        # Cleanup created team
        if team_id:
            try:
                r = requests.delete(f"{BASE_URL}/teams/{team_id}", headers=headers, timeout=TIMEOUT)
                assert r.status_code == 204, f"Team deletion failed: {r.text}"
            except Exception:
                pass

        # Cleanup created organization
        if organization_id:
            try:
                r = requests.delete(f"{BASE_URL}/organizations/{organization_id}", headers=headers, timeout=TIMEOUT)
                # Organization delete might not be supported; ignore if so
            except Exception:
                pass

test_tc007_post_api_v1_projects_create_project()
