import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

REGISTER_URL = f"{BASE_URL}/auth/register"
LOGIN_URL = f"{BASE_URL}/auth/login"
ORGANIZATIONS_URL = f"{BASE_URL}/organizations"
TEAMS_URL = f"{BASE_URL}/teams"
PROJECTS_URL = f"{BASE_URL}/projects"
FEATURES_URL = f"{BASE_URL}/features"
ISSUES_URL = f"{BASE_URL}/issues"

USER_EMAIL = "user@example.com"
USER_PASSWORD = "string"
USER_FIRST_NAME = "Test"
USER_LAST_NAME = "User"

def register_user():
    payload = {
        "email": USER_EMAIL,
        "password": USER_PASSWORD,
        "first_name": USER_FIRST_NAME,
        "last_name": USER_LAST_NAME,
    }
    resp = requests.post(REGISTER_URL, json=payload, timeout=TIMEOUT)
    if resp.status_code not in (201, 409):
        # 201 Created or 409 Conflict if already registered
        resp.raise_for_status()

def login_user():
    data = {
        "username": USER_EMAIL,
        "password": USER_PASSWORD,
    }
    resp = requests.post(LOGIN_URL, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=TIMEOUT)
    resp.raise_for_status()
    json_resp = resp.json()
    # Assume token is returned in 'access_token' field
    token = json_resp.get("access_token")
    if not token:
        raise Exception("No access_token found in login response")
    return token

def create_team(token, organization_id):
    headers = {"Authorization": f"Bearer {token}"}
    # Team requires name and key, no direct organization link in schema, assuming no org filtering here
    payload = {
        "name": "Test Team",
        "key": str(uuid.uuid4())[:8]
    }
    resp = requests.post(TEAMS_URL, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    team = resp.json()
    return team.get("id")

def create_project(token, team_id):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "name": "Test Project",
        "team_id": team_id
    }
    resp = requests.post(PROJECTS_URL, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    project = resp.json()
    return project.get("id")

def create_feature(token, project_id):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "name": "Test Feature",
        "project_id": project_id,
        "status": "discovery"
    }
    resp = requests.post(FEATURES_URL, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    feature = resp.json()
    return feature.get("id")

def create_issue(token, feature_id):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "title": "Test Issue",
        "feature_id": feature_id,
        "status": "backlog"
    }
    resp = requests.post(ISSUES_URL, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    issue = resp.json()
    return issue.get("id")

def test_create_organization_with_valid_name():
    register_user()
    token = login_user()
    headers = {"Authorization": f"Bearer {token}"}
    org_payload = {
        "name": "Test Organization"
    }

    org_id = None

    try:
        # Create Organization
        org_resp = requests.post(ORGANIZATIONS_URL, json=org_payload, headers=headers, timeout=TIMEOUT)
        org_resp.raise_for_status()
        assert org_resp.status_code == 201
        org_data = org_resp.json()
        org_id = org_data.get("id")
        assert org_id is not None and isinstance(org_id, str)

        # Create Team under organization for hierarchy
        # The PRD does not specify org_id in team creation, so skipping linking
        team_id = create_team(token, org_id)
        assert team_id is not None and isinstance(team_id, str)

        # Create Project linked to team
        project_id = create_project(token, team_id)
        assert project_id is not None and isinstance(project_id, str)

        # Create Feature linked to project
        feature_id = create_feature(token, project_id)
        assert feature_id is not None and isinstance(feature_id, str)

        # Create Issue linked to feature
        issue_id = create_issue(token, feature_id)
        assert issue_id is not None and isinstance(issue_id, str)

    finally:
        # Clean up: delete org cascades deletes downstream entities if API supports delete
        if org_id:
            try:
                del_resp = requests.delete(f"{ORGANIZATIONS_URL}/{org_id}", headers=headers, timeout=TIMEOUT)
                if del_resp.status_code not in (204, 200, 404):
                    del_resp.raise_for_status()
            except Exception:
                pass

test_create_organization_with_valid_name()