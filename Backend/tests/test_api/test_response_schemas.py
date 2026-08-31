"""Regression tests for SEC-B6: three routes that previously returned
raw dicts / `response_model=Any` (or, for /me/members, `List[dict]`) now
have real Pydantic response schemas. These pin down that the schemas
actually validate realistic data through the live route rather than
raising ResponseValidationError - the classic failure mode when tightening
a response_model after the fact.
"""
from app.core.security import create_access_token
from app.models.organization import Organization
from app.models.team_model import Team
from app.models.project import Project
from app.models.feature import Feature
from app.models.issue import Issue
from app.models.user import User
from app.models.project_idea import ProjectIdea, ValidationReport, ProjectAsset
from app.models.enums import IdeaStatus, AssetType, AssetStatus, IssueStatus


def _token_for(user) -> str:
    return create_access_token(data={"sub": str(user.id)})


def test_organization_members_endpoint_matches_schema(client, db_session):
    org = Organization(name="SchemaOrg")
    db_session.add(org)
    db_session.flush()
    user = User(
        email="member@example.com", first_name="Mem", last_name="Ber",
        role="member", is_active=True, organization_id=org.id, hashed_password="x",
        job_title="Engineer",
    )
    db_session.add(user)
    db_session.commit()

    resp = client.get(
        "/api/v1/organizations/me/members",
        headers={"Authorization": f"Bearer {_token_for(user)}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert isinstance(body, list) and len(body) == 1
    assert body[0]["email"] == "member@example.com"
    assert body[0]["role"] == "member"


def test_idea_details_endpoint_matches_schema(client, db_session):
    org = Organization(name="IdeaSchemaOrg")
    db_session.add(org)
    db_session.flush()
    team = Team(organization_id=org.id, identifier="ISO", name="Idea Schema Team")
    db_session.add(team)
    db_session.flush()
    user = User(
        email="idea_owner@example.com", first_name="Idea", last_name="Owner",
        role="member", is_active=True, organization_id=org.id, hashed_password="x",
    )
    db_session.add(user)
    db_session.flush()

    idea = ProjectIdea(
        user_id=user.id,
        raw_input="A marketplace for something",
        refined_description="A refined description",
        status=IdeaStatus.VALIDATED,
        clarification_questions=["What is the target market?"],
    )
    db_session.add(idea)
    db_session.flush()

    report = ValidationReport(
        project_idea_id=idea.id,
        market_feasibility={"score": 8},
        improvements=["Improve pricing clarity"],
        core_features=["Feature A", "Feature B"],
        tech_stack={"backend": "FastAPI"},
        pricing_model={"tiers": []},
    )
    db_session.add(report)

    asset = ProjectAsset(
        project_idea_id=idea.id,
        asset_type=AssetType.DIAGRAM_USER_FLOW,
        content="graph TD; A-->B;",
        status=AssetStatus.COMPLETED,
        chat_history=[{"role": "user", "content": "hi"}],
    )
    db_session.add(asset)
    db_session.commit()

    resp = client.get(
        f"/api/v1/ai/idea/{idea.id}",
        headers={"Authorization": f"Bearer {_token_for(user)}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["id"] == str(idea.id)
    assert body["status"] == "VALIDATED"
    assert body["validation_report"]["core_features"] == ["Feature A", "Feature B"]
    assert len(body["assets"]) == 1
    assert body["assets"][0]["asset_type"] == "DIAGRAM_USER_FLOW"
    # Legacy (non-JSON) mermaid content falls back to user_flow_mermaid.
    assert body["blueprint"]["user_flow_mermaid"] == "graph TD; A-->B;"


def test_blueprint_node_details_endpoint_matches_schema(client, db_session):
    org = Organization(name="NodeSchemaOrg")
    db_session.add(org)
    db_session.flush()
    team = Team(organization_id=org.id, identifier="NSO", name="Node Schema Team")
    db_session.add(team)
    db_session.flush()
    user = User(
        email="node_owner@example.com", first_name="Node", last_name="Owner",
        role="member", is_active=True, organization_id=org.id, hashed_password="x",
    )
    db_session.add(user)
    db_session.flush()

    project = Project(name="Node Schema Project", team_id=team.id, icon="x", color="#000")
    db_session.add(project)
    db_session.flush()

    idea = ProjectIdea(user_id=user.id, raw_input="idea", status=IdeaStatus.VALIDATED)
    db_session.add(idea)
    db_session.flush()

    node_id = "node-1"
    feature = Feature(project_id=project.id, name="Feature A", blueprint_node_id=node_id)
    db_session.add(feature)
    db_session.flush()

    issue = Issue(
        identifier="NSO-1", title="Issue A", team_id=team.id, feature_id=feature.id,
        status=IssueStatus.DONE, blueprint_node_id=node_id,
    )
    db_session.add(issue)
    db_session.commit()

    resp = client.get(
        f"/api/v1/ai/idea/{idea.id}/blueprint/node/{node_id}/details",
        headers={"Authorization": f"Bearer {_token_for(user)}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["node_id"] == node_id
    assert body["completion"] == 100
    assert body["stats"] == {"total_issues": 1, "done_issues": 1}
    assert body["issues"][0]["identifier"] == "NSO-1"
    assert body["issues"][0]["status"] == "done"
    assert body["features"][0]["name"] == "Feature A"
