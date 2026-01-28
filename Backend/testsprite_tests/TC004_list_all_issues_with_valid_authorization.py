import requests
import time

BASE_URL = "http://localhost:8000/api/v1"
LOGIN_URL = f"{BASE_URL}/auth/login"
ISSUES_URL = f"{BASE_URL}/issues"
USERNAME = "user@example.com"
PASSWORD = "string"
TIMEOUT = 30

def test_list_all_issues_with_valid_authorization():
    # Step 1: Authenticate to get JWT token
    try:
        login_resp = requests.post(
            LOGIN_URL,
            data={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT
        )
        login_resp.raise_for_status()
        token = login_resp.json().get("access_token")
        assert token, "No access_token found in login response"
    except Exception as e:
        raise AssertionError(f"Login failed: {e}")

    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: Request GET /issues and measure response time
    try:
        start_time = time.time()
        issues_resp = requests.get(ISSUES_URL, headers=headers, timeout=TIMEOUT)
        elapsed_ms = (time.time() - start_time) * 1000
        issues_resp.raise_for_status()
    except Exception as e:
        raise AssertionError(f"Failed to get issues list: {e}")

    # Step 3: Assert status code 200
    assert issues_resp.status_code == 200, f"Expected status 200 but got {issues_resp.status_code}"

    # Step 4: Assert response time under 200ms
    assert elapsed_ms < 200, f"Response time {elapsed_ms:.2f}ms exceeds 200ms"

    # Step 5: Assert response is a list (or a JSON object with a list of issues)
    try:
        data = issues_resp.json()
    except Exception:
        raise AssertionError("Response is not valid JSON")

    assert isinstance(data, (list, dict)), f"Response JSON is not list or dict, got {type(data)}"

test_list_all_issues_with_valid_authorization()