import requests

BASE_URL = "http://localhost:8000/api/v1"
AUTH_URL = f"{BASE_URL}/auth/login"
PROJECTS_URL = f"{BASE_URL}/projects"
FEATURES_URL = f"{BASE_URL}/features"
ISSUES_URL = f"{BASE_URL}/issues"

USERNAME = "user@example.com"
PASSWORD = "string"
TIMEOUT = 30

# Assuming organization_id must be obtained from a valid source or created beforehand
# Here, adding a placeholder organization_id for the test
ORGANIZATION_ID = 1

def test_delete_issue_with_valid_authorization():
    # Authenticate and get JWT token
    login_resp = requests.post(
        AUTH_URL,
        data={"username": USERNAME, "password": PASSWORD},
        timeout=TIMEOUT
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("access_token")
    assert token, "No access token received"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Create a project (required parent)
    project_payload = {
        "name": "Test Project for Deletion",
        "description": "Project for TC009",
        "status": "planned",
        "icon": "📁",
        "color": "#0000FF",
        "organization_id": ORGANIZATION_ID
    }
    project_resp = requests.post(PROJECTS_URL, json=project_payload, headers=headers, timeout=TIMEOUT)
    assert project_resp.status_code == 201, f"Project creation failed: {project_resp.text}"
    project_id = project_resp.json().get("id")
    assert project_id, "No project ID returned"

    # Create a feature under project (required parent for issue)
    feature_payload = {
        "name": "Test Feature for Deletion",
        "problem_statement": "Test problem",
        "success_criteria": "Test criteria",
        "project_id": project_id
    }
    feature_resp = requests.post(f"{PROJECTS_URL}/{project_id}/features", json=feature_payload, headers=headers, timeout=TIMEOUT)
    assert feature_resp.status_code == 201, f"Feature creation failed: {feature_resp.text}"
    feature_id = feature_resp.json().get("id")
    assert feature_id, "No feature ID returned"

    # Create an issue under the feature
    issue_payload = {
        "title": "Test Issue to Delete",
        "description": "Issue created for deletion test",
        "feature_id": feature_id,
        "status": "open",
        "assignee": USERNAME
    }
    issue_resp = requests.post(ISSUES_URL, json=issue_payload, headers=headers, timeout=TIMEOUT)
    assert issue_resp.status_code == 201, f"Issue creation failed: {issue_resp.text}"
    issue_id = issue_resp.json().get("id")
    assert issue_id, "No issue ID returned"

    try:
        # Delete the issue
        del_resp = requests.delete(f"{ISSUES_URL}/{issue_id}", headers=headers, timeout=TIMEOUT)
        assert del_resp.status_code == 204, f"Delete issue failed: {del_resp.status_code} {del_resp.text}"

        # Verify the issue is deleted by trying to GET it (should be 404 or 403)
        get_after_del_resp = requests.get(f"{ISSUES_URL}/{issue_id}", headers=headers, timeout=TIMEOUT)
        assert get_after_del_resp.status_code in (403, 404), "Deleted issue still accessible"

    finally:
        # Cleanup: delete feature and project
        if feature_id:
            requests.delete(f"{FEATURES_URL}/{feature_id}", headers=headers, timeout=TIMEOUT)
        if project_id:
            requests.delete(f"{PROJECTS_URL}/{project_id}", headers=headers, timeout=TIMEOUT)

test_delete_issue_with_valid_authorization()