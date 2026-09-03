"""Idea lifecycle routes: submission, clarification, listing, progress, and details."""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
)
from sqlalchemy.orm import Session
from typing import Any, List, Optional
import logging
import json
from sqlalchemy.orm.attributes import flag_modified
from app.api import deps
from app.schemas import ai as schemas
from app.core.rate_limit import limiter
from app.crud.base import _coerce_uuid
from app.crud import crud_project_idea
from app.services.ai_service import ai_service, DOC_ORDER
from app.models.project_idea import (
    IdeaStatus,
    AssetType,
    AssetStatus,
    ProjectIdea,
    ProjectAsset,
)
from app.models.user import User
from app.models.team_model import Team
from app.models.issue import Issue, IssueStatus
from app.api.v1.ai._shared import AssetParseError, _parse_asset_json

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/ideas/{project_id}")
async def get_project_ideas(
    project_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get all ideas for a project, ordered by most recent."""
    deps.verify_project_in_org(db, project_id, current_user)
    ideas = (
        db.query(ProjectIdea)
        .filter(ProjectIdea.project_id == project_id)
        .order_by(ProjectIdea.created_at.desc())
        .all()
    )

    return {
        "ideas": [
            {
                "id": str(idea.id),
                "raw_input": idea.raw_input,
                "refined_description": idea.refined_description,
                "status": idea.status.value if idea.status else None,
                "created_at": idea.created_at.isoformat() if idea.created_at else None,
                "updated_at": idea.updated_at.isoformat() if idea.updated_at else None,
                "has_validation_report": idea.validation_report is not None,
            }
            for idea in ideas
        ]
    }


@router.get("/project/{project_id}/ideas")
async def list_ideas_for_project(
    project_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get all ideas for a specific project, ordered by created_at descending.

    Distinct name from get_project_ideas above - both routes previously
    shared the name get_project_ideas, which silently shadowed the first
    definition in the module namespace (each still worked correctly as a
    route, since FastAPI captures the function object at decoration time,
    but the name collision was a latent trap for anything referencing the
    function directly by name)."""
    deps.verify_project_in_org(db, project_id, current_user)
    ideas = (
        db.query(ProjectIdea)
        .filter(ProjectIdea.project_id == project_id)
        .order_by(ProjectIdea.created_at.desc())
        .all()
    )

    return {
        "ideas": [
            {
                "id": str(idea.id),
                "raw_input": idea.raw_input,
                "refined_description": idea.refined_description,
                "status": idea.status.value,
                "created_at": idea.created_at.isoformat() if idea.created_at else None,
                "updated_at": idea.updated_at.isoformat() if idea.updated_at else None,
            }
            for idea in ideas
        ]
    }


@router.get("/idea/{idea_id}/progress")
async def get_idea_progress(
    idea_id: str,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get progress dashboard for an idea."""

    # Count completed docs
    completed_docs = (
        db.query(ProjectAsset)
        .filter(
            ProjectAsset.project_idea_id == _coerce_uuid(idea_id),
            ProjectAsset.status == AssetStatus.COMPLETED,
            ProjectAsset.asset_type.in_(DOC_ORDER),
        )
        .count()
    )

    context = {
        "validation_report": idea.validation_report is not None,
        "blueprint": db.query(ProjectAsset)
        .filter(
            ProjectAsset.project_idea_id == _coerce_uuid(idea_id),
            ProjectAsset.asset_type == AssetType.DIAGRAM_USER_FLOW,
        )
        .first()
        is not None,
        "needs_clarification": idea.status == IdeaStatus.CLARIFICATION_NEEDED,
        "docs_completed": completed_docs,
        "next_steps": _get_next_steps(idea, completed_docs, db),
    }

    return await ai_service.get_progress_dashboard(idea_id, context)


def _get_next_steps(idea: ProjectIdea, completed_docs: int, db: Session) -> List[str]:
    """Get next steps for the user based on current progress."""
    steps = []

    if idea.status == IdeaStatus.CLARIFICATION_NEEDED:
        steps.append("Answer clarification questions to proceed")
    elif idea.status == IdeaStatus.READY_FOR_VALIDATION:
        steps.append("Generate validation report")
    elif idea.status == IdeaStatus.VALIDATED:
        steps.append("Generate visual blueprint")
    elif idea.status == IdeaStatus.BLUEPRINT_GENERATED:
        if completed_docs < len(DOC_ORDER):
            next_doc = DOC_ORDER[completed_docs]
            steps.append(f"Generate {next_doc} document")
        else:
            steps.append("All documents generated!")
    else:
        steps.append("Submit your project idea")

    return steps


@router.post("/idea/submit", response_model=schemas.IdeaResponse)
@limiter.limit("20/hour")
async def submit_idea(
    request: Request,
    idea_in: schemas.IdeaSubmit,
    project_id: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 1: Input Phase - Submits an idea.
    AI analyzes it and asks clarification questions if needed (up to 7).
    If project_id is None, a new project is created automatically.
    If idea is clear, proceeds directly to validation.
    """
    try:
        questions = []
        try:
            questions = await ai_service.generate_clarification_questions(
                idea_in.raw_input, max_questions=7
            )
        # An unconfigured or unreachable provider must not be downgraded to
        # "no questions" - that is indistinguishable from "the idea is
        # clear", and the idea would be stored as READY_FOR_VALIDATION on
        # the strength of an AI call that never happened.
        except HTTPException:
            raise
        except Exception:
            logger.exception("AI clarification failed")
            questions = []

        # If no project_id provided, create a placeholder project
        if not project_id:
            from app.models.project import Project, ProjectStatus
            from app.models.team_model import Team

            # Try to find any team user leads or belongs to
            default_team = (
                db.query(Team)
                .join(Team.members)
                .filter(User.id == current_user.id)
                .first()
            )

            # Fallback: Any team in user's organization
            if not default_team and current_user.organization_id:
                default_team = (
                    db.query(Team)
                    .filter(Team.organization_id == current_user.organization_id)
                    .first()
                )

            if not default_team:
                raise HTTPException(
                    status_code=400,
                    detail="User must belong to a team or organization to create a project",
                )

            new_proj = Project(
                name=idea_in.name
                or (
                    idea_in.raw_input[:47] + "..."
                    if len(idea_in.raw_input) > 50
                    else idea_in.raw_input
                ),
                icon="🚀",
                color="blue",
                status=ProjectStatus.PLANNED,
                team_id=default_team.id,
                lead_id=current_user.id,
            )
            db.add(new_proj)
            db.flush()
            project_id = str(new_proj.id)

        db_idea = crud_project_idea.project_idea.create_with_user(
            db=db, obj_in=idea_in, user_id=str(current_user.id)
        )
        db_idea.project_id = project_id

        if questions:
            db_idea.clarification_questions = [
                {"question": q, "answer": None, "suggestion": None} for q in questions
            ]
            db_idea.status = IdeaStatus.CLARIFICATION_NEEDED
        else:
            db_idea.status = IdeaStatus.READY_FOR_VALIDATION

        db.commit()
        db.refresh(db_idea)

        # Add project_id to response
        res_data = schemas.IdeaResponse.model_validate(db_idea)
        res_data_dict = res_data.model_dump()
        res_data_dict["project_id"] = project_id
        return res_data_dict
    # Deliberate responses (the 503 for unconfigured AI, the 400 for a user
    # with no team) already carry the right status and message - re-wrapping
    # them as a generic 500 buries the actionable part.
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Submit idea error")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.post("/idea/{idea_id}/suggest/{question_index}")
@limiter.limit("20/hour")
async def suggest_answer(
    request: Request,
    idea_id: str,
    question_index: int,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 1: Skip & Suggest - AI suggests an answer for a specific clarification question.
    """
    if not idea.clarification_questions:
        raise HTTPException(status_code=404, detail="Idea or questions not found")

    if question_index >= len(idea.clarification_questions):
        raise HTTPException(status_code=400, detail="Invalid question index")

    question_obj = idea.clarification_questions[question_index]
    previous_qa = [q for q in idea.clarification_questions if q.get("answer")]

    suggestion = await ai_service.suggest_answer(
        idea.raw_input,
        question_obj["question"],
        previous_qa,
        {"project_name": idea.name},
    )

    # Update suggestion in DB
    idea.clarification_questions[question_index]["suggestion"] = suggestion
    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(idea, "clarification_questions")
    db.commit()

    return {"suggestion": suggestion}


@router.post("/idea/{idea_id}/answer", response_model=schemas.IdeaResponse)
async def answer_questions(
    idea_id: str,
    answers: List[schemas.ClarificationAnswer],
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 1: Answer Clarifications - Updates the idea with answers.
    """

    # Update questions with answers
    answer_dict = {a.question: a.answer for a in answers}
    for i, q in enumerate(idea.clarification_questions):
        if q["question"] in answer_dict:
            idea.clarification_questions[i]["answer"] = answer_dict[q["question"]]

    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(idea, "clarification_questions")

    # Format answers into the refined description
    formatted_qa = "\n".join([f"Q: {a.question}\nA: {a.answer}" for a in answers])
    idea.refined_description = (
        (idea.refined_description or "") + "\n\nClarifications:\n" + formatted_qa
    )
    idea.status = IdeaStatus.READY_FOR_VALIDATION
    db.commit()
    db.refresh(idea)
    return idea


@router.get("/idea/{idea_id}", response_model=schemas.IdeaDetailsResponse)
async def get_idea_details(
    idea_id: str,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get full idea details including assets and dynamic blueprint completion."""

    # Load assets
    assets = (
        db.query(ProjectAsset).filter(ProjectAsset.project_idea_id == _coerce_uuid(idea_id)).all()
    )

    # Serialize validation report from SQLAlchemy model
    validation_report_data = None
    if idea.validation_report:
        validation_report_data = {
            "market_feasibility": idea.validation_report.market_feasibility,
            "core_features": idea.validation_report.core_features,
            "tech_stack": idea.validation_report.tech_stack,
            "pricing_model": idea.validation_report.pricing_model,
            "improvements": idea.validation_report.improvements,
        }

    # Process Blueprint Asset to add dynamic completion
    processed_assets = []
    blueprint_data = {}  # Initialize as dict

    for a in assets:
        asset_dict = {
            "id": str(a.id),
            "asset_type": a.asset_type.value,
            "content": a.content,
            "status": a.status.value,
            "chat_history": a.chat_history,
        }

        if a.asset_type == AssetType.DIAGRAM_USER_FLOW and a.content:
            try:
                # Try to parse as JSON (new format with nodes/edges)
                flow_data = json.loads(a.content)
                if isinstance(flow_data, dict) and "nodes" in flow_data:
                    blueprint_data.update(flow_data)  # Merge nodes/edges

                    # Update each node with actual completion from linked issues
                    for node in blueprint_data.get("nodes", []):
                        node_id = node.get("id")
                        issues = (
                            db.query(Issue)
                            .filter(Issue.blueprint_node_id == node_id)
                            .all()
                        )
                        if issues:
                            total = len(issues)
                            done = len(
                                [i for i in issues if i.status == IssueStatus.DONE]
                            )
                            node["completion"] = round((done / total) * 100)
                            node["issue_count"] = total
                        else:
                            node["completion"] = 0

                    # Update asset content with dynamic completion for frontend
                    asset_dict["content"] = json.dumps(blueprint_data)
                else:
                    # Legacy: Content is just mermaid string
                    blueprint_data["user_flow_mermaid"] = a.content
            except (json.JSONDecodeError, TypeError, KeyError):
                # Legacy content is a raw mermaid string, not JSON - expected format
                logger.info(
                    "User-flow asset %s content is not JSON, treating as legacy mermaid string",
                    a.id,
                )
                blueprint_data["user_flow_mermaid"] = a.content

        elif a.asset_type == AssetType.DIAGRAM_KANBAN and a.content:
            try:
                blueprint_data["kanban_features"] = _parse_asset_json(
                    a.content, asset_id=a.id
                )
            except AssetParseError:
                blueprint_data["kanban_features"] = []
                blueprint_data["kanban_parse_error"] = True

        processed_assets.append(asset_dict)

    # Build response
    response = {
        "id": str(idea.id),
        "raw_input": idea.raw_input,
        "refined_description": idea.refined_description,
        "status": idea.status,
        "clarification_questions": idea.clarification_questions,
        "validation_report": validation_report_data,
        "assets": processed_assets,
        "blueprint": blueprint_data if blueprint_data else None,  # Return None if empty
    }

    return response


@router.get("/doc-order")
async def get_doc_order() -> Any:
    """Get the order of document generation."""
    return {"order": DOC_ORDER}


@router.get("/pillars")
async def get_core_pillars() -> Any:
    """Get the 6 core pillars for validation."""
    return {"pillars": ai_service.get_core_pillars()}
