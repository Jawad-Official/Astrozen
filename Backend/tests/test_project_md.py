"""project.md regeneration must not crash when the idea is linked to a project.

Issue has no project_id column (it reaches a project through its feature);
filtering on it raised AttributeError on every document generation.
"""
import pytest

from app.models.enums import AssetType
from app.models.organization import Organization
from app.models.project_idea import ProjectIdea
from app.models.user import User
from app.models.project import Project
from app.models.team_model import Team
from app.services.project_md_service import project_md_service


@pytest.mark.asyncio
async def test_save_project_md_with_project_id(db_session):
    org = Organization(name="MD Org")
    db_session.add(org)
    db_session.flush()
    user = User(
        email="md@example.com", first_name="M", last_name="D",
        role="member", is_active=True, organization_id=org.id, hashed_password="x",
    )
    db_session.add(user)
    db_session.flush()
    team = Team(organization_id=org.id, identifier="MDT", name="MD Team")
    db_session.add(team)
    db_session.flush()
    project = Project(name="MD Project", team_id=team.id, icon="x", color="#000")
    db_session.add(project)
    db_session.flush()
    idea = ProjectIdea(user_id=user.id, project_id=project.id, raw_input="An idea")
    db_session.add(idea)
    db_session.commit()

    r2_key = await project_md_service.save_project_md(db_session, str(idea.id), str(project.id))

    assert r2_key.endswith("project.md")
    from app.crud import crud_project_idea
    asset = crud_project_idea.project_idea.get_asset(
        db_session, idea_id=str(idea.id), asset_type=AssetType.PROJECT_MD
    )
    assert asset is not None and asset.content
