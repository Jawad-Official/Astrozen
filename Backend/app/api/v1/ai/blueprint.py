"""Blueprint routes: visual blueprint generation/editing and node <-> issue linking."""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
)
from sqlalchemy.orm import Session
from typing import Any, Optional
import logging
import json
from app.api import deps
from app.schemas import ai as schemas
from app.core.rate_limit import limiter
from app.crud.base import _coerce_uuid
from app.crud import crud_project_idea, feature as crud_feature, issue as crud_issue
from app.services.ai_service import ai_service
from app.services.notification_service import notification_service
from app.models.project_idea import (
    IdeaStatus,
    AssetType,
    AssetStatus,
    ProjectIdea,
    ProjectAsset,
)
from app.models.notification import NotificationType
from app.models.user import User
from app.models.team_model import Team
from app.models.feature import (
    Feature,
    FeatureStatus,
    FeatureType,
    FeatureHealth,
    Milestone,
)
from app.models.issue import Issue, IssuePriority, IssueStatus, IssueType

logger = logging.getLogger(__name__)

router = APIRouter()


def _first_str(data: dict, *keys: str) -> Optional[str]:
    for key in keys:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _normalize_issue_plan(plan: dict) -> dict:
    """Coerce the model's plan into the shape the route expects.

    Even with an explicit schema in the prompt, models drift: "title" for a
    feature's "name", "feature" for "feature_name", a bare string instead of
    an object, a missing milestone. Each of those used to be a KeyError and
    a 500 after the (paid) AI call had already succeeded. Entries that have
    no usable name are dropped rather than crashing the whole plan.
    """
    def _items(key: str) -> list:
        value = plan.get(key)
        return value if isinstance(value, list) else []

    features = []
    for raw in _items("new_features"):
        if isinstance(raw, str):
            raw = {"name": raw}
        if not isinstance(raw, dict):
            continue
        name = _first_str(raw, "name", "title", "feature_name", "feature")
        if not name:
            continue
        features.append(
            {
                **raw,
                "name": name,
                "description": _first_str(raw, "description", "problem_statement", "summary"),
                "parent_feature_name": _first_str(raw, "parent_feature_name", "parent", "parent_name"),
            }
        )

    milestones = []
    for raw in _items("milestones"):
        if isinstance(raw, str):
            raw = {"name": raw}
        if not isinstance(raw, dict):
            continue
        name = _first_str(raw, "name", "title", "milestone_name", "milestone")
        if not name:
            continue
        milestones.append(
            {
                **raw,
                "name": name,
                "description": _first_str(raw, "description", "summary"),
                "feature_name": _first_str(raw, "feature_name", "feature", "parent_feature_name"),
            }
        )

    def _normalize_issue(raw) -> Optional[dict]:
        if isinstance(raw, str):
            raw = {"title": raw}
        if not isinstance(raw, dict):
            return None
        title = _first_str(raw, "title", "name", "summary")
        if not title:
            return None
        subs = []
        raw_subs = raw.get("sub_issues") or raw.get("subtasks") or raw.get("sub_tasks")
        for sub in (raw_subs if isinstance(raw_subs, list) else []):
            normalized = _normalize_issue(sub)
            if normalized:
                normalized["sub_issues"] = []  # one level deep only
                subs.append(normalized)
        return {
            **raw,
            "title": title,
            "description": _first_str(raw, "description", "details", "summary"),
            "feature_name": _first_str(raw, "feature_name", "feature"),
            "milestone_name": _first_str(raw, "milestone_name", "milestone"),
            "sub_issues": subs,
        }

    issues = [i for i in (_normalize_issue(r) for r in _items("issues")) if i]
    return {"new_features": features, "milestones": milestones, "issues": issues}


@router.post("/idea/{idea_id}/blueprint/node/{node_id}/issues")
@limiter.limit("20/hour")
async def generate_issues_for_node(
    request: Request,
    idea_id: str,
    node_id: str,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    AI generates detailed Features, Milestones, and Issues for a specific blueprint node.
    """
    if not idea.project_id:
        raise HTTPException(status_code=404, detail="Idea or linked project not found")

    from app.models.project import Project

    project = db.query(Project).filter(Project.id == idea.project_id).first()
    team = (
        db.query(Team).filter(Team.id == project.team_id).first() if project else None
    )
    team_prefix = team.identifier if team else "AST"

    # Get blueprint asset to find node details
    blueprint_asset = crud_project_idea.project_idea.get_asset(
        db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_USER_FLOW
    )
    if not blueprint_asset:
        raise HTTPException(status_code=400, detail="Blueprint not generated yet")

    try:
        blueprint_data = json.loads(blueprint_asset.content)
        nodes = blueprint_data.get("nodes", [])
        node_details = next((n for n in nodes if n["id"] == node_id), None)
        if not node_details:
            # Fallback: maybe id is different or it's a simple label match
            node_details = {
                "id": node_id,
                "label": node_id,
                "type": "component",
                "subtasks": [],
            }
    except (json.JSONDecodeError, TypeError, KeyError):
        logger.warning(
            "Blueprint asset for idea %s has unparseable content, using fallback node details for node %s",
            idea_id,
            node_id,
        )
        node_details = {
            "id": node_id,
            "label": node_id,
            "type": "component",
            "subtasks": [],
        }

    # Context for AI
    existing_features = (
        db.query(Feature).filter(Feature.project_id == idea.project_id).all()
    )
    features_list = [
        {"id": str(f.id), "name": f.name, "description": f.problem_statement}
        for f in existing_features
    ]

    project_context = {
        "idea": idea.raw_input,
        "description": idea.refined_description,
        "project_id": str(idea.project_id),
    }

    # Generate plan
    plan = _normalize_issue_plan(
        await ai_service.generate_issues_for_blueprint_node(
            node_details, project_context, features_list
        )
    )
    if not plan["issues"] and not plan["new_features"]:
        raise HTTPException(
            status_code=502,
            detail="The AI returned an empty plan for this component. Try again.",
        )

    # 1. Create New Features (Handle parents first, then children)
    feature_map = {f.name: f for f in existing_features}
    new_features_data = plan.get("new_features", [])

    # Get current max identifier number to increment locally
    current_feature_num = crud_feature.get_max_identifier_num(db, team_prefix)

    # Simple two-pass approach for sub-features
    for pass_num in range(2):
        for f_data in new_features_data:
            if f_data["name"] in feature_map:
                continue

            parent_name = f_data.get("parent_feature_name")
            if pass_num == 0 and parent_name:  # Wait for second pass for sub-features
                continue

            parent_id = (
                feature_map.get(parent_name).id
                if parent_name and parent_name in feature_map
                else None
            )

            # Map type safely
            raw_type = str(f_data.get("type") or "new_capability").lower()
            if (
                raw_type == "sub_feature"
            ):  # Common AI hallucination based on field names
                f_type = FeatureType.ENHANCEMENT
            else:
                try:
                    f_type = FeatureType(raw_type)
                except ValueError:
                    f_type = FeatureType.NEW_CAPABILITY

            # Map status safely
            try:
                f_status = FeatureStatus(str(f_data.get("status") or "validated").lower())
            except ValueError:
                f_status = FeatureStatus.VALIDATED

            # Map priority safely
            try:
                f_priority = IssuePriority(str(f_data.get("priority") or "medium").lower())
            except ValueError:
                f_priority = IssuePriority.MEDIUM

            # Generate unique identifier locally
            current_feature_num += 1
            f_identifier = f"{team_prefix}-F{current_feature_num}"

            new_f = Feature(
                project_id=idea.project_id,
                parent_id=parent_id,
                name=f_data["name"],
                problem_statement=f_data.get("description"),
                type=f_type,
                status=f_status,
                priority=f_priority,
                owner_id=current_user.id,
                health=FeatureHealth.ON_TRACK,
                blueprint_node_id=node_id,
                identifier=f_identifier,
            )
            db.add(new_f)
            db.flush()
            feature_map[f_data["name"]] = new_f

    # 2. Create Milestones
    milestone_map = {}
    for m_data in plan.get("milestones", []):
        target_f = feature_map.get(m_data.get("feature_name") or "")
        if target_f:
            new_m = Milestone(
                feature_id=target_f.id,
                name=m_data["name"],
                description=m_data.get("description"),
                completed=False,
            )
            db.add(new_m)
            db.flush()
            milestone_map[m_data["name"]] = new_m

    # 3. Create Issues & Sub-issues
    created_count = 0
    from app.models.project import Project

    project = db.query(Project).filter(Project.id == idea.project_id).first()
    team_id = project.team_id if project else None

    # Get current max identifier number to increment locally
    current_issue_num = crud_issue.get_max_identifier_num(db, team_prefix)

    for i_data in plan.get("issues", []):
        target_f = feature_map.get(i_data.get("feature_name") or "")
        target_m = milestone_map.get(i_data.get("milestone_name") or "")

        # Map issue_type safely
        try:
            i_type = IssueType(str(i_data.get("type") or "task").lower())
        except ValueError:
            i_type = IssueType.TASK

        # Map priority safely
        try:
            i_priority = IssuePriority(str(i_data.get("priority") or "medium").lower())
        except ValueError:
            i_priority = IssuePriority.MEDIUM

        # Generate unique identifier locally
        current_issue_num += 1
        p_identifier = f"{team_prefix}-{current_issue_num}"

        # Create Parent Issue
        parent_issue = Issue(
            title=i_data["title"],
            description=i_data.get("description"),
            priority=i_priority,
            issue_type=i_type,
            status=IssueStatus.BACKLOG,
            feature_id=target_f.id if target_f else None,
            milestone_id=target_m.id if target_m else None,
            team_id=team_id,
            identifier=p_identifier,
            blueprint_node_id=node_id,
        )
        db.add(parent_issue)
        db.flush()  # Flush to get parent_issue.id for sub-issues

        created_count += 1

        # Create Sub-issues
        for sub_idx, s_data in enumerate(i_data.get("sub_issues", [])):
            try:
                si_type = IssueType(str(s_data.get("type") or "task").lower())
            except ValueError:
                si_type = IssueType.TASK

            try:
                si_priority = IssuePriority(str(s_data.get("priority") or "medium").lower())
            except ValueError:
                si_priority = IssuePriority.MEDIUM

            sub_issue = Issue(
                title=s_data["title"],
                parent_id=parent_issue.id,
                priority=si_priority,
                issue_type=si_type,
                status=IssueStatus.BACKLOG,
                feature_id=parent_issue.feature_id,
                milestone_id=parent_issue.milestone_id,
                team_id=team_id,
                identifier=f"{parent_issue.identifier}-S{sub_idx + 1}",
                blueprint_node_id=node_id,
            )
            db.add(sub_issue)

    db.commit()

    # Notify user
    notification_service.notify_user(
        db,
        recipient_id=current_user.id,
        type=NotificationType.AI_ISSUES_CREATED,
        title="Issues Generated",
        content=f"Generated {created_count} items for component '{node_id}'.",
        target_id=str(idea.id),
        target_type="ai_idea",
    )

    return {
        "message": f"Generated {created_count} items (including sub-issues) across {len(milestone_map)} milestones and {len(new_features_data)} features."
    }


@router.post("/idea/{idea_id}/blueprint/sync")
@limiter.limit("20/hour")
async def sync_blueprint_from_docs(
    request: Request,
    idea_id: str,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Syncs validation and blueprint from existing manual docs.
    """

    # Fetch all completed assets (docs) for this idea
    assets = (
        db.query(ProjectAsset)
        .filter(
            ProjectAsset.project_idea_id == _coerce_uuid(idea_id),
            ProjectAsset.status == AssetStatus.COMPLETED,
        )
        .all()
    )

    if not assets:
        raise HTTPException(
            status_code=400, detail="No completed documents found to sync from"
        )

    # Combine content from all docs
    docs_context = "\n\n".join(
        [f"--- {a.asset_type.value} ---\n{a.content}" for a in assets]
    )

    # 1. Generate validation report from docs
    report_data = await ai_service.validate_idea(idea.raw_input, [], docs_context)

    required_fields = [
        "market_feasibility",
        "improvements",
        "core_features",
        "tech_stack",
        "pricing_model",
    ]

    if idea.validation_report:
        for key in required_fields:
            if key in report_data:
                setattr(idea.validation_report, key, report_data[key])
        report = idea.validation_report
    else:
        # Filter report_data to only include required fields
        filtered_report = {k: v for k, v in report_data.items() if k in required_fields}
        report = crud_project_idea.project_idea.create_validation_report(
            db=db, idea_id=idea_id, report_data=filtered_report
        )

    # 2. Generate blueprint from new report data
    blueprint_context = {
        "idea": idea.raw_input,
        "features": report.core_features,
        "tech_stack": report.tech_stack,
    }
    blueprint_data = await ai_service.generate_blueprint(blueprint_context)

    # 3. Save blueprint assets
    crud_project_idea.project_idea.create_or_update_asset(
        db=db,
        idea_id=idea_id,
        asset_type=AssetType.DIAGRAM_USER_FLOW,
        content=blueprint_data.get("user_flow_mermaid", ""),
        status=AssetStatus.COMPLETED,
    )
    crud_project_idea.project_idea.create_or_update_asset(
        db=db,
        idea_id=idea_id,
        asset_type=AssetType.DIAGRAM_KANBAN,
        content=json.dumps(blueprint_data.get("kanban_features", [])),
        status=AssetStatus.COMPLETED,
    )

    idea.status = IdeaStatus.BLUEPRINT_GENERATED
    db.commit()

    return {"validation_report": report, "blueprint": blueprint_data}


@router.post("/idea/{idea_id}/blueprint", response_model=schemas.BlueprintResponse)
@limiter.limit("20/hour")
async def generate_blueprint(
    request: Request,
    idea_id: str,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 3: Visual Blueprint - Generates User Flow and Kanban.
    """
    if not idea.validation_report:
        raise HTTPException(status_code=400, detail="Idea not validated yet")

    context = {
        "idea": idea.raw_input,
        "features": idea.validation_report.core_features,
        "tech_stack": idea.validation_report.tech_stack,
    }

    blueprint_data = await ai_service.generate_blueprint(context)

    # Save as assets
    crud_project_idea.project_idea.create_or_update_asset(
        db=db,
        idea_id=idea_id,
        asset_type=AssetType.DIAGRAM_USER_FLOW,
        content=blueprint_data.get("user_flow_mermaid", ""),
        status=AssetStatus.COMPLETED,
    )

    # Save kanban features
    kanban_content = json.dumps(blueprint_data.get("kanban_features", []))

    # Save nodes and edges for frontend visualization
    nodes_data = blueprint_data.get("nodes", [])
    edges_data = blueprint_data.get("edges", [])

    crud_project_idea.project_idea.create_or_update_asset(
        db=db,
        idea_id=idea_id,
        asset_type=AssetType.DIAGRAM_KANBAN,
        content=kanban_content,
        status=AssetStatus.COMPLETED,
    )

    # Save flow nodes for visualization
    if nodes_data:
        import json

        crud_project_idea.project_idea.create_or_update_asset(
            db=db,
            idea_id=idea_id,
            asset_type=AssetType.DIAGRAM_USER_FLOW,
            content=json.dumps({"nodes": nodes_data, "edges": edges_data}),
            status=AssetStatus.COMPLETED,
        )
    idea.status = IdeaStatus.BLUEPRINT_GENERATED
    db.commit()

    # Notify user
    notification_service.notify_user(
        db,
        recipient_id=current_user.id,
        type=NotificationType.AI_BLUEPRINT_READY,
        title="Blueprint Generated",
        content=f"Visual blueprint and roadmap for '{idea.refined_description or idea.raw_input[:30]}' are ready.",
        target_id=str(idea.id),
        target_type="ai_idea",
    )

    return {
        "user_flow_mermaid": blueprint_data.get("user_flow_mermaid", ""),
        "kanban_features": blueprint_data.get("kanban_features", []),
        "nodes": nodes_data,
        "edges": edges_data,
    }


@router.put("/idea/{idea_id}/blueprint")
async def save_blueprint(
    idea_id: str,
    blueprint_in: schemas.BlueprintSaveRequest,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Manually save updated blueprint data (node positions, etc.).
    """

    import json

    content = json.dumps(
        {
            "nodes": [n.model_dump(by_alias=True) for n in blueprint_in.nodes],
            "edges": [e.model_dump(by_alias=True) for e in blueprint_in.edges],
            "user_flow_mermaid": blueprint_in.user_flow_mermaid,
        }
    )

    crud_project_idea.project_idea.create_or_update_asset(
        db=db,
        idea_id=idea_id,
        asset_type=AssetType.DIAGRAM_USER_FLOW,
        content=content,
        status=AssetStatus.COMPLETED,
    )

    return {"message": "Blueprint saved successfully"}


@router.get("/idea/{idea_id}/blueprint/node/{node_id}/details", response_model=schemas.BlueprintNodeDetailsResponse)
async def get_blueprint_node_details(
    idea_id: str,
    node_id: str,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get detailed issues and features linked to a specific node."""

    issues = db.query(Issue).filter(Issue.blueprint_node_id == node_id).all()
    features = db.query(Feature).filter(Feature.blueprint_node_id == node_id).all()

    # Calculate completion
    total_issues = len(issues)
    done_issues = len([i for i in issues if i.status == IssueStatus.DONE])
    completion = round((done_issues / total_issues * 100)) if total_issues > 0 else 0

    return {
        "node_id": node_id,
        "completion": completion,
        "stats": {"total_issues": total_issues, "done_issues": done_issues},
        "issues": [
            {
                "id": str(i.id),
                "identifier": i.identifier,
                "title": i.title,
                "status": i.status,
                "priority": i.priority,
            }
            for i in issues
        ],
        "features": [
            {"id": str(f.id), "name": f.name, "status": f.status} for f in features
        ],
    }


@router.post("/idea/{idea_id}/blueprint/node/{node_id}/link-issue")
async def link_issue_to_node(
    idea_id: str,
    node_id: str,
    issue_id: str,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Manually link an issue to a blueprint node."""
    if not deps.check_can_edit_issue(current_user, issue_id, db):
        raise HTTPException(status_code=404, detail="Issue not found")

    issue = db.query(Issue).filter(Issue.id == _coerce_uuid(issue_id)).first()
    issue.blueprint_node_id = node_id
    db.commit()
    return {"message": "Issue linked successfully"}


@router.post("/idea/{idea_id}/blueprint/node/{node_id}/unlink-issue")
async def unlink_issue_from_node(
    idea_id: str,
    node_id: str,
    issue_id: str,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Unlink an issue from a blueprint node."""
    if not deps.check_can_edit_issue(current_user, issue_id, db):
        raise HTTPException(status_code=404, detail="Issue link not found")

    issue = (
        db.query(Issue)
        .filter(Issue.id == _coerce_uuid(issue_id), Issue.blueprint_node_id == node_id)
        .first()
    )
    if not issue:
        raise HTTPException(status_code=404, detail="Issue link not found")

    issue.blueprint_node_id = None
    db.commit()
    return {"message": "Issue unlinked successfully"}
