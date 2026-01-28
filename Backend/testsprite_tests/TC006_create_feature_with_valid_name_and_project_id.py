import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

def test_create_feature_with_valid_name_and_project_id():
    unique_suffix = str(uuid.uuid4())
    # User registration data
    user_data = {
        "email": f"testuser_feature_create_{unique_suffix}@example.com",
        "password": "TestPass123!",
        "first_name": "Test",
        "last_name": "User"
    }
    # Register User
    register_resp = requests.post(
        f"{BASE_URL}/auth/register",
        json=user_data,
        timeout=TIMEOUT
    )
    assert register_resp.status_code == 201, f"User registration failed: {register_resp.text}"

    # Login to get JWT token
    login_data = {
        "username": user_data["email"],
        "password": user_data["password"]
    }
    login_resp = requests.post(
        f"{BASE_URL}/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=TIMEOUT
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json().get("access_token")
    assert token, "No access token received on login"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Create organization
    org_payload = {"name": "Org_For_Feature_Test_" + str(uuid.uuid4())}
    org_resp = requests.post(
        f"{BASE_URL}/organizations",
        json=org_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    assert org_resp.status_code == 201, f"Organization creation failed: {org_resp.text}"
    org_id = org_resp.json().get("id")
    assert org_id, "Organization ID not returned"

    # Create team
    team_payload = {
        "name": "Team_For_Feature_Test_" + str(uuid.uuid4()),
        "key": "TF" + str(uuid.uuid4())[:8]
    }
    team_resp = requests.post(
        f"{BASE_URL}/teams",
        json=team_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    assert team_resp.status_code == 201, f"Team creation failed: {team_resp.text}"
    team_id = team_resp.json().get("id")
    assert team_id, "Team ID not returned"

    # Create project with team_id and required fields
    project_payload = {
        "name": "Project_For_Feature_Test_" + str(uuid.uuid4()),
        "team_id": team_id,
        "icon": "default_icon",
        "color": "#000000"
    }
    project_resp = requests.post(
        f"{BASE_URL}/projects",
        json=project_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    assert project_resp.status_code == 201, f"Project creation failed: {project_resp.text}"
    project_id = project_resp.json().get("id")
    assert project_id, "Project ID not returned"

    feature_id = None
    try:
        # Create feature linked to the project
        feature_payload = {
            "name": "Feature_Valid_Name_" + str(uuid.uuid4()),
            "project_id": project_id,
            "status": "discovery"
        }
        feature_resp = requests.post(
            f"{BASE_URL}/features",
            json=feature_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert feature_resp.status_code == 201, f"Feature creation failed: {feature_resp.text}"
        feature_data = feature_resp.json()
        feature_id = feature_data.get("id")
        assert feature_id, "Feature ID not returned"
        # Verify feature is linked to the project
        assert feature_data.get("project_id") == project_id, "Feature project_id mismatch"
        # Verify status is correctly set
        assert feature_data.get("status") == "discovery", "Feature status mismatch"

    finally:
        # Cleanup: Delete the created feature if it exists
        if feature_id:
            requests.delete(
                f"{BASE_URL}/features/{feature_id}",
                headers=headers,
                timeout=TIMEOUT
            )
        # Delete the project
        if project_id:
            requests.delete(
                f"{BASE_URL}/projects/{project_id}",
                headers=headers,
                timeout=TIMEOUT
            )
        # Delete the team
        if team_id:
            requests.delete(
                f"{BASE_URL}/teams/{team_id}",
                headers=headers,
                timeout=TIMEOUT
            )
        # Delete the organization
        if org_id:
            requests.delete(
                f"{BASE_URL}/organizations/{org_id}",
                headers=headers,
                timeout=TIMEOUT
            )
        # Note: User deletion endpoint not described, so user remains.

test_create_feature_with_valid_name_and_project_id()
