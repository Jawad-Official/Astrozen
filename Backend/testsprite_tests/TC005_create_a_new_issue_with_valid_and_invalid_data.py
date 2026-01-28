import requests

BASE_URL = "http://localhost:8000/api/v1"
AUTH_BASE_URL = f"{BASE_URL}/auth"
AUTH = ("user@example.com", "string")
TIMEOUT = 30


def test_create_issue_with_valid_and_invalid_data():
    headers = {}

    # Step 1: Login to get JWT token
    login_url = f"{AUTH_BASE_URL}/login"
    login_payload = {"email": AUTH[0], "password": AUTH[1]}
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("access_token")
        assert token, "No access token in login response"
        headers = {"Authorization": f"Bearer {token}"}
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    project_id = None
    feature_id = None
    issue_id = None

    try:
        # Step 2: Create a new project for linking a feature
        project_url = f"{BASE_URL}/projects"
        project_payload = {
            "name": "Test Project for Issue Creation",
            "description": "Project created during test_create_issue_with_valid_and_invalid_data"
        }
        resp_proj = requests.post(project_url, json=project_payload, headers=headers, timeout=TIMEOUT)
        assert resp_proj.status_code == 201, f"Project creation failed: {resp_proj.text}"
        project_id = resp_proj.json().get("id")
        assert project_id, "No project ID returned"

        # Step 3: Create a new feature linked to the project
        feature_url = f"{BASE_URL}/features"
        feature_payload = {
            "name": "Test Feature for Issue Creation",
            "project_id": project_id,
            "description": "Feature created during test for issue creation"
        }
        resp_feat = requests.post(feature_url, json=feature_payload, headers=headers, timeout=TIMEOUT)
        assert resp_feat.status_code == 201, f"Feature creation failed: {resp_feat.text}"
        feature_id = resp_feat.json().get("id")
        assert feature_id, "No feature ID returned"

        # Step 4: Create issue with valid data linked to existing feature
        issues_url = f"{BASE_URL}/issues"
        valid_issue_payload = {
            "title": "Test Issue valid",
            "description": "Issue created with valid feature ID",
            "feature_id": feature_id,
            "priority": "medium",
            "status": "open"
        }
        resp_issue_valid = requests.post(issues_url, json=valid_issue_payload, headers=headers, timeout=TIMEOUT)
        assert resp_issue_valid.status_code == 201, f"Issue creation with valid data failed: {resp_issue_valid.text}"
        issue_id = resp_issue_valid.json().get("id")
        assert issue_id, "No issue ID returned on valid issue creation"

        # Step 5a: Create issue with invalid feature_id (nonexistent)
        invalid_feature_id_payload = {
            "title": "Test Issue invalid feature",
            "description": "Issue with invalid feature ID",
            "feature_id": "00000000-0000-0000-0000-000000000000",  # Assumed invalid UUID
            "priority": "medium",
            "status": "open"
        }
        resp_issue_invalid_feat = requests.post(issues_url, json=invalid_feature_id_payload, headers=headers, timeout=TIMEOUT)
        assert resp_issue_invalid_feat.status_code >= 400 and resp_issue_invalid_feat.status_code < 500, (
            f"Issue creation with invalid feature_id should fail client side: {resp_issue_invalid_feat.text}"
        )

        # Step 5b: Create issue with missing feature_id
        missing_feature_id_payload = {
            "title": "Test Issue missing feature",
            "description": "Issue without feature ID",
            # "feature_id" missing intentionally
            "priority": "medium",
            "status": "open"
        }
        resp_issue_missing_feat = requests.post(issues_url, json=missing_feature_id_payload, headers=headers, timeout=TIMEOUT)
        assert resp_issue_missing_feat.status_code >= 400 and resp_issue_missing_feat.status_code < 500, (
            f"Issue creation missing feature_id should fail client side: {resp_issue_missing_feat.text}"
        )

    finally:
        # Cleanup: Delete created issue if exists
        if issue_id:
            try:
                del_resp = requests.delete(f"{BASE_URL}/issues/{issue_id}", headers=headers, timeout=TIMEOUT)
                assert del_resp.status_code == 204, f"Failed to delete issue: {del_resp.text}"
            except requests.RequestException:
                pass

        # Cleanup: Delete created feature if exists
        if feature_id:
            try:
                del_feature_resp = requests.delete(f"{BASE_URL}/features/{feature_id}", headers=headers, timeout=TIMEOUT)
                if del_feature_resp.status_code not in (204, 404):
                    pass  # Ignore if not found or other error
            except requests.RequestException:
                pass

        # Cleanup: Delete created project if exists
        if project_id:
            try:
                del_project_resp = requests.delete(f"{BASE_URL}/projects/{project_id}", headers=headers, timeout=TIMEOUT)
                if del_project_resp.status_code not in (204, 404):
                    pass
            except requests.RequestException:
                pass


test_create_issue_with_valid_and_invalid_data()