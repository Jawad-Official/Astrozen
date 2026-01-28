import requests
import uuid
import datetime

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

def test_create_feature_milestone():
    unique_suffix = str(uuid.uuid4())
    # User registration data
    user_data = {
        "email": f"testuser_milestone_{unique_suffix}@example.com",
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
    org_payload = {"name": "Org_For_Milestone_Test_" + str(uuid.uuid4())}
    org_resp = requests.post(
        f"{BASE_URL}/organizations",
        json=org_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    assert org_resp.status_code == 201, f"Organization creation failed: {org_resp.text}"
    org_id = org_resp.json().get("id")

    # Create team
    team_payload = {
        "name": "Team_For_Milestone_Test_" + str(uuid.uuid4()),
        "identifier": "TM" + str(uuid.uuid4())[:3]
    }
    team_resp = requests.post(
        f"{BASE_URL}/teams",
        json=team_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    assert team_resp.status_code == 201, f"Team creation failed: {team_resp.text}"
    team_id = team_resp.json().get("id")

    # Create project
    project_payload = {
        "name": "Project_For_Milestone_Test_" + str(uuid.uuid4()),
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
    assert project_resp.status_code == 201
    project_id = project_resp.json().get("id")

    # Create feature
    feature_payload = {
        "name": "Feature_For_Milestone_Test_" + str(uuid.uuid4()),
        "project_id": project_id,
        "status": "discovery"
    }
    feature_resp = requests.post(
        f"{BASE_URL}/features",
        json=feature_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    assert feature_resp.status_code == 201
    feature_id = feature_resp.json().get("id")

    try:
        # Create milestone
        milestone_payload = {
            "name": "Test Milestone",
            "description": "Milestone description",
            "target_date": datetime.date.today().isoformat(),
            "completed": False
        }
        milestone_resp = requests.post(
            f"{BASE_URL}/features/{feature_id}/milestones",
            json=milestone_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert milestone_resp.status_code == 201, f"Milestone creation failed: {milestone_resp.text}"
        milestone_data = milestone_resp.json()
        assert milestone_data.get("name") == "Test Milestone"
        milestone_id = milestone_data.get("id")
        assert milestone_id

        # Verify it shows up in feature details
        get_feature_resp = requests.get(
            f"{BASE_URL}/features/{feature_id}",
            headers=headers,
            timeout=TIMEOUT
        )
        assert get_feature_resp.status_code == 200
        milestones = get_feature_resp.json().get("top_level_milestones", [])
        assert any(m["id"] == milestone_id for m in milestones)

        # Update milestone
        update_payload = {"completed": True}
        update_resp = requests.patch(
            f"{BASE_URL}/features/{feature_id}/milestones/{milestone_id}",
            json=update_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert update_resp.status_code == 200
        assert update_resp.json().get("completed") is True

        # Delete milestone
        delete_resp = requests.delete(
            f"{BASE_URL}/features/{feature_id}/milestones/{milestone_id}",
            headers=headers,
            timeout=TIMEOUT
        )
        assert delete_resp.status_code == 204

        # Verify it's gone
        get_feature_resp = requests.get(
            f"{BASE_URL}/features/{feature_id}",
            headers=headers,
            timeout=TIMEOUT
        )
        milestones = get_feature_resp.json().get("top_level_milestones", [])
        assert not any(m["id"] == milestone_id for m in milestones)

    finally:
        # Cleanup
        if feature_id:
            requests.delete(f"{BASE_URL}/features/{feature_id}", headers=headers, timeout=TIMEOUT)
        if project_id:
            requests.delete(f"{BASE_URL}/projects/{project_id}", headers=headers, timeout=TIMEOUT)
        if team_id:
            requests.delete(f"{BASE_URL}/teams/{team_id}", headers=headers, timeout=TIMEOUT)
        if org_id:
            requests.delete(f"{BASE_URL}/organizations/{org_id}", headers=headers, timeout=TIMEOUT)

if __name__ == "__main__":
    test_create_feature_milestone()
    print("Test passed!")
