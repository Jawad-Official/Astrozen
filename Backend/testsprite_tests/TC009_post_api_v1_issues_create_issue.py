import requests
import uuid

BASE_URL = "http://localhost:8080/api/v1"
TIMEOUT = 30

def test_post_api_v1_issues_create_issue():
    # Step 1: Register a new unique user
    unique_suffix = str(uuid.uuid4())[:8]
    email = f"user_{unique_suffix}@example.com"
    password = "Password123!"
    first_name = "Test"
    last_name = "User"

    user = None
    org = None
    team = None
    project = None
    feature = None
    issue = None

    headers = {"Content-Type": "application/json"}

    try:
        # Register user
        resp = requests.post(
            f"{BASE_URL}/auth/register",
            json={
                "email": email,
                "password": password,
                "first_name": first_name,
                "last_name": last_name,
            },
            headers=headers,
            timeout=TIMEOUT,
        )
        assert resp.status_code == 201, f"User registration failed: {resp.text}"
        user = resp.json()
        assert "id" in user

        # Login user to get bearer token
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": email, "password": password},
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200, f"User login failed: {resp.text}"
        token_data = resp.json()
        assert "access_token" in token_data
        access_token = token_data["access_token"]

        auth_headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        # Create organization
        org_name = f"Org_{unique_suffix}"
        resp = requests.post(
            f"{BASE_URL}/organizations",
            headers=auth_headers,
            json={"name": org_name, "description": "Test organization"},
            timeout=TIMEOUT,
        )
        assert resp.status_code == 201, f"Organization creation failed: {resp.text}"
        org = resp.json()
        org_id = org.get("id")
        assert org_id is not None

        # Create team with unique identifier (max 5 chars)
        team_identifier = unique_suffix[:5]
        team_name = f"Team_{unique_suffix}"
        resp = requests.post(
            f"{BASE_URL}/teams",
            headers=auth_headers,
            json={"name": team_name, "identifier": team_identifier},
            timeout=TIMEOUT,
        )
        assert resp.status_code == 201, f"Team creation failed: {resp.text}"
        team = resp.json()
        team_id = team.get("id")
        assert team_id is not None

        # Create project
        project_name = f"Project_{unique_suffix}"
        resp = requests.post(
            f"{BASE_URL}/projects",
            headers=auth_headers,
            json={
                "name": project_name,
                "description": "Test project",
                "team_id": team_id,
                "visibility": "private",
            },
            timeout=TIMEOUT,
        )
        assert resp.status_code == 201, f"Project creation failed: {resp.text}"
        project = resp.json()
        project_id = project.get("id")
        assert project_id is not None

        # Create feature (optional)
        feature_name = f"Feature_{unique_suffix}"
        resp = requests.post(
            f"{BASE_URL}/features",
            headers=auth_headers,
            json={
                "project_id": project_id,
                "name": feature_name,
                # description is optional
            },
            timeout=TIMEOUT,
        )
        assert resp.status_code == 201, f"Feature creation failed: {resp.text}"
        feature = resp.json()
        feature_id = feature.get("id")
        assert feature_id is not None

        # Get current user info for assignee_id
        resp = requests.get(f"{BASE_URL}/auth/me", headers=auth_headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Get current user failed: {resp.text}"
        current_user = resp.json()
        assignee_id = current_user.get("id")
        assert assignee_id is not None

        # Create issue
        issue_title = f"Issue title {unique_suffix}"
        issue_priority = "medium"
        issue_type = "bug"

        issue_payload = {
            "title": issue_title,
            "project_id": project_id,
            "feature_id": feature_id,
            "assignee_id": assignee_id,
            "priority": issue_priority,
            "type": issue_type,
        }

        resp = requests.post(
            f"{BASE_URL}/issues",
            headers=auth_headers,
            json=issue_payload,
            timeout=TIMEOUT,
        )
        assert resp.status_code == 201, f"Issue creation failed: {resp.text}"
        issue = resp.json()
        issue_id = issue.get("id")
        assert issue_id is not None
        assert issue.get("title") == issue_title
        assert issue.get("project_id") == project_id
        # feature_id/assignee_id may appear as keys in response; check if present matches
        if "feature_id" in issue:
            assert issue["feature_id"] == feature_id
        if "assignee_id" in issue:
            assert issue["assignee_id"] == assignee_id
        assert issue.get("priority") == issue_priority
        assert issue.get("type") == issue_type

    finally:
        # Cleanup: delete created issue, feature, project, team, organization, user if possible
        # Delete issue
        if issue and "id" in issue:
            try:
                requests.delete(
                    f"{BASE_URL}/issues/{issue['id']}",
                    headers=auth_headers,
                    timeout=TIMEOUT,
                )
            except Exception:
                pass

        # Delete feature
        if feature and "id" in feature:
            try:
                requests.delete(
                    f"{BASE_URL}/features/{feature['id']}",
                    headers=auth_headers,
                    timeout=TIMEOUT,
                )
            except Exception:
                pass

        # Delete project
        if project and "id" in project:
            try:
                requests.delete(
                    f"{BASE_URL}/projects/{project['id']}",
                    headers=auth_headers,
                    timeout=TIMEOUT,
                )
            except Exception:
                pass

        # Delete team
        if team and "id" in team:
            try:
                requests.delete(
                    f"{BASE_URL}/teams/{team['id']}",
                    headers=auth_headers,
                    timeout=TIMEOUT,
                )
            except Exception:
                pass

        # Delete organization
        if org and "id" in org:
            try:
                requests.delete(
                    f"{BASE_URL}/organizations/{org['id']}",
                    headers=auth_headers,
                    timeout=TIMEOUT,
                )
            except Exception:
                pass

        # No endpoint specified for user deletion, usually not supported; if there was, call here.

test_post_api_v1_issues_create_issue()