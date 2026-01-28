import requests

BASE_URL = "http://localhost:8000/api/v1"
LOGIN_URL = f"{BASE_URL}/auth/login"
PROJECTS_URL = f"{BASE_URL}/projects"
FEATURES_URL = f"{BASE_URL}/features"
ISSUES_URL = f"{BASE_URL}/issues"

USERNAME = "user@example.com"
PASSWORD = "string"
TIMEOUT = 30


def test_create_new_issue_with_valid_feature_linkage():
    # Authenticate user to get JWT token
    login_data = {"username": USERNAME, "password": PASSWORD}
    try:
        login_resp = requests.post(LOGIN_URL, data=login_data, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        access_token = login_resp.json().get("access_token")
        assert access_token, "No access_token found in login response"
        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

        # Create a new project (required for creating a feature)
        project_payload = {
            "name": "Test Project for Issue Creation",
            "description": "Project created during test for issue creation with valid feature linkage",
            "icon": "test-icon",
            "color": "#123456",
            "organization_id": 1
        }
        project_resp = requests.post(PROJECTS_URL, json=project_payload, headers=headers, timeout=TIMEOUT)
        assert project_resp.status_code == 201, f"Project creation failed: {project_resp.text}"
        project_id = project_resp.json().get("id")
        assert project_id is not None, "Created project has no ID"

        try:
            # Create a new feature under the project
            feature_payload = {
                "name": "Test Feature for Issue",
                "project_id": project_id,
                "problem_statement": "Ensure issues can link to features",
                "success_metrics": "Issue creation linked to this feature"
            }
            feature_resp = requests.post(FEATURES_URL, json=feature_payload, headers=headers, timeout=TIMEOUT)
            assert feature_resp.status_code == 201, f"Feature creation failed: {feature_resp.text}"
            feature_id = feature_resp.json().get("id")
            assert feature_id is not None, "Created feature has no ID"

            try:
                # Create a new issue linked to the valid feature
                issue_payload = {
                    "title": "Test issue linked to valid feature",
                    "description": "Creating issue under valid feature linkage",
                    "feature_id": feature_id,
                    "priority": "medium",
                    "status": "open"
                }
                issue_resp = requests.post(ISSUES_URL, json=issue_payload, headers=headers, timeout=TIMEOUT)
                assert issue_resp.status_code == 201, f"Issue creation failed: {issue_resp.text}"
                issue_data = issue_resp.json()
                assert issue_data.get("feature_id") == feature_id, "Issue feature_id does not match linked feature"
                issue_id = issue_data.get("id")
                assert issue_id is not None, "Created issue has no ID"

                # Additional check: try to create an orphan issue (no feature_id) and verify rejection with 422
                orphan_issue_payload = {
                    "title": "Orphan issue test",
                    "description": "This issue has no feature linkage",
                    "priority": "low",
                    "status": "open"
                }
                orphan_resp = requests.post(ISSUES_URL, json=orphan_issue_payload, headers=headers, timeout=TIMEOUT)
                assert orphan_resp.status_code == 422, f"Orphan issue creation must be rejected, got: {orphan_resp.status_code}"

            finally:
                # Cleanup created issue
                if 'issue_id' in locals():
                    requests.delete(f"{ISSUES_URL}/{issue_id}", headers=headers, timeout=TIMEOUT)

            # Cleanup feature
            requests.delete(f"{FEATURES_URL}/{feature_id}", headers=headers, timeout=TIMEOUT)

        finally:
            # Cleanup project
            requests.delete(f"{PROJECTS_URL}/{project_id}", headers=headers, timeout=TIMEOUT)

    except requests.RequestException as e:
        assert False, f"Request failed: {str(e)}"


test_create_new_issue_with_valid_feature_linkage()
