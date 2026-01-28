import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:8000/api/v1"
USERNAME = "user@example.com"
PASSWORD = "string"
TIMEOUT = 30

def test_list_issues_with_filtering_and_pagination():
    # Step 1: Login to get JWT token
    login_url = f"{BASE_URL}/login"
    login_payload = {
        "email": USERNAME,
        "password": PASSWORD
    }
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
    except Exception as e:
        assert False, f"Login request failed: {e}"
    assert login_resp.status_code == 200, f"Expected 200 on login, got {login_resp.status_code}"
    login_json = login_resp.json()
    assert "access_token" in login_json and isinstance(login_json["access_token"], str), "access_token missing in login response"
    token = login_json["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # To test filtering and pagination, we first need an existing project and feature to create an issue,
    # since issues must be linked to a feature. So create a project and a feature, then create some issues.
    # Then test the GET /issues endpoint with filters and pagination.

    # Create a new project
    project_payload = {
        "name": "Test Project for Issues Filtering",
        "description": "Project created during test_list_issues_with_filtering_and_pagination"
    }
    project_url = f"{BASE_URL}/projects"
    try:
        prj_resp = requests.post(project_url, json=project_payload, headers=headers, timeout=TIMEOUT)
    except Exception as e:
        assert False, f"Create project request failed: {e}"
    assert prj_resp.status_code == 201, f"Expected 201 on project creation, got {prj_resp.status_code}"
    project = prj_resp.json()
    project_id = project.get("id")
    assert project_id, "Project ID missing in create project response"

    # Create a feature linked to the project
    feature_payload = {
        "name": "Test Feature for Issues Filtering",
        "project_id": project_id,
        "description": "Feature created during test_list_issues_with_filtering_and_pagination"
    }
    feature_url = f"{BASE_URL}/features"
    try:
        feat_resp = requests.post(feature_url, json=feature_payload, headers=headers, timeout=TIMEOUT)
    except Exception as e:
        # Clean up project before failing
        requests.delete(f"{project_url}/{project_id}", headers=headers, timeout=TIMEOUT)
        assert False, f"Create feature request failed: {e}"
    assert feat_resp.status_code == 201, f"Expected 201 on feature creation, got {feat_resp.status_code}"
    feature = feat_resp.json()
    feature_id = feature.get("id")
    assert feature_id, "Feature ID missing in create feature response"

    def cleanup():
        # Delete feature and project to clean up
        try:
            requests.delete(f"{feature_url}/{feature_id}", headers=headers, timeout=TIMEOUT)
        except:
            pass
        try:
            requests.delete(f"{project_url}/{project_id}", headers=headers, timeout=TIMEOUT)
        except:
            pass

    try:
        # Create multiple issues with varying statuses and assignees to test filtering
        issue_url = f"{BASE_URL}/issues"
        issues_payload = [
            {
                "title": "Issue 1 open assigned to user",
                "feature_id": feature_id,
                "status": "open",
                "assignee": USERNAME,
                "description": "Issue 1 for filtering test"
            },
            {
                "title": "Issue 2 closed assigned to user",
                "feature_id": feature_id,
                "status": "closed",
                "assignee": USERNAME,
                "description": "Issue 2 for filtering test"
            },
            {
                "title": "Issue 3 open unassigned",
                "feature_id": feature_id,
                "status": "open",
                "description": "Issue 3 for filtering test"
            },
            {
                "title": "Issue 4 in_progress assigned to other user",
                "feature_id": feature_id,
                "status": "in_progress",
                "assignee": "otheruser@example.com",
                "description": "Issue 4 for filtering test"
            }
        ]
        created_issue_ids = []
        for ip in issues_payload:
            try:
                resp = requests.post(issue_url, json=ip, headers=headers, timeout=TIMEOUT)
            except Exception as e:
                cleanup()
                assert False, f"Create issue request failed: {e}"
            assert resp.status_code == 201, f"Expected 201 on issue creation, got {resp.status_code}"
            created = resp.json()
            issue_id = created.get("id")
            assert issue_id, "Issue ID missing in create issue response"
            created_issue_ids.append(issue_id)

        # Now test GET /issues without filters and pagination parameters
        list_issues_url = issue_url
        try:
            resp_all = requests.get(list_issues_url, headers=headers, timeout=TIMEOUT)
        except Exception as e:
            cleanup()
            assert False, f"GET /issues request failed: {e}"
        assert resp_all.status_code == 200, f"Expected 200 on list issues, got {resp_all.status_code}"
        issues = resp_all.json()
        assert isinstance(issues, list), "GET /issues response is not a list"
        assert any(i["id"] in created_issue_ids for i in issues), "Created issues not found in list response"

        # Test filtering by status=open
        params_status = {"status": "open"}
        try:
            resp_status = requests.get(list_issues_url, headers=headers, params=params_status, timeout=TIMEOUT)
        except Exception as e:
            cleanup()
            assert False, f"GET /issues with status filter request failed: {e}"
        assert resp_status.status_code == 200
        issues_status = resp_status.json()
        assert all(i.get("status") == "open" for i in issues_status), "Filtering by status=open failed"

        # Test filtering by assignee=user@example.com
        params_assignee = {"assignee": USERNAME}
        try:
            resp_assignee = requests.get(list_issues_url, headers=headers, params=params_assignee, timeout=TIMEOUT)
        except Exception as e:
            cleanup()
            assert False, f"GET /issues with assignee filter request failed: {e}"
        assert resp_assignee.status_code == 200
        issues_assignee = resp_assignee.json()
        # Issues filtered by assignee should have assignee == USERNAME
        assert all(i.get("assignee") == USERNAME for i in issues_assignee), "Filtering by assignee failed"

        # Test combined filtering: status=open & assignee=user@example.com
        params_combined = {"status": "open", "assignee": USERNAME}
        try:
            resp_combined = requests.get(list_issues_url, headers=headers, params=params_combined, timeout=TIMEOUT)
        except Exception as e:
            cleanup()
            assert False, f"GET /issues with combined filters request failed: {e}"
        assert resp_combined.status_code == 200
        issues_combined = resp_combined.json()
        for i in issues_combined:
            assert i.get("status") == "open" and i.get("assignee") == USERNAME, "Filtering by combined criteria failed"

        # Test pagination: limit=2, page=1
        params_pagination = {"limit": 2, "page": 1}
        try:
            resp_pagination = requests.get(list_issues_url, headers=headers, params=params_pagination, timeout=TIMEOUT)
        except Exception as e:
            cleanup()
            assert False, f"GET /issues with pagination request failed: {e}"
        assert resp_pagination.status_code == 200
        issues_page = resp_pagination.json()
        assert len(issues_page) <= 2, "Pagination limit not enforced"
        
        # If API provides total or metadata, test would be more extensive, but not specified

    finally:
        # Clean up created issues
        for iid in created_issue_ids:
            try:
                requests.delete(f"{issue_url}/{iid}", headers=headers, timeout=TIMEOUT)
            except:
                pass
        # Clean up feature and project
        cleanup()

test_list_issues_with_filtering_and_pagination()
