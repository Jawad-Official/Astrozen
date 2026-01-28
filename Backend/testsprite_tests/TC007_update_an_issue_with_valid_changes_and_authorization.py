import requests

BASE_URL = "http://localhost:8000/api/v1"
USERNAME = "user@example.com"
PASSWORD = "string"
TIMEOUT = 30

def test_TC007_update_issue_with_valid_changes_and_authorization():
    # Step 0: Login to obtain JWT token
    login_payload = {
        "email": USERNAME,
        "password": PASSWORD
    }
    login_resp = requests.post(f"{BASE_URL}/login", json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("access_token")
    assert token, "No access token returned from login"
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Create a project (required hierarchical parent)
    project_payload = {
        "name": "Test Project for Issue Update",
        "description": "Project created for testing issue update",
        "status": "active"
    }
    project_resp = requests.post(f"{BASE_URL}/projects", json=project_payload, headers=headers, timeout=TIMEOUT)
    assert project_resp.status_code == 201, f"Project creation failed: {project_resp.text}"
    project_id = project_resp.json().get("id")
    assert project_id is not None, "Project ID missing in creation response"

    # Step 2: Create a feature linked to the project (required parent of issue)
    feature_payload = {
        "name": "Test Feature for Issue Update",
        "project_id": project_id,
        "description": "Feature created for testing issue update",
        "status": "active"
    }
    feature_resp = requests.post(f"{BASE_URL}/features", json=feature_payload, headers=headers, timeout=TIMEOUT)
    assert feature_resp.status_code == 201, f"Feature creation failed: {feature_resp.text}"
    feature_id = feature_resp.json().get("id")
    assert feature_id is not None, "Feature ID missing in creation response"

    # Step 3: Create an issue linked to the feature
    issue_payload = {
        "title": "Test Issue for Update",
        "feature_id": feature_id,
        "status": "open",
        "assignee": USERNAME,
        "priority": "medium",
        "description": "Issue to be updated in test"
    }
    issue_resp = requests.post(f"{BASE_URL}/issues", json=issue_payload, headers=headers, timeout=TIMEOUT)
    assert issue_resp.status_code == 201, f"Issue creation failed: {issue_resp.text}"
    issue_data = issue_resp.json()
    issue_id = issue_data.get("id")
    assert issue_id is not None, "Issue ID missing in creation response"

    try:
        # Step 4: PATCH update with valid fields (status and assignee)
        update_payload = {
            "status": "in_progress",
            "assignee": USERNAME
        }
        patch_resp = requests.patch(f"{BASE_URL}/issues/{issue_id}", json=update_payload, headers=headers, timeout=TIMEOUT)
        assert patch_resp.status_code == 200, f"Valid update failed: {patch_resp.text}"
        updated_issue = patch_resp.json()
        assert updated_issue.get("status") == "in_progress", "Issue status was not updated correctly"
        assert updated_issue.get("assignee") == USERNAME, "Issue assignee was not updated correctly"

        # Step 5: PATCH update with unauthorized or invalid fields
        # Example: attempt to update with an invalid status
        invalid_update_payload = {
            "status": "non_existent_status"
        }
        invalid_patch_resp = requests.patch(f"{BASE_URL}/issues/{issue_id}", json=invalid_update_payload, headers=headers, timeout=TIMEOUT)
        assert invalid_patch_resp.status_code >= 400, "Invalid status update was not rejected"

        # Step 6: PATCH update without authentication (should be rejected)
        unauth_patch_resp = requests.patch(f"{BASE_URL}/issues/{issue_id}", json=update_payload, timeout=TIMEOUT)
        assert unauth_patch_resp.status_code == 401 or unauth_patch_resp.status_code == 403, "Unauthorized update was not rejected"

    finally:
        # Cleanup - delete issue, feature, project
        requests.delete(f"{BASE_URL}/issues/{issue_id}", headers=headers, timeout=TIMEOUT)
        requests.delete(f"{BASE_URL}/features/{feature_id}", headers=headers, timeout=TIMEOUT)
        requests.delete(f"{BASE_URL}/projects/{project_id}", headers=headers, timeout=TIMEOUT)

test_TC007_update_issue_with_valid_changes_and_authorization()
