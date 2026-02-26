import requests
import uuid
import random
import string

BASE_URL = "http://localhost:8080/api/v1"
TIMEOUT = 30


def generate_random_email():
    return f"testuser_{uuid.uuid4().hex[:8]}@example.com"


def generate_random_name():
    return f"Name{uuid.uuid4().hex[:6]}"


def generate_team_identifier():
    # max 5 chars alphanumeric lowercase
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))


def register_user(email, password, first_name, last_name):
    url = f"{BASE_URL}/auth/register"
    payload = {
        "email": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name
    }
    resp = requests.post(url, json=payload, timeout=TIMEOUT)
    resp.raise_for_status()
    assert resp.status_code == 201
    user = resp.json()
    assert user.get("email") == email
    return user


def login_user(username, password):
    url = f"{BASE_URL}/auth/login"
    data = {
        "username": username,
        "password": password
    }
    resp = requests.post(url, data=data, timeout=TIMEOUT)
    resp.raise_for_status()
    assert resp.status_code == 200
    token_resp = resp.json()
    token = token_resp.get("access_token") or token_resp.get("token")  # common naming
    assert token is not None and isinstance(token, str) and len(token) > 0
    return token


def create_organization(token, name, description):
    url = f"{BASE_URL}/organizations"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": name, "description": description}
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    assert resp.status_code == 201
    org = resp.json()
    assert org.get("id") is not None
    return org


def create_team(token, name, identifier):
    url = f"{BASE_URL}/teams"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": name, "identifier": identifier}
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    assert resp.status_code == 201
    team = resp.json()
    assert team.get("id") is not None and team.get("identifier") == identifier
    return team


def create_project(token, name, description, team_id, visibility="private"):
    url = f"{BASE_URL}/projects"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": name, "description": description, "team_id": team_id, "visibility": visibility}
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    assert resp.status_code == 201
    project = resp.json()
    assert project.get("id") is not None
    return project


def create_feature(token, project_id, name, description=None):
    url = f"{BASE_URL}/features"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"project_id": project_id, "name": name}
    if description is not None:
        payload["description"] = description
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    assert resp.status_code == 201
    feature = resp.json()
    assert feature.get("id") is not None
    return feature


def create_issue(token, title, project_id, feature_id=None, assignee_id=None, priority="low", issue_type="bug"):
    url = f"{BASE_URL}/issues"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "title": title,
        "project_id": project_id,
        "priority": priority,
        "type": issue_type
    }
    if feature_id:
        payload["feature_id"] = feature_id
    if assignee_id:
        payload["assignee_id"] = assignee_id
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    assert resp.status_code == 201
    issue = resp.json()
    assert issue.get("id") is not None
    return issue


def delete_issue(token, issue_id):
    url = f"{BASE_URL}/issues/{issue_id}"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.delete(url, headers=headers, timeout=TIMEOUT)
    if resp.status_code not in (204, 404):
        resp.raise_for_status()


def delete_feature(token, feature_id):
    url = f"{BASE_URL}/features/{feature_id}"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.delete(url, headers=headers, timeout=TIMEOUT)
    if resp.status_code not in (204, 404):
        resp.raise_for_status()


def delete_project(token, project_id):
    url = f"{BASE_URL}/projects/{project_id}"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.delete(url, headers=headers, timeout=TIMEOUT)
    if resp.status_code not in (204, 404):
        resp.raise_for_status()


def delete_team(token, team_id):
    url = f"{BASE_URL}/teams/{team_id}"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.delete(url, headers=headers, timeout=TIMEOUT)
    if resp.status_code not in (204, 404):
        resp.raise_for_status()


def delete_organization(token, organization_id):
    # No explicit delete endpoint described for orgs, skip delete
    pass


def test_tc010_get_notifications():
    # Prepare unique user and login
    email = generate_random_email()
    password = "TestPass123!"
    first_name = generate_random_name()
    last_name = generate_random_name()

    user = register_user(email, password, first_name, last_name)
    token = login_user(email, password)
    headers = {"Authorization": f"Bearer {token}"}

    # Setup dependent resources: organization, team, project, feature, issue
    org_name = f"Org_{uuid.uuid4().hex[:6]}"
    org_desc = "Test organization description"
    organization = create_organization(token, org_name, org_desc)

    team_identifier = generate_team_identifier()
    team_name = f"Team_{uuid.uuid4().hex[:4]}"
    team = create_team(token, team_name, team_identifier)

    project_name = f"Project_{uuid.uuid4().hex[:6]}"
    project_desc = "Test project description"
    project = create_project(token, project_name, project_desc, team["id"], visibility="private")

    feature_name = f"Feature_{uuid.uuid4().hex[:6]}"
    feature = create_feature(token, project["id"], feature_name)

    issue_title = f"Issue_{uuid.uuid4().hex[:6]}"
    issue = create_issue(token, issue_title, project["id"], feature_id=feature["id"], priority="low", issue_type="bug")

    try:
        # Now perform the GET /notifications with Auth header
        url = f"{BASE_URL}/notifications"
        resp = requests.get(url, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        assert resp.status_code == 200
        notifications = resp.json()
        assert isinstance(notifications, list)
        # Each notification should have at least an id
        if notifications:
            for note in notifications:
                assert "id" in note
                # Optional fields could be validated if desired

    finally:
        # Cleanup created resources in reverse order
        delete_issue(token, issue["id"])
        delete_feature(token, feature["id"])
        delete_project(token, project["id"])
        delete_team(token, team["id"])
        # Organization delete not available


test_tc010_get_notifications()