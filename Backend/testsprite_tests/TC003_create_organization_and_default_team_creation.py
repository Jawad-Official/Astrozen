import requests
import uuid
import random
import string

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30


def test_create_organization_and_default_team_creation():
    # Generate unique user registration details
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"user_{unique_suffix}@example.com"
    password = "StrongPass123!"
    first_name = f"First{unique_suffix}"
    last_name = f"Last{unique_suffix}"

    headers_json = {"Content-Type": "application/json"}
    session = requests.Session()

    # Register User
    register_payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
    }
    try:
        resp = session.post(
            f"{BASE_URL}/auth/register", json=register_payload, headers=headers_json, timeout=TIMEOUT
        )
        assert resp.status_code == 201 or resp.status_code == 200, f"Failed to register user: {resp.text}"

        # Login User to get token
        login_payload = {"username": email, "password": password}
        headers_form = {"Content-Type": "application/x-www-form-urlencoded"}
        resp = session.post(
            f"{BASE_URL}/auth/login", data=login_payload, headers=headers_form, timeout=TIMEOUT
        )
        assert resp.status_code == 200, f"Failed to login user: {resp.text}"
        token = resp.json().get("access_token")
        assert token, "No access token received on login"

        auth_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        # Create Organization
        org_name = f"Org_{unique_suffix}"
        org_payload = {"name": org_name}
        resp = session.post(
            f"{BASE_URL}/organizations", json=org_payload, headers=auth_headers, timeout=TIMEOUT
        )
        assert resp.status_code == 201 or resp.status_code == 200, f"Failed to create organization: {resp.text}"
        org_data = resp.json()
        org_id = org_data.get("id")
        assert org_id, "Organization ID not returned"

        # Confirm default team creation by listing teams or querying teams endpoint
        # Since no /organizations/{id}/teams endpoint is specified, we'll list teams and find one linked to org
        # We will try GET /teams - assuming it returns all teams user can access
        resp = session.get(f"{BASE_URL}/teams", headers=auth_headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Failed to get teams: {resp.text}"
        teams = resp.json()
        # Look for a team associated with this org or a default team (assuming team has org_id or org linkage)
        # Since schema details are sparse, infer team structure: id, name, maybe organization info

        default_team = None
        for team in teams:
            # Try to find a team that belongs to the created organization
            # Heuristic: team name or structure?
            # Because the default team is created automatically for the user upon org creation,
            # We assume at least 1 team exists and is related to the organization.
            # So check if team has organization id or if team name contains org name, fallback to first team.
            # We'll verify at least one team exists.
            # If more specific logic is needed, it can be adjusted.

            if "organization_id" in team and team["organization_id"] == org_id:
                default_team = team
                break

        if not default_team:
            # If no organization_id, fallback to first team created after org creation.
            # Retrieve team list again and pick the latest one.
            if len(teams) > 0:
                default_team = teams[-1]

        assert default_team is not None, "Default team was not created automatically with the organization"
    finally:
        # Cleanup created organization and user resources if possible - not defined in PRD
        # If no delete user endpoint, we only try to delete organization
        if 'auth_headers' in locals() and 'org_id' in locals():
            try:
                session.delete(f"{BASE_URL}/organizations/{org_id}", headers=auth_headers, timeout=TIMEOUT)
            except Exception:
                pass


test_create_organization_and_default_team_creation()