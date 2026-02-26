import requests
import string
import random
import time

BASE_URL = "http://localhost:8080/api/v1"
TIMEOUT = 30

def random_string(length=8):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for _ in range(length))

def test_post_api_v1_features_create_feature():
    # Step 1: Register a new user
    unique_suffix = str(int(time.time() * 1000))
    email = f"user_{unique_suffix}@example.com"
    password = "StrongPass123!"
    first_name = "Test"
    last_name = "User"

    register_payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=register_payload, timeout=TIMEOUT)
    assert r.status_code == 201, f"User registration failed: {r.text}"
    user = r.json()
    assert "id" in user and user["email"] == email

    # Step 2: Login to get token
    login_data = {
        "username": email,
        "password": password
    }
    r = requests.post(f"{BASE_URL}/auth/login", data=login_data, timeout=TIMEOUT)
    assert r.status_code == 200, f"Login failed: {r.text}"
    token_resp = r.json()
    token = token_resp.get("access_token") or token_resp.get("token") or token_resp.get("accessToken")
    assert token and isinstance(token, str)

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 3: Create organization
    org_name = "Org_" + random_string(6)
    org_description = "Test organization"
    org_payload = {
        "name": org_name,
        "description": org_description
    }
    r = requests.post(f"{BASE_URL}/organizations", json=org_payload, headers=headers, timeout=TIMEOUT)
    assert r.status_code == 201, f"Organization creation failed: {r.text}"
    organization = r.json()
    org_id = organization.get("id")
    assert org_id

    # Step 4: Create team with unique 5 char identifier
    team_name = "Team_" + random_string(6)
    team_identifier = random_string(5)
    team_payload = {
        "name": team_name,
        "identifier": team_identifier
    }
    r = requests.post(f"{BASE_URL}/teams", json=team_payload, headers=headers, timeout=TIMEOUT)
    assert r.status_code == 201, f"Team creation failed: {r.text}"
    team = r.json()
    team_id = team.get("id")
    assert team_id

    # Step 5: Create project linked to team
    project_name = "Project_" + random_string(6)
    project_description = "Test project"
    project_visibility = "private"
    project_payload = {
        "name": project_name,
        "description": project_description,
        "team_id": team_id,
        "visibility": project_visibility
    }
    r = requests.post(f"{BASE_URL}/projects", json=project_payload, headers=headers, timeout=TIMEOUT)
    assert r.status_code == 201, f"Project creation failed: {r.text}"
    project = r.json()
    project_id = project.get("id")
    assert project_id

    # Step 6: Create feature linked to project
    feature_name = "Feature_" + random_string(6)
    feature_payload = {
        "project_id": project_id,
        "name": feature_name
    }

    feature_id = None
    try:
        r = requests.post(f"{BASE_URL}/features", json=feature_payload, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 201, f"Feature creation failed: {r.text}"
        feature = r.json()
        feature_id = feature.get("id")
        assert feature_id
        assert feature.get("name") == feature_name
        assert feature.get("project_id") == project_id
    finally:
        # Cleanup: delete feature, project, team, organization if API supports delete for these resources
        if feature_id:
            requests.delete(f"{BASE_URL}/features/{feature_id}", headers=headers, timeout=TIMEOUT)
        if project_id:
            requests.delete(f"{BASE_URL}/projects/{project_id}", headers=headers, timeout=TIMEOUT)
        if team_id:
            requests.delete(f"{BASE_URL}/teams/{team_id}", headers=headers, timeout=TIMEOUT)
        if org_id:
            requests.delete(f"{BASE_URL}/organizations/{org_id}", headers=headers, timeout=TIMEOUT)

test_post_api_v1_features_create_feature()