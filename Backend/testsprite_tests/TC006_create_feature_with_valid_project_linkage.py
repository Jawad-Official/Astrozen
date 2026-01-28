import requests
import uuid
import time

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

def test_create_feature_with_valid_project_linkage():
    unique_suffix = str(uuid.uuid4())
    user_email = f"user_{unique_suffix}@example.com"
    user_password = "TestPass123!"
    first_name = "TestFirstName"
    last_name = "TestLastName"
    org_name = f"Org_{unique_suffix}"
    team_name = f"Team_{unique_suffix}"
    team_identifier = f"identifier_{unique_suffix}"
    project_name = f"Project_{unique_suffix}"
    feature_name = f"Feature_{unique_suffix}"
    
    headers = {"Content-Type": "application/json"}

    # Step 1: Register user
    register_payload = {
        "email": user_email,
        "password": user_password,
        "first_name": first_name,
        "last_name": last_name,
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=register_payload, timeout=TIMEOUT)
    assert r.status_code == 201 or r.status_code == 200, f"Failed to register user: {r.text}"

    # Step 2: Login to get access token
    login_data = {
        "username": user_email,
        "password": user_password
    }
    r = requests.post(f"{BASE_URL}/auth/login", data=login_data, timeout=TIMEOUT)
    assert r.status_code == 200, f"Failed to login: {r.text}"
    login_res = r.json()
    assert "access_token" in login_res or "token" in login_res, f"No token in login response: {login_res}"
    token = login_res.get("access_token") or login_res.get("token")
    auth_headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    created_org_id = None
    created_team_id = None
    created_project_id = None
    created_feature_id = None

    try:
        # Step 3: Create organization
        org_payload = {"name": org_name}
        r = requests.post(f"{BASE_URL}/organizations", json=org_payload, headers=auth_headers, timeout=TIMEOUT)
        assert r.status_code == 201 or r.status_code == 200, f"Failed to create organization: {r.text}"
        org = r.json()
        created_org_id = org.get("id")
        assert created_org_id, f"Organization ID not returned: {org}"

        # Because org creation automatically creates default team. But we will create a new team to attach project.
        # Step 4: Create team with unique identifier
        team_payload = {
            "name": team_name,
            "identifier": team_identifier
        }
        r = requests.post(f"{BASE_URL}/teams", json=team_payload, headers=auth_headers, timeout=TIMEOUT)
        assert r.status_code == 201 or r.status_code == 200, f"Failed to create team: {r.text}"
        team = r.json()
        created_team_id = team.get("id")
        assert created_team_id, f"Team ID not returned: {team}"

        # Step 5: Create project linked to the team
        project_payload = {
            "name": project_name,
            "team_id": created_team_id
        }
        r = requests.post(f"{BASE_URL}/projects", json=project_payload, headers=auth_headers, timeout=TIMEOUT)
        assert r.status_code == 201 or r.status_code == 200, f"Failed to create project: {r.text}"
        project = r.json()
        created_project_id = project.get("id")
        assert created_project_id, f"Project ID not returned: {project}"

        # Step 6: Create feature linked to the project, test all valid statuses accepted and enforced.
        # For brevity test one valid status, other statuses have same rules.
        valid_statuses = [
            "discovery",
            "validated",
            "in_build",
            "in_review",
            "shipped",
            "adopted",
            "killed"
        ]
        for status in valid_statuses:
            feature_payload = {
                "name": f"{feature_name}_{status}",
                "project_id": created_project_id,
                "status": status
            }
            r = requests.post(f"{BASE_URL}/features", json=feature_payload, headers=auth_headers, timeout=TIMEOUT)
            assert r.status_code == 201 or r.status_code == 200, f"Failed to create feature with status '{status}': {r.text}"
            feature = r.json()
            fid = feature.get("id")
            assert fid, f"Feature ID not returned for status '{status}': {feature}"
            # Clean up feature immediately to avoid accumulation
            del_r = requests.delete(f"{BASE_URL}/features/{fid}", headers=auth_headers, timeout=TIMEOUT)
            assert del_r.status_code == 200 or del_r.status_code == 204, f"Failed to delete feature '{fid}' during cleanup: {del_r.text}"

        # Finally create one feature for the main test to ensure independent resource for possible further use
        feature_payload = {
            "name": feature_name,
            "project_id": created_project_id,
            "status": "discovery"
        }
        r = requests.post(f"{BASE_URL}/features", json=feature_payload, headers=auth_headers, timeout=TIMEOUT)
        assert r.status_code == 201 or r.status_code == 200, f"Failed to create feature: {r.text}"
        feature = r.json()
        created_feature_id = feature.get("id")
        assert created_feature_id, f"Feature ID not returned: {feature}"

    finally:
        # Cleanup - delete feature, project, team, organization in reverse order
        if created_feature_id:
            requests.delete(f"{BASE_URL}/features/{created_feature_id}", headers=auth_headers, timeout=TIMEOUT)
        if created_project_id:
            requests.delete(f"{BASE_URL}/projects/{created_project_id}", headers=auth_headers, timeout=TIMEOUT)
        if created_team_id:
            requests.delete(f"{BASE_URL}/teams/{created_team_id}", headers=auth_headers, timeout=TIMEOUT)
        if created_org_id:
            requests.delete(f"{BASE_URL}/organizations/{created_org_id}", headers=auth_headers, timeout=TIMEOUT)

test_create_feature_with_valid_project_linkage()