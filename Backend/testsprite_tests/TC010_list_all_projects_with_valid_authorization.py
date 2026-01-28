import requests
import time

BASE_URL = "http://localhost:8000/api/v1"
LOGIN_URL = f"{BASE_URL}/auth/login"
PROJECTS_URL = f"{BASE_URL}/projects"
USERNAME = "user@example.com"
PASSWORD = "string"

def test_list_all_projects_with_valid_authorization():
    # Authenticate and get JWT token
    try:
        login_response = requests.post(
            LOGIN_URL,
            data={"username": USERNAME, "password": PASSWORD},
            timeout=30
        )
        login_response.raise_for_status()
        token = login_response.json().get("access_token")
        assert token, "Access token not found in login response"
    except Exception as e:
        assert False, f"Failed to login: {e}"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Measure response time for listing projects
    try:
        start_time = time.time()
        response = requests.get(PROJECTS_URL, headers=headers, timeout=30)
        duration_ms = (time.time() - start_time) * 1000
    except Exception as e:
        assert False, f"Request to list projects failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    assert duration_ms < 200, f"Response time {duration_ms:.2f}ms exceeded 200ms limit"

    projects = response.json()
    assert isinstance(projects, list), "Projects response is not a list"

test_list_all_projects_with_valid_authorization()