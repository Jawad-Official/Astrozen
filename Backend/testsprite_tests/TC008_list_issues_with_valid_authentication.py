import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

test_user = {
    "email": "user@example.com",
    "password": "string",
    "first_name": "Test",
    "last_name": "User"
}

def register_user():
    url = f"{BASE_URL}/auth/register"
    payload = {
        "email": test_user["email"],
        "password": test_user["password"],
        "first_name": test_user["first_name"],
        "last_name": test_user["last_name"]
    }
    r = requests.post(url, json=payload, timeout=TIMEOUT)
    if r.status_code == 201:
        return True
    elif r.status_code == 400 and ("already registered" in r.text.lower() or "user with this email already exists" in r.text.lower()):
        return True
    else:
        assert False, f"Registration failed with status {r.status_code}: {r.text}"

def login_user():
    url = f"{BASE_URL}/auth/login"
    data = {
        "username": test_user["email"],
        "password": test_user["password"]
    }
    r = requests.post(url, data=data, timeout=TIMEOUT)
    r.raise_for_status()
    resp = r.json()
    assert "access_token" in resp or "token" in resp, "Login response missing access token"
    token = resp.get("access_token") or resp.get("token")
    assert isinstance(token, str) and len(token) > 0
    return token

def create_organization(headers):
    url = f"{BASE_URL}/organizations"
    payload = {"name": f"Test Org {uuid.uuid4()}"}
    r = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    r.raise_for_status()
    org = r.json()
    assert "id" in org
    return org["id"]

def create_team(headers, org_id):
    url = f"{BASE_URL}/teams"
    payload = {
        "name": f"Test Team {uuid.uuid4()}",
        "key": str(uuid.uuid4())
    }
    r = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    r.raise_for_status()
    team = r.json()
    assert "id" in team
    return team["id"]

def create_project(headers, team_id):
    url = f"{BASE_URL}/projects"
    payload = {
        "name": f"Test Project {uuid.uuid4()}",
        "team_id": team_id
    }
    r = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    r.raise_for_status()
    project = r.json()
    assert "id" in project
    return project["id"]

def create_feature(headers, project_id):
    url = f"{BASE_URL}/features"
    payload = {
        "name": f"Test Feature {uuid.uuid4()}",
        "project_id": project_id,
        "status": "discovery"
    }
    r = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    r.raise_for_status()
    feature = r.json()
    assert "id" in feature
    return feature["id"]

def create_issue(headers, feature_id):
    url = f"{BASE_URL}/issues"
    payload = {
        "title": f"Test Issue {uuid.uuid4()}",
        "feature_id": feature_id,
        "status": "backlog"
    }
    r = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    r.raise_for_status()
    issue = r.json()
    assert "id" in issue
    return issue["id"]

def delete_issue(headers, issue_id):
    url = f"{BASE_URL}/issues/{issue_id}"
    try:
        r = requests.delete(url, headers=headers, timeout=TIMEOUT)
        if r.status_code not in (200, 204, 404):
            r.raise_for_status()
    except Exception:
        pass

def delete_feature(headers, feature_id):
    url = f"{BASE_URL}/features/{feature_id}"
    try:
        r = requests.delete(url, headers=headers, timeout=TIMEOUT)
        if r.status_code not in (200, 204, 404):
            r.raise_for_status()
    except Exception:
        pass

def delete_project(headers, project_id):
    url = f"{BASE_URL}/projects/{project_id}"
    try:
        r = requests.delete(url, headers=headers, timeout=TIMEOUT)
        if r.status_code not in (200, 204, 404):
            r.raise_for_status()
    except Exception:
        pass

def delete_team(headers, team_id):
    url = f"{BASE_URL}/teams/{team_id}"
    try:
        r = requests.delete(url, headers=headers, timeout=TIMEOUT)
        if r.status_code not in (200, 204, 404):
            r.raise_for_status()
    except Exception:
        pass

def delete_organization(headers, org_id):
    url = f"{BASE_URL}/organizations/{org_id}"
    try:
        r = requests.delete(url, headers=headers, timeout=TIMEOUT)
        if r.status_code not in (200, 204, 404):
            r.raise_for_status()
    except Exception:
        pass

def test_list_issues_with_valid_authentication():
    register_user()
    token = login_user()
    headers = {"Authorization": f"Bearer {token}"}

    org_id = None
    team_id = None
    project_id = None
    feature_id = None
    issue_id = None

    try:
        org_id = create_organization(headers)
        team_id = create_team(headers, org_id)
        project_id = create_project(headers, team_id)
        feature_id = create_feature(headers, project_id)
        issue_id = create_issue(headers, feature_id)

        list_url = f"{BASE_URL}/issues"
        r_noauth = requests.get(list_url, timeout=TIMEOUT)
        assert r_noauth.status_code == 401 or r_noauth.status_code == 403

        r = requests.get(list_url, headers=headers, timeout=TIMEOUT)
        r.raise_for_status()
        issues = r.json()
        assert isinstance(issues, list), "Issues response is not a list"

        issue_ids = {issue.get("id") for issue in issues if isinstance(issue, dict)}
        assert issue_id in issue_ids, "Created issue not found in issues list"

    finally:
        if issue_id:
            delete_issue(headers, issue_id)
        if feature_id:
            delete_feature(headers, feature_id)
        if project_id:
            delete_project(headers, project_id)
        if team_id:
            delete_team(headers, team_id)
        if org_id:
            delete_organization(headers, org_id)

test_list_issues_with_valid_authentication()
