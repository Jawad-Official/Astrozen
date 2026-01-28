import requests

BASE_URL = "http://localhost:8000/api/v1"
USERNAME = "user@example.com"
PASSWORD = "string"
TIMEOUT = 30


def test_get_issue_by_id_with_valid_authorization():
    session = requests.Session()
    try:
        # Login to get access token
        login_url = f"{BASE_URL}/auth/login"
        login_data = {
            "username": USERNAME,
            "password": PASSWORD
        }
        login_resp = session.post(login_url, data=login_data, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("access_token")
        assert token, "Access token not found in login response"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # To get an issue ID, first create a project, then a feature, then an issue.
        # Create Project
        project_url = f"{BASE_URL}/projects"
        project_payload = {
            "name": "Test Project for TC007",
            "description": "Project created for testing issue retrieval",
            "metadata": {},
            "status": "planned",
            "icon": "rocket",
            "color": "blue"
        }
        project_resp = session.post(project_url, json=project_payload, headers=headers, timeout=TIMEOUT)
        assert project_resp.status_code == 201, f"Project creation failed: {project_resp.text}"
        project_id = project_resp.json().get("id") or project_resp.json().get("project_id")
        assert project_id, "Project ID not returned"

        # Create Feature under Project
        # Corrected endpoint to /features and added project_id in payload as per PRD
        feature_url = f"{BASE_URL}/features"
        feature_payload = {
            "title": "Test Feature for TC007",
            "description": "Feature created for testing issue retrieval",
            "problem_statement": "Test problem",
            "success_criteria": "Test criteria",
            "metadata": {},
            "status": "active",
            "project_id": project_id
        }
        feature_resp = session.post(feature_url, json=feature_payload, headers=headers, timeout=TIMEOUT)
        assert feature_resp.status_code == 201, f"Feature creation failed: {feature_resp.text}"
        feature_id = feature_resp.json().get("id") or feature_resp.json().get("feature_id")
        assert feature_id, "Feature ID not returned"

        # Create Issue under Feature
        issue_url = f"{BASE_URL}/issues"
        issue_payload = {
            "title": "Test Issue for TC007",
            "description": "Issue created for testing get by id",
            "feature_id": feature_id,
            "assignee_id": None,
            "status": "open",
            "priority": "medium",
            "metadata": {}
        }
        issue_resp = session.post(issue_url, json=issue_payload, headers=headers, timeout=TIMEOUT)
        assert issue_resp.status_code == 201, f"Issue creation failed: {issue_resp.text}"
        issue_id = issue_resp.json().get("id") or issue_resp.json().get("issue_id")
        assert issue_id, "Issue ID not returned"

        # Retrieve Issue by ID
        get_issue_url = f"{BASE_URL}/issues/{issue_id}"
        get_resp = session.get(get_issue_url, headers=headers, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Failed to get issue by ID: {get_resp.text}"
        data = get_resp.json()
        assert data.get("id") == issue_id or data.get("issue_id") == issue_id, "Returned issue ID mismatch"
        assert data.get("title") == issue_payload["title"], "Issue title mismatch"
        assert data.get("description") == issue_payload["description"], "Issue description mismatch"
        assert data.get("feature_id") == feature_id, "Issue feature linkage mismatch"

    finally:
        # Cleanup: delete issue, feature, project in reverse order
        if 'issue_id' in locals():
            delete_issue_url = f"{BASE_URL}/issues/{issue_id}"
            session.delete(delete_issue_url, headers=headers, timeout=TIMEOUT)
        if 'feature_id' in locals():
            delete_feature_url = f"{BASE_URL}/features/{feature_id}"
            session.delete(delete_feature_url, headers=headers, timeout=TIMEOUT)
        if 'project_id' in locals():
            delete_project_url = f"{BASE_URL}/projects/{project_id}"
            session.delete(delete_project_url, headers=headers, timeout=TIMEOUT)


test_get_issue_by_id_with_valid_authorization()
