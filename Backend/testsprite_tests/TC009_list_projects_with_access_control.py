import requests

BASE_URL = "http://localhost:8000/api/v1"
AUTH_CREDENTIALS = ("user@example.com", "string")
TIMEOUT = 30

def test_list_projects_with_access_control():
    # Step 1: Login to get JWT access token
    login_url = f"{BASE_URL}/auth/login"
    login_payload = {
        "email": AUTH_CREDENTIALS[0],
        "password": AUTH_CREDENTIALS[1]
    }
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        token = login_data.get("access_token")
        assert token, "No access_token in login response"
    except Exception as e:
        raise AssertionError(f"Authentication failed: {str(e)}")

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Step 2: GET /projects to list accessible projects
    projects_url = f"{BASE_URL}/projects"
    try:
        projects_resp = requests.get(projects_url, headers=headers, timeout=TIMEOUT)
        assert projects_resp.status_code == 200, f"Failed to list projects: {projects_resp.text}"
        projects_data = projects_resp.json()
        # The response should be a list or dict containing projects accessible to user
        # Basic check: projects_data is a list (or dict containing a list), and each project has expected fields
        assert isinstance(projects_data, (list, dict)), "Unexpected response type for projects"
        # If dict, try to find a projects list inside
        projects_list = projects_data if isinstance(projects_data, list) else projects_data.get("projects", [])
        assert isinstance(projects_list, list), "Projects list not found in response"
        # Check each project has 'id' and 'name' fields (common project attributes)
        for project in projects_list:
            assert "id" in project, "Project missing id"
            assert "name" in project, "Project missing name"
    except Exception as e:
        raise AssertionError(f"Error during projects listing: {str(e)}")

test_list_projects_with_access_control()
