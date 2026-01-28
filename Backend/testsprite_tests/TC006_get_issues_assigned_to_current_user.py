import requests

BASE_URL = "http://localhost:8000/api/v1"
USERNAME = "user@example.com"
PASSWORD = "string"
TIMEOUT = 30

def test_get_issues_assigned_to_current_user():
    # Authenticate and get JWT token
    login_url = f"{BASE_URL}/auth/login"
    login_data = {
        "username": USERNAME,
        "password": PASSWORD
    }
    try:
        login_resp = requests.post(login_url, data=login_data, timeout=TIMEOUT)
        login_resp.raise_for_status()
        token = login_resp.json().get("access_token")
        assert token, "Login did not return access_token"
    except Exception as e:
        assert False, f"Login failed: {e}"

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Get issues assigned to current user
    my_issues_url = f"{BASE_URL}/issues/my-issues"
    try:
        resp = requests.get(my_issues_url, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
    except Exception as e:
        assert False, f"Failed to get issues assigned to current user: {e}"

    assert resp.status_code == 200, f"Expected status code 200 but got {resp.status_code}"

    issues = resp.json()
    assert isinstance(issues, list), "Response is not a list of issues"

    # Verify all issues are assigned to current user
    # First get current user info to confirm user id or identifier
    me_url = f"{BASE_URL}/auth/me"
    try:
        me_resp = requests.get(me_url, headers=headers, timeout=TIMEOUT)
        me_resp.raise_for_status()
    except Exception as e:
        assert False, f"Failed to get current user info: {e}"

    assert me_resp.status_code == 200, f"Expected status code 200 for /auth/me but got {me_resp.status_code}"
    current_user = me_resp.json()

    current_user_id = current_user.get("id")
    assert current_user_id, "Current user ID not found in /auth/me response"

    for issue in issues:
        assignee = issue.get("assignee")
        # The schema is not detailed, but we expect assignee is an object or id
        if assignee is None:
            assert False, f"Issue {issue.get('id')} has no assignee"
        # Check if assignee is a dict with id or directly the user id
        if isinstance(assignee, dict):
            assignee_id = assignee.get("id")
        else:
            assignee_id = assignee
        assert assignee_id == current_user_id, (
            f"Issue {issue.get('id')} assigned to user id {assignee_id}, "
            f"expected current user id {current_user_id}"
        )

test_get_issues_assigned_to_current_user()