import requests

BASE_URL = "http://localhost:8000/api/v1"
USERNAME = "user@example.com"
PASSWORD = "string"
TIMEOUT = 30


def test_get_issue_by_id_with_authorization_checks():
    # Helper to login and get JWT token
    def login():
        url = f"{BASE_URL}/login"
        payload = {"email": USERNAME, "password": PASSWORD}
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        json_data = resp.json()
        token = json_data.get("access_token")
        assert token, "No access token returned after login"
        return token

    # Helper to create a project
    def create_project(headers):
        url = f"{BASE_URL}/projects"
        payload = {
            "name": "Test Project for TC006",
            "description": "Project created for testing issue authorization",
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Project creation failed: {resp.text}"
        return resp.json()["id"]

    # Helper to create an issue under feature
    def create_issue(headers, feature_id):
        url = f"{BASE_URL}/issues"
        payload = {
            "title": "Test Issue for TC006",
            "feature_id": feature_id,
            "description": "Issue created for authorization test",
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Issue creation failed: {resp.text}"
        return resp.json()["id"]

    # Helper to try to get issue by id, returns response
    def get_issue(headers, issue_id):
        url = f"{BASE_URL}/issues/{issue_id}"
        return requests.get(url, headers=headers, timeout=TIMEOUT)

    # Perform login to obtain JWT token
    token = login()
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Create resources (project -> feature -> issue)
    project_id = None
    feature_id = None
    issue_id = None
    try:
        # Create a Project
        project_id = create_project(auth_headers)
        
        # Create a Feature under the project
        feature_create_url = f"{BASE_URL}/features"
        feature_payload = {
            "name": "Test Feature for TC006",
            "project_id": project_id,
        }
        resp_feature = requests.post(feature_create_url, json=feature_payload, headers=auth_headers, timeout=TIMEOUT)
        if resp_feature.status_code == 201:
            feature_id = resp_feature.json()["id"]
        else:
            assert False, f"Feature creation failed or endpoint missing: {resp_feature.status_code} {resp_feature.text}"

        # Create an Issue under the feature
        issue_id = create_issue(auth_headers, feature_id)

        # Positive test: authorized user retrieving the issue
        resp_get = get_issue(auth_headers, issue_id)
        assert resp_get.status_code == 200, f"Failed to get issue with proper authorization: {resp_get.text}"
        issue_data = resp_get.json()
        assert issue_data.get("id") == issue_id, "Retrieved issue id does not match requested id"

        # Negative test: unauthorized user tries to access the issue
        resp_unauth = requests.get(f"{BASE_URL}/issues/{issue_id}", timeout=TIMEOUT)
        assert resp_unauth.status_code in (401, 403), f"Unauthorized access without token should be denied, got {resp_unauth.status_code}"

        # Also test with invalid token
        invalid_headers = {"Authorization": "Bearer invalidtoken123"}
        resp_invalid_token = requests.get(f"{BASE_URL}/issues/{issue_id}", headers=invalid_headers, timeout=TIMEOUT)
        assert resp_invalid_token.status_code in (401, 403), f"Access with invalid token should be denied, got {resp_invalid_token.status_code}"

    finally:
        # Cleanup: delete created issue, feature, and project if they exist, ignoring failures
        if issue_id is not None:
            try:
                r = requests.delete(f"{BASE_URL}/issues/{issue_id}", headers=auth_headers, timeout=TIMEOUT)
                assert r.status_code == 204, f"Failed to delete issue on cleanup: {r.text}"
            except Exception:
                pass
        if feature_id is not None:
            try:
                r = requests.delete(f"{BASE_URL}/features/{feature_id}", headers=auth_headers, timeout=TIMEOUT)
            except Exception:
                pass
        if project_id is not None:
            try:
                r = requests.delete(f"{BASE_URL}/projects/{project_id}", headers=auth_headers, timeout=TIMEOUT)
                assert r.status_code == 204, f"Failed to delete project on cleanup: {r.text}"
            except Exception:
                pass


test_get_issue_by_id_with_authorization_checks()