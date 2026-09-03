"""Idea -> Project conversion route."""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from sqlalchemy.orm import Session
from typing import Any
import logging
from app.api import deps
from app.crud.base import _coerce_uuid
from app.crud import crud_project_idea, feature as crud_feature, issue as crud_issue
from app.services.project_md_service import project_md_service
from app.models.project_idea import (
    IdeaStatus,
    AssetType,
    ProjectIdea,
)
from app.models.user import User
from app.models.team_model import Team
from app.models.feature import (
    Feature,
    FeatureStatus,
)
from app.models.issue import Issue, IssueStatus, IssueType
from app.api.v1.ai._shared import AssetParseError, _parse_asset_json

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/idea/{idea_id}/convert", response_model=Any)
async def convert_to_project(
    idea_id: str,
    team_id: str,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 3: Finalize - Converts the validated idea and blueprint into a real Project.
    """
    if not idea.validation_report:
        raise HTTPException(status_code=400, detail="Idea not validated")

    if not deps.check_is_team_member(current_user, team_id, db):
        raise HTTPException(status_code=404, detail="Team not found")

    team = db.query(Team).filter(Team.id == _coerce_uuid(team_id)).first()
    team_prefix = team.identifier if team else "AST"

    from app.models.project import Project, ProjectStatus
    from app.models.feature import Feature, FeatureStatus
    from app.models.issue import Issue, IssueStatus, IssueType

    new_project = Project(
        name=idea.raw_input[:50],
        description=idea.refined_description or idea.raw_input,
        team_id=_coerce_uuid(team_id),
        lead_id=current_user.id,
        status=ProjectStatus.PLANNED,
        icon="🚀",
        color="#3b82f6",
    )
    db.add(new_project)
    db.flush()

    # Create Features
    features_map = {}
    current_feature_num = crud_feature.get_max_identifier_num(db, team_prefix)
    for i, f_data in enumerate(idea.validation_report.core_features):
        current_feature_num += 1
        feature = Feature(
            project_id=new_project.id,
            name=f_data["name"],
            problem_statement=f_data.get("description"),
            status=FeatureStatus.VALIDATED,
            owner_id=current_user.id,
            identifier=f"{team_prefix}-F{current_feature_num}",
        )
        db.add(feature)
        features_map[f_data["name"]] = feature

    db.flush()

    # Create Issues from Kanban
    kanban_asset = crud_project_idea.project_idea.get_asset(
        db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_KANBAN
    )
    if kanban_asset and kanban_asset.content:
        try:
            kanban_data = _parse_asset_json(
                kanban_asset.content, asset_id=kanban_asset.id
            )
            current_issue_num = crud_issue.get_max_identifier_num(db, team_prefix)
            for i, issue_data in enumerate(kanban_data):
                feature_list = list(features_map.values())
                feature_id = (
                    feature_list[i % len(feature_list)].id if feature_list else None
                )

                current_issue_num += 1
                issue = Issue(
                    title=issue_data["title"],
                    status=IssueStatus.TODO,
                    issue_type=IssueType.TASK,
                    team_id=_coerce_uuid(team_id),
                    feature_id=feature_id,
                    identifier=f"{team_prefix}-{current_issue_num}",
                )
                db.add(issue)
        except Exception:
            logger.exception(
                "Failed to create kanban-derived issues for idea %s", idea_id
            )

    idea.status = IdeaStatus.COMPLETED
    idea.project_id = new_project.id
    
    # Link documents to the new project
    from app.models.document import Document
    db.query(Document).filter(Document.idea_id == idea.id).update({"project_id": new_project.id})
    
    db.commit()

    try:
        await project_md_service.save_project_md(
            db, idea_id=idea_id, project_id=str(new_project.id)
        )
        logger.info(f"Generated project.md for idea {idea_id}")
    except Exception:
        logger.exception(f"Failed to generate project.md for idea {idea_id}")

    return {"project_id": str(new_project.id)}
