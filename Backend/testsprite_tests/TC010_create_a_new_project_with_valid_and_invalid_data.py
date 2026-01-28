import requests

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "user@example.com"
PASSWORD = "string"
TIMEOUT = 30

def test_create_project_with_valid_and_invalid_data():
    # Step 1: Login to get JWT token
    login_url = f"{BASE_URL}/auth/login"
    login_payload = {"email": EMAIL, "password": PASSWORD}
    try:
        # Changed json= to data= to send form data instead of json, preventing 422 validation error
        login_resp = requests.post(login_url, data=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        token = login_resp.json().get("access_token")
        assert token, "No access_token in login response"
    except Exception as e:
        assert False, f"Exception during login: {e}"

    headers = {"Authorization": f"Bearer {token}"}

    project_url = f"{BASE_URL}/projects"

    # Valid project data (assume minimal required fields: example name and description)
    valid_project_data = {
        "name": "Test Project Valid",
        "description": "A valid project created during test"
    }

    # Invalid project data samples
    invalid_project_data_list = [
        {},  # Empty payload
        {"name": ""},  # Empty name
        {"name": "A"*300},  # Name too long (assuming length limit)
        {"description": 12345},  # Wrong type for description
        {"name": None},  # Null name
    ]

    created_project_id = None
    try:
        # Test creating project with valid data
        resp_valid = requests.post(project_url, json=valid_project_data, headers=headers, timeout=TIMEOUT)
        assert resp_valid.status_code == 201, f"Valid project creation failed with status {resp_valid.status_code}"
        resp_json = resp_valid.json()
        # Expecting at least an 'id' field for the created project
        created_project_id = resp_json.get("id")
        assert created_project_id is not None, "Created project ID is missing in response"

        # Test creating projects with invalid data; expect 400 Bad Request or similar error status
        for invalid_data in invalid_project_data_list:
            resp_invalid = requests.post(project_url, json=invalid_data, headers=headers, timeout=TIMEOUT)
            assert 400 <= resp_invalid.status_code < 500, (
                f"Creating project with invalid data {invalid_data} did not fail as expected, status {resp_invalid.status_code}"
            )

        # Test unauthorized attempt: no auth headers
        resp_unauth = requests.post(project_url, json=valid_project_data, timeout=TIMEOUT)
        assert resp_unauth.status_code == 401 or resp_unauth.status_code == 403, (
            f"Unauthorized project creation did not fail as expected, got status {resp_unauth.status_code}"
        )

    finally:
        # Cleanup - delete the created project if exists
        if created_project_id:
            delete_url = f"{project_url}/{created_project_id}"
            try:
                del_resp = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
                # Allowed deleted status codes could be 204 or 200 depending on API
                assert del_resp.status_code in (200, 204), f"Failed to delete project with id {created_project_id}"
            except Exception as e:
                assert False, f"Exception during cleanup delete: {e}"

test_create_project_with_valid_and_invalid_data()
