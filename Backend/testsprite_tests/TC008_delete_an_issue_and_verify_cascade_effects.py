import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"
USERNAME = "user@example.com"
PASSWORD = "string"
TIMEOUT = 30


def test_TC008_delete_issue_and_verify_cascade_effects():
    # Authenticate and get JWT token
    auth_resp = requests.post(
        f"{BASE_URL}/login",
        json={"email": USERNAME, "password": PASSWORD},
        timeout=TIMEOUT,
    )
    assert auth_resp.status_code == 200, f"Login failed: {auth_resp.text}"
    token = auth_resp.json().get("access_token")
    assert token, "Access token missing in login response"

    headers = {"Authorization": f"Bearer {token}"}

    # Create a project (required to create a feature)
    project_name = f"Test Project {uuid.uuid4()}"
    create_proj_resp = requests.post(
        f"{BASE_URL}/projects",
        json={"name": project_name},
        headers=headers,
        timeout=TIMEOUT,
    )
    assert create_proj_resp.status_code == 201, f"Project creation failed: {create_proj_resp.text}"
    project_id = create_proj_resp.json().get("id")
    assert project_id, "Project ID missing in creation response"

    try:
        # Create a feature linked to project (needed for issue creation)
        feature_payload = {"name": f"Test Feature {uuid.uuid4()}", "project_id": project_id}
        create_feature_resp = requests.post(
            f"{BASE_URL}/features",
            json=feature_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert create_feature_resp.status_code == 201, f"Feature creation failed: {create_feature_resp.text}"
        feature_id = create_feature_resp.json().get("id")
        assert feature_id, "Feature ID missing in creation response"

        try:
            # Create an issue linked to feature
            issue_payload = {
                "title": f"Test Issue {uuid.uuid4()}",
                "feature_id": feature_id,
                "description": "Issue for cascade delete test",
                "status": "open",
            }
            create_issue_resp = requests.post(
                f"{BASE_URL}/issues",
                json=issue_payload,
                headers=headers,
                timeout=TIMEOUT,
            )
            assert create_issue_resp.status_code == 201, f"Issue creation failed: {create_issue_resp.text}"
            issue_id = create_issue_resp.json().get("id")
            assert issue_id, "Issue ID missing in creation response"

            # Delete the issue
            delete_issue_resp = requests.delete(
                f"{BASE_URL}/issues/{issue_id}",
                headers=headers,
                timeout=TIMEOUT,
            )
            assert delete_issue_resp.status_code == 204, f"Issue deletion failed: {delete_issue_resp.text}"

            # Verify issue is deleted (should return 404)
            get_deleted_resp = requests.get(
                f"{BASE_URL}/issues/{issue_id}", headers=headers, timeout=TIMEOUT
            )
            assert get_deleted_resp.status_code == 404, "Deleted issue still accessible"

            # Verify no orphan records of the issue remain
            # Check feature still exists
            get_feature_resp = requests.get(
                f"{BASE_URL}/features/{feature_id}", headers=headers, timeout=TIMEOUT
            )
            assert get_feature_resp.status_code == 200, "Feature missing after issue deletion"

            # Check project still exists
            get_project_resp = requests.get(
                f"{BASE_URL}/projects/{project_id}", headers=headers, timeout=TIMEOUT
            )
            assert get_project_resp.status_code == 200, "Project missing after issue deletion"

            # Optionally, verify issue list for the feature does not include the deleted issue
            list_issues_resp = requests.get(
                f"{BASE_URL}/issues", headers=headers, timeout=TIMEOUT
            )
            assert list_issues_resp.status_code == 200, "Failed to list issues after deletion"
            issues = list_issues_resp.json()
            issue_ids = {issue.get("id") for issue in issues if "id" in issue}
            assert issue_id not in issue_ids, "Deleted issue still present in issue list"

        finally:
            # Clean up feature
            requests.delete(
                f"{BASE_URL}/features/{feature_id}",
                headers=headers,
                timeout=TIMEOUT,
            )
    finally:
        # Clean up project
        requests.delete(
            f"{BASE_URL}/projects/{project_id}",
            headers=headers,
            timeout=TIMEOUT,
        )


test_TC008_delete_issue_and_verify_cascade_effects()