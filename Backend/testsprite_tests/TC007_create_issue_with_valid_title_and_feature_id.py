import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

def test_create_issue_with_valid_title_and_feature_id():
    session = requests.Session()
    try:
        unique_suffix = str(uuid.uuid4())
        # Register a new user with unique email
        register_data = {
            "email": f"testuser_tc007_{unique_suffix}@example.com",
            "password": "StrongPass!123",
            "first_name": "Test",
            "last_name": "User7"
        }
        r = session.post(f"{BASE_URL}/auth/register", json=register_data, timeout=TIMEOUT)
        assert r.status_code == 201, f"User registration failed: {r.text}"

        # Login to get access token
        login_data = {
            "username": register_data["email"],
            "password": register_data["password"]
        }
        r = session.post(f"{BASE_URL}/auth/login", data=login_data, timeout=TIMEOUT,
                         headers={"Content-Type": "application/x-www-form-urlencoded"})
        assert r.status_code == 200, f"Login failed: {r.text}"
        login_resp = r.json()
        assert "access_token" in login_resp, "No access_token in login response"
        token = login_resp["access_token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # Create organization
        org_data = {"name": "TestOrg_TC007_" + str(uuid.uuid4())}
        r = session.post(f"{BASE_URL}/organizations", json=org_data, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 201, f"Organization create failed: {r.text}"
        org_id = r.json().get("id")
        assert org_id, "Organization ID missing"

        # Create team
        team_data = {
            "name": "TestTeam_TC007",
            "key": "TTTC7_" + str(uuid.uuid4())
        }
        r = session.post(f"{BASE_URL}/teams", json=team_data, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 201, f"Team create failed: {r.text}"
        team_id = r.json().get("id")
        assert team_id, "Team ID missing"

        # Create project linked to team
        project_data = {
            "name": "TestProject_TC007",
            "team_id": team_id
        }
        r = session.post(f"{BASE_URL}/projects", json=project_data, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 201, f"Project create failed: {r.text}"
        project_id = r.json().get("id")
        assert project_id, "Project ID missing"

        # Create feature linked to project
        feature_data = {
            "name": "TestFeature_TC007",
            "project_id": project_id,
            "status": "discovery"
        }
        r = session.post(f"{BASE_URL}/features", json=feature_data, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 201, f"Feature create failed: {r.text}"
        feature_id = r.json().get("id")
        assert feature_id, "Feature ID missing"

        # Now create issue linked to feature, with valid title and status
        issue_data = {
            "title": "Test Issue Title TC007",
            "feature_id": feature_id,
            "status": "backlog"
        }
        r = session.post(f"{BASE_URL}/issues", json=issue_data, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 201, f"Issue create failed: {r.text}"
        issue = r.json()
        issue_id = issue.get("id")
        assert issue_id, "Issue ID missing"

        # Validate returned issue fields
        assert issue.get("title") == issue_data["title"], "Issue title mismatch"
        assert issue.get("feature_id") == feature_id, "Issue feature_id mismatch"
        assert issue.get("status") == "backlog", "Issue status mismatch"

    finally:
        # Clean up created issue
        if 'issue_id' in locals():
            session.delete(f"{BASE_URL}/issues/{issue_id}", headers=headers, timeout=TIMEOUT)
        # Clean up created feature
        if 'feature_id' in locals():
            session.delete(f"{BASE_URL}/features/{feature_id}", headers=headers, timeout=TIMEOUT)
        # Clean up created project
        if 'project_id' in locals():
            session.delete(f"{BASE_URL}/projects/{project_id}", headers=headers, timeout=TIMEOUT)
        # Clean up created team
        if 'team_id' in locals():
            session.delete(f"{BASE_URL}/teams/{team_id}", headers=headers, timeout=TIMEOUT)
        # Clean up created organization
        if 'org_id' in locals():
            session.delete(f"{BASE_URL}/organizations/{org_id}", headers=headers, timeout=TIMEOUT)

test_create_issue_with_valid_title_and_feature_id()
