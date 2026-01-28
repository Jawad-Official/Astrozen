import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

def test_create_issue_with_valid_feature_and_status():
    unique_suffix = str(uuid.uuid4())
    email = f"testuser_{unique_suffix}@example.com"
    password = "Password123!"
    first_name = f"TestFirst{unique_suffix[:8]}"
    last_name = f"TestLast{unique_suffix[9:13]}"

    headers = {"Content-Type": "application/json"}

    # Register user
    reg_payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
    }
    reg_resp = requests.post(f"{BASE_URL}/auth/register", json=reg_payload, timeout=TIMEOUT)
    assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"

    # Login to get JWT token
    login_data = {"username": email, "password": password}
    login_resp = requests.post(f"{BASE_URL}/auth/login", data=login_data, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_json = login_resp.json()
    assert "access_token" in login_json, "No access token in login response"
    token = login_json["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Create Organization
    org_name = f"Org_{unique_suffix[:8]}"
    org_payload = {"name": org_name}
    org_resp = requests.post(f"{BASE_URL}/organizations", json=org_payload, headers=auth_headers, timeout=TIMEOUT)
    assert org_resp.status_code == 201, f"Organization creation failed: {org_resp.text}"
    org_id = org_resp.json().get("id")
    assert org_id, "Organization ID missing in response"

    # Get Default Team from Organization creation (assuming endpoint /teams?organization_id=org_id)
    teams_resp = requests.get(f"{BASE_URL}/teams", headers=auth_headers, timeout=TIMEOUT)
    assert teams_resp.status_code == 200, f"Failed to list teams: {teams_resp.text}"
    teams = teams_resp.json()
    default_team = None
    for team in teams:
        if team.get("organization_id") == org_id:
            default_team = team
            break
    assert default_team is not None, "Default team not found after organization creation"
    team_id = default_team["id"]

    # Create Project linked to the default Team with required icon and color
    project_name = f"Project_{unique_suffix[:8]}"
    project_payload = {"name": project_name, "team_id": team_id, "icon": "🚀", "color": "#FF5733"}
    project_resp = requests.post(f"{BASE_URL}/projects", json=project_payload, headers=auth_headers, timeout=TIMEOUT)
    assert project_resp.status_code == 201, f"Project creation failed: {project_resp.text}"
    project_id = project_resp.json().get("id")
    assert project_id, "Project ID missing in response"

    # Create Feature linked to the Project with valid status
    feature_name = f"Feature_{unique_suffix[:8]}"
    feature_status = "validated"
    feature_payload = {"name": feature_name, "project_id": project_id, "status": feature_status}
    feature_resp = requests.post(f"{BASE_URL}/features", json=feature_payload, headers=auth_headers, timeout=TIMEOUT)
    assert feature_resp.status_code == 201, f"Feature creation failed: {feature_resp.text}"
    feature_data = feature_resp.json()
    feature_id = feature_data.get("id")
    assert feature_id, "Feature ID missing in response"
    assert feature_data.get("status") == feature_status, "Feature status mismatch"

    issue_id = None
    try:
        # Create Issue linked to the Feature with valid status and priority
        issue_title = f"Issue_{unique_suffix[:8]}"
        issue_status = "todo"
        issue_priority = "high"
        issue_payload = {
            "title": issue_title,
            "feature_id": feature_id,
            "status": issue_status,
            "priority": issue_priority
        }
        issue_resp = requests.post(f"{BASE_URL}/issues", json=issue_payload, headers=auth_headers, timeout=TIMEOUT)
        assert issue_resp.status_code == 201, f"Issue creation failed: {issue_resp.text}"
        issue_data = issue_resp.json()
        issue_id = issue_data.get("id")
        assert issue_id, "Issue ID missing in response"
        assert issue_data.get("status") == issue_status, "Issue status mismatch"
        assert issue_data.get("priority") == issue_priority, "Issue priority mismatch"
    finally:
        if issue_id:
            requests.delete(f"{BASE_URL}/issues/{issue_id}", headers=auth_headers, timeout=TIMEOUT)
        if feature_id:
            requests.delete(f"{BASE_URL}/features/{feature_id}", headers=auth_headers, timeout=TIMEOUT)
        if project_id:
            requests.delete(f"{BASE_URL}/projects/{project_id}", headers=auth_headers, timeout=TIMEOUT)
        if org_id:
            requests.delete(f"{BASE_URL}/organizations/{org_id}", headers=auth_headers, timeout=TIMEOUT)

test_create_issue_with_valid_feature_and_status()
