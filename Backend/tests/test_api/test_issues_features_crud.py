"""CRUD + permission-denial coverage for the issue and feature routes.

test_authorization.py already pins the cross-org IDOR fixes; this file
covers the more basic gap: whether create/update/delete actually works for
someone with permission, and is actually refused for someone without it,
for issues and features specifically (Phase 6 of the audit remediation).
"""
from app.core.security import create_access_token
from app.models.organization import Organization
from app.models.team_model import Team
from app.models.user import User
from app.models.project import Project
from app.models.feature import Feature


def _token_for(user) -> str:
    return create_access_token(data={"sub": str(user.id)})


def _make_org_team_project(db_session, *, org_name="CrudOrg"):
    org = Organization(name=org_name)
    db_session.add(org)
    db_session.flush()
    team = Team(organization_id=org.id, identifier=org_name[:3].upper(), name=f"{org_name} Team")
    db_session.add(team)
    db_session.flush()
    project = Project(name=f"{org_name} Project", team_id=team.id, icon="x", color="#000")
    db_session.add(project)
    db_session.flush()
    return org, team, project


def _make_admin(db_session, org, email):
    admin = User(
        email=email, first_name="Admin", last_name="U",
        role="admin", is_active=True, organization_id=org.id, hashed_password="x",
    )
    db_session.add(admin)
    db_session.flush()
    return admin


def _make_plain_member(db_session, org, email):
    member = User(
        email=email, first_name="Plain", last_name="Member",
        role="member", is_active=True, organization_id=org.id, hashed_password="x",
    )
    db_session.add(member)
    db_session.flush()
    return member


# --------------------------------------------------------------------------
# Features
# --------------------------------------------------------------------------


def test_admin_can_create_and_update_and_delete_feature(client, db_session):
    org, team, project = _make_org_team_project(db_session, org_name="FeatureCrudOrg")
    admin = _make_admin(db_session, org, "feature_crud_admin@example.com")
    db_session.commit()
    token = _token_for(admin)
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/v1/features",
        json={"name": "New Feature", "project_id": str(project.id)},
        headers=headers,
    )
    assert create_resp.status_code == 201, create_resp.text
    feature_id = create_resp.json()["id"]

    get_resp = client.get(f"/api/v1/features/{feature_id}", headers=headers)
    assert get_resp.status_code == 200, get_resp.text
    assert get_resp.json()["name"] == "New Feature"

    update_resp = client.patch(
        f"/api/v1/features/{feature_id}",
        json={"name": "Renamed Feature"},
        headers=headers,
    )
    assert update_resp.status_code == 200, update_resp.text
    assert update_resp.json()["name"] == "Renamed Feature"

    delete_resp = client.delete(f"/api/v1/features/{feature_id}", headers=headers)
    assert delete_resp.status_code == 204, delete_resp.text

    get_after_delete = client.get(f"/api/v1/features/{feature_id}", headers=headers)
    assert get_after_delete.status_code == 404


def test_plain_member_cannot_create_feature_without_project_management_permission(
    client, db_session
):
    org, team, project = _make_org_team_project(db_session, org_name="FeatureDenyOrg")
    plain_member = _make_plain_member(db_session, org, "feature_deny_member@example.com")
    db_session.commit()
    headers = {"Authorization": f"Bearer {_token_for(plain_member)}"}

    resp = client.post(
        "/api/v1/features",
        json={"name": "Unauthorized Feature", "project_id": str(project.id)},
        headers=headers,
    )
    assert resp.status_code == 403, resp.text


def test_plain_member_cannot_update_or_delete_someone_elses_feature(client, db_session):
    org, team, project = _make_org_team_project(db_session, org_name="FeatureEditDenyOrg")
    plain_member = _make_plain_member(db_session, org, "feature_edit_deny_member@example.com")
    feature = Feature(project_id=project.id, name="Existing Feature", identifier=f"{team.identifier}-F1")
    db_session.add(feature)
    db_session.commit()
    headers = {"Authorization": f"Bearer {_token_for(plain_member)}"}

    update_resp = client.patch(
        f"/api/v1/features/{feature.id}",
        json={"name": "Attacker Renamed This"},
        headers=headers,
    )
    assert update_resp.status_code == 403, update_resp.text

    delete_resp = client.delete(f"/api/v1/features/{feature.id}", headers=headers)
    assert delete_resp.status_code == 403, delete_resp.text


# --------------------------------------------------------------------------
# Issues
# --------------------------------------------------------------------------


def test_team_member_can_create_and_read_issue(client, db_session):
    org, team, project = _make_org_team_project(db_session, org_name="IssueCrudOrg")
    member = _make_plain_member(db_session, org, "issue_crud_member@example.com")
    team.members.append(member)
    feature = Feature(project_id=project.id, name="Issue Feature", identifier=f"{team.identifier}-F1")
    db_session.add(feature)
    db_session.commit()
    headers = {"Authorization": f"Bearer {_token_for(member)}"}

    create_resp = client.post(
        "/api/v1/issues",
        json={"title": "A new bug", "team_id": str(team.id), "feature_id": str(feature.id)},
        headers=headers,
    )
    assert create_resp.status_code == 201, create_resp.text
    issue_id = create_resp.json()["id"]
    assert create_resp.json()["title"] == "A new bug"

    get_resp = client.get(f"/api/v1/issues/{issue_id}", headers=headers)
    assert get_resp.status_code == 200, get_resp.text
    assert get_resp.json()["id"] == issue_id


def test_non_team_member_cannot_create_issue_for_team(client, db_session):
    org, team, project = _make_org_team_project(db_session, org_name="IssueDenyOrg")
    outsider = _make_plain_member(db_session, org, "issue_deny_outsider@example.com")
    feature = Feature(project_id=project.id, name="Issue Feature", identifier=f"{team.identifier}-F1")
    db_session.add(feature)
    db_session.commit()
    headers = {"Authorization": f"Bearer {_token_for(outsider)}"}

    resp = client.post(
        "/api/v1/issues",
        json={"title": "Not my team's problem", "team_id": str(team.id), "feature_id": str(feature.id)},
        headers=headers,
    )
    assert resp.status_code == 403, resp.text


def test_plain_assignee_can_update_own_issue_but_not_others(client, db_session):
    org, team, project = _make_org_team_project(db_session, org_name="IssueEditOrg")
    assignee = _make_plain_member(db_session, org, "issue_edit_assignee@example.com")
    other_member = _make_plain_member(db_session, org, "issue_edit_other@example.com")
    team.members.append(assignee)
    team.members.append(other_member)
    feature = Feature(project_id=project.id, name="Issue Feature", identifier=f"{team.identifier}-F1")
    db_session.add(feature)
    db_session.flush()

    from app.models.issue import Issue

    issue = Issue(
        identifier=f"{team.identifier}-1", title="Assigned issue", team_id=team.id,
        feature_id=feature.id, assignee_id=assignee.id,
    )
    db_session.add(issue)
    db_session.commit()

    assignee_headers = {"Authorization": f"Bearer {_token_for(assignee)}"}
    own_update = client.patch(
        f"/api/v1/issues/{issue.id}",
        json={"title": "Updated by assignee"},
        headers=assignee_headers,
    )
    assert own_update.status_code == 200, own_update.text
    assert own_update.json()["title"] == "Updated by assignee"

    other_headers = {"Authorization": f"Bearer {_token_for(other_member)}"}
    other_update = client.patch(
        f"/api/v1/issues/{issue.id}",
        json={"title": "Hijacked by another member"},
        headers=other_headers,
    )
    assert other_update.status_code == 403, other_update.text


def test_delete_issue_requires_permission(client, db_session):
    org, team, project = _make_org_team_project(db_session, org_name="IssueDeleteOrg")
    admin = _make_admin(db_session, org, "issue_delete_admin@example.com")
    outsider = _make_plain_member(db_session, org, "issue_delete_outsider@example.com")
    feature = Feature(project_id=project.id, name="Issue Feature", identifier=f"{team.identifier}-F1")
    db_session.add(feature)
    db_session.flush()

    from app.models.issue import Issue

    issue = Issue(identifier=f"{team.identifier}-1", title="To be deleted", team_id=team.id, feature_id=feature.id)
    db_session.add(issue)
    db_session.commit()

    outsider_headers = {"Authorization": f"Bearer {_token_for(outsider)}"}
    denied = client.delete(f"/api/v1/issues/{issue.id}", headers=outsider_headers)
    assert denied.status_code == 403, denied.text

    admin_headers = {"Authorization": f"Bearer {_token_for(admin)}"}
    allowed = client.delete(f"/api/v1/issues/{issue.id}", headers=admin_headers)
    assert allowed.status_code == 204, allowed.text
