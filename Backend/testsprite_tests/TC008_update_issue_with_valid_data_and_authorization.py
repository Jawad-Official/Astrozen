import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"
AUTH_URL = f"{BASE_URL}/auth/login"
ISSUES_URL = f"{BASE_URL}/issues"
PROJECTS_URL = f"{BASE_URL}/projects"
TIMEOUT = 30

USERNAME = "user@example.com"
PASSWORD = "string"

def test_update_issue_with_valid_data_and_authorization():
    # Step 1: Authenticate and get JWT token
    try:
        auth_response = requests.post(
            AUTH_URL,
            data={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT
        )
        assert auth_response.status_code == 200, f"Login failed: {auth_response.text}"
        token = auth_response.json().get("access_token")
        assert token, "No access_token in login response"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    except (requests.RequestException, AssertionError) as e:
        print(f"Authentication error: {e}", file=sys.stderr)
        raise

    # Helper function to create a project
    def create_project():
        project_payload = {
            "name": "Test Project for TC008",
            "description": "Project created for issue update test",
            "status": "planned",
            "icon": "4c1",
            "color": "#123456"
        }
        try:
            resp = requests.post(PROJECTS_URL, json=project_payload, headers=headers, timeout=TIMEOUT)
            assert resp.status_code == 201, f"Project creation failed: {resp.text}"
            return resp.json().get("id")
        except (requests.RequestException, AssertionError) as e:
            raise RuntimeError(f"Create project failed: {e}")

    # Helper function to create a feature linked to project
    def create_feature(project_id):
        feature_payload = {
            "name": "Test Feature for TC008",
            "problem_statement": "Automated test feature",
            "success_criteria": "Feature creation by test",
            "project_id": project_id
        }
        try:
            resp = requests.post(f"{BASE_URL}/features", json=feature_payload, headers=headers, timeout=TIMEOUT)
            assert resp.status_code == 201, f"Feature creation failed: {resp.text}"
            return resp.json().get("id")
        except (requests.RequestException, AssertionError) as e:
            raise RuntimeError(f"Create feature failed: {e}")

    # Helper function to create an issue linked to feature
    def create_issue(feature_id):
        issue_payload = {
            "title": "Initial Issue Title",
            "description": "Initial description",
            "feature_id": feature_id,
            "assignee": USERNAME,
            "status": "open",
            "priority": "medium"
        }
        try:
            resp = requests.post(ISSUES_URL, json=issue_payload, headers=headers, timeout=TIMEOUT)
            assert resp.status_code == 201, f"Issue creation failed: {resp.text}"
            return resp.json().get("id")
        except (requests.RequestException, AssertionError) as e:
            raise RuntimeError(f"Create issue failed: {e}")

    # Helper function to delete issue
    def delete_issue(issue_id):
        try:
            resp = requests.delete(f"{ISSUES_URL}/{issue_id}", headers=headers, timeout=TIMEOUT)
            assert resp.status_code == 204, f"Issue deletion failed: {resp.text}"
        except (requests.RequestException, AssertionError) as e:
            print(f"Warning: failed to delete issue {issue_id}: {e}", file=sys.stderr)

    # Helper function to delete feature
    def delete_feature(feature_id):
        try:
            resp = requests.delete(f"{BASE_URL}/features/{feature_id}", headers=headers, timeout=TIMEOUT)
            if resp.status_code != 204:
                print(f"Warning: failed to delete feature {feature_id}: {resp.text}", file=sys.stderr)
        except requests.RequestException as e:
            print(f"Warning: failed to delete feature {feature_id}: {e}", file=sys.stderr)

    # Helper function to delete project
    def delete_project(project_id):
        try:
            resp = requests.delete(f"{PROJECTS_URL}/{project_id}", headers=headers, timeout=TIMEOUT)
            if resp.status_code != 204:
                print(f"Warning: failed to delete project {project_id}: {resp.text}", file=sys.stderr)
        except requests.RequestException as e:
            print(f"Warning: failed to delete project {project_id}: {e}", file=sys.stderr)

    project_id = None
    feature_id = None
    issue_id = None

    try:
        # Create project, feature, and issue to update
        project_id = create_project()
        feature_id = create_feature(project_id)
        issue_id = create_issue(feature_id)

        # Prepare PATCH payload to update the issue
        update_payload = {
            "title": "Updated Issue Title",
            "description": "Updated description with valid data",
            "status": "in_progress",
            "priority": "high"
        }

        # Send PATCH request to update the issue
        patch_response = requests.patch(
            f"{ISSUES_URL}/{issue_id}",
            json=update_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert patch_response.status_code == 200, f"Update issue failed: {patch_response.text}"

        updated_issue = patch_response.json()
        assert updated_issue.get("id") == issue_id, "Updated issue ID mismatch"
        assert updated_issue.get("title") == update_payload["title"], "Title not updated correctly"
        assert updated_issue.get("description") == update_payload["description"], "Description not updated correctly"
        assert updated_issue.get("status") == update_payload["status"], "Status not updated correctly"
        assert updated_issue.get("priority") == update_payload["priority"], "Priority not updated correctly"

    finally:
        # Cleanup resources
        if issue_id:
            delete_issue(issue_id)
        if feature_id:
            delete_feature(feature_id)
        if project_id:
            delete_project(project_id)

test_update_issue_with_valid_data_and_authorization()
