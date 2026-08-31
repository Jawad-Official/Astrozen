"""Regression tests for the cross-organization IDOR fixes made in Phase 8
(SEC-1, SEC-2, SEC-3). These pin down the exact behavior fixed there so a
future change can't silently reintroduce the bypass - see
SECURITY_FINDINGS.md for the original findings and the corresponding
`fix(security): ...` commits for the verification these tests are
based on.
"""
from app.core.security import create_access_token
from app.models.organization import Organization
from app.models.team_model import Team
from app.models.user import User
from app.models.project import Project
from app.models.document import Document
from app.models.project_idea import ProjectIdea
from app.models.feature import Feature


def _make_org_with_admin_and_team(db_session, org_name, admin_email):
    org = Organization(name=org_name)
    db_session.add(org)
    db_session.flush()
    team = Team(organization_id=org.id, identifier=org_name[:3].upper(), name=f"{org_name} Team")
    db_session.add(team)
    db_session.flush()
    admin = User(
        email=admin_email, first_name="Admin", last_name=org_name,
        role="admin", is_active=True, organization_id=org.id, hashed_password="x",
    )
    db_session.add(admin)
    db_session.flush()
    return org, team, admin


def _token_for(user) -> str:
    return create_access_token(data={"sub": str(user.id)})


def test_sec1_admin_cannot_manage_other_orgs_project(client, db_session):
    """SEC-1: an org-A admin must not be able to PATCH an org-B project."""
    org_a, team_a, admin_a = _make_org_with_admin_and_team(db_session, "OrgA", "admin_a@example.com")
    org_b, team_b, admin_b = _make_org_with_admin_and_team(db_session, "OrgB", "admin_b@example.com")

    project_b = Project(name="Org B Project", team_id=team_b.id, icon="x", color="#000")
    db_session.add(project_b)
    db_session.commit()

    token_a = _token_for(admin_a)
    resp = client.patch(
        f"/api/v1/projects/{project_b.id}",
        json={"name": "Renamed by attacker"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp.status_code in (403, 404), resp.text

    # Regression check: org B's own admin can still manage their own project.
    token_b = _token_for(admin_b)
    resp_ok = client.patch(
        f"/api/v1/projects/{project_b.id}",
        json={"name": "Renamed by owner"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp_ok.status_code == 200, resp_ok.text


def test_sec3_cannot_read_other_orgs_document(client, db_session):
    """SEC-3: a user must not be able to GET another organization's document."""
    org_a, team_a, admin_a = _make_org_with_admin_and_team(db_session, "DocOrgA", "docadmin_a@example.com")
    org_b, team_b, admin_b = _make_org_with_admin_and_team(db_session, "DocOrgB", "docadmin_b@example.com")

    project_b = Project(name="Org B Project", team_id=team_b.id, icon="x", color="#000")
    db_session.add(project_b)
    db_session.flush()
    doc_b = Document(project_id=project_b.id, drive_file_id="drive-b", r2_path="r2/b.md", title="B doc")
    db_session.add(doc_b)
    db_session.commit()

    token_a = _token_for(admin_a)
    resp = client.get(
        f"/api/v1/documents/doc/{doc_b.id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp.status_code == 404, resp.text

    token_b = _token_for(admin_b)
    resp_ok = client.get(
        f"/api/v1/documents/doc/{doc_b.id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp_ok.status_code == 200, resp_ok.text


def test_sec2_cannot_read_another_users_idea(client, db_session):
    """SEC-2: a user must not be able to GET another user's AI idea, even
    within the same organization (idea ownership, not org membership, is
    the boundary for this resource)."""
    org, team, _ = _make_org_with_admin_and_team(db_session, "IdeaOrg", "unused@example.com")
    user_owner = User(
        email="owner@example.com", first_name="Owner", last_name="U",
        role="member", is_active=True, organization_id=org.id, hashed_password="x",
    )
    user_other = User(
        email="other@example.com", first_name="Other", last_name="U",
        role="member", is_active=True, organization_id=org.id, hashed_password="x",
    )
    db_session.add_all([user_owner, user_other])
    db_session.flush()

    idea = ProjectIdea(user_id=user_owner.id, raw_input="a confidential business idea")
    db_session.add(idea)
    db_session.commit()

    token_other = _token_for(user_other)
    resp = client.get(
        f"/api/v1/ai/idea/{idea.id}",
        headers={"Authorization": f"Bearer {token_other}"},
    )
    assert resp.status_code == 404, resp.text

    token_owner = _token_for(user_owner)
    resp_ok = client.get(
        f"/api/v1/ai/idea/{idea.id}",
        headers={"Authorization": f"Bearer {token_owner}"},
    )
    assert resp_ok.status_code == 200, resp_ok.text


def test_sec5_milestone_create_and_update_require_feature_edit_permission(client, db_session):
    """SEC-5: create_milestone/update_milestone must require the same
    check_can_edit_feature permission delete_milestone already had - a
    plain org member with no project-management role and no ownership of
    the feature must not be able to create or rename milestones."""
    org, team, _admin = _make_org_with_admin_and_team(db_session, "MilestoneOrg", "unused2@example.com")
    plain_member = User(
        email="plainmember@example.com", first_name="Plain", last_name="Member",
        role="member", is_active=True, organization_id=org.id, hashed_password="x",
    )
    db_session.add(plain_member)
    db_session.flush()

    project = Project(name="Milestone Project", team_id=team.id, icon="x", color="#000")
    db_session.add(project)
    db_session.flush()
    feature = Feature(project_id=project.id, name="A Feature", identifier=f"{team.identifier}-F1")
    db_session.add(feature)
    db_session.commit()

    token = _token_for(plain_member)

    create_resp = client.post(
        f"/api/v1/features/{feature.id}/milestones",
        json={"name": "Unauthorized milestone"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_resp.status_code == 403, create_resp.text

    from app.models.feature import Milestone
    existing_milestone = Milestone(feature_id=feature.id, name="Existing")
    db_session.add(existing_milestone)
    db_session.commit()

    update_resp = client.patch(
        f"/api/v1/features/{feature.id}/milestones/{existing_milestone.id}",
        json={"name": "Renamed by attacker"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update_resp.status_code == 403, update_resp.text
