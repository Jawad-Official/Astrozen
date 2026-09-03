"""Idea validation routes: run/approve/edit the 6-pillar validation report."""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    BackgroundTasks,
    Body,
    Request,
)
from sqlalchemy.orm import Session
from typing import Any, List, Optional
import logging
from sqlalchemy.orm.attributes import flag_modified
from app.api import deps
from app.schemas import ai as schemas
from app.core.rate_limit import limiter
from app.crud import crud_project_idea, feature as crud_feature
from app.services.ai_service import ai_service
from app.services.notification_service import notification_service
from app.models.project_idea import (
    IdeaStatus,
    ProjectIdea,
)
from app.models.notification import NotificationType
from app.models.user import User
from app.models.team_model import Team
from app.core.database import SessionLocal
from app.models.feature import (
    Feature,
    FeatureStatus,
    FeatureType,
    FeatureHealth,
)
from app.models.issue import IssuePriority

logger = logging.getLogger(__name__)

router = APIRouter()


async def create_features_background(idea_id: str, user_id: str):
    """
    Background task to expand and create features/sub-features after Phase 2 approval.
    """
    db = SessionLocal()
    try:
        idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
        if not idea or not idea.validation_report:
            logging.error(
                f"Background feature creation aborted: Idea {idea_id} not found or invalid."
            )
            return

        if not idea.project_id:
            logging.error(
                f"Background feature creation aborted: Idea {idea_id} has no project_id."
            )
            return

        # Get team prefix for identifiers
        from app.models.project import Project

        project = db.query(Project).filter(Project.id == idea.project_id).first()
        team = (
            db.query(Team).filter(Team.id == project.team_id).first()
            if project
            else None
        )
        team_prefix = team.identifier if team else "AST"

        # Prepare context for AI
        context = {
            "idea": idea.raw_input,
            "core_features": idea.validation_report.core_features,
            "refined_description": idea.refined_description,
        }

        # Call AI to expand features
        expanded_features = await ai_service.expand_features_for_creation(context)

        # Get current max identifier number to increment locally
        current_feature_num = crud_feature.get_max_identifier_num(db, team_prefix)

        # Create features in DB
        for f_data in expanded_features:
            # Map string values to Enums (handling case sensitivity)
            try:
                status = FeatureStatus(f_data.get("status", "discovery").lower())
            except ValueError:
                status = FeatureStatus.DISCOVERY

            try:
                priority = IssuePriority(f_data.get("priority", "medium").lower())
            except ValueError:
                priority = IssuePriority.MEDIUM

            try:
                f_type = FeatureType(f_data.get("type", "new_capability").lower())
            except ValueError:
                f_type = FeatureType.NEW_CAPABILITY

            # Generate parent identifier
            current_feature_num += 1
            p_identifier = f"{team_prefix}-F{current_feature_num}"

            # Create Parent Feature
            parent_feature = Feature(
                project_id=idea.project_id,
                name=f_data.get("name", "Unnamed Feature"),
                problem_statement=f_data.get("description"),
                target_user=f_data.get("target_user"),
                expected_outcome=f_data.get("expected_outcome"),
                success_metric=f_data.get("success_metric"),
                status=status,
                priority=priority,
                type=f_type,
                owner_id=user_id,
                health=FeatureHealth.ON_TRACK,
                identifier=p_identifier,
            )
            db.add(parent_feature)
            db.flush()  # Flush to get ID for sub-features

            # Create Sub-features
            sub_features = f_data.get("sub_features", [])
            for sub_data in sub_features:
                try:
                    sub_status = FeatureStatus(
                        sub_data.get("status", "discovery").lower()
                    )
                except ValueError:
                    sub_status = FeatureStatus.DISCOVERY

                try:
                    sub_priority = IssuePriority(
                        sub_data.get("priority", "medium").lower()
                    )
                except ValueError:
                    sub_priority = IssuePriority.MEDIUM

                try:
                    sub_type = FeatureType(
                        sub_data.get("type", "new_capability").lower()
                    )
                except ValueError:
                    sub_type = FeatureType.NEW_CAPABILITY

                # Generate sub-feature identifier
                current_feature_num += 1
                s_identifier = f"{team_prefix}-F{current_feature_num}"

                sub_feature = Feature(
                    project_id=idea.project_id,
                    parent_id=parent_feature.id,
                    name=sub_data.get("name", "Unnamed Sub-feature"),
                    problem_statement=sub_data.get("description"),
                    target_user=sub_data.get("target_user"),
                    expected_outcome=sub_data.get("expected_outcome"),
                    success_metric=sub_data.get("success_metric"),
                    status=sub_status,
                    priority=sub_priority,
                    type=sub_type,
                    owner_id=user_id,
                    health=FeatureHealth.ON_TRACK,
                    identifier=s_identifier,
                )
                db.add(sub_feature)

        db.commit()
        logger.info(f"Successfully created features for idea {idea_id}")

    except Exception:
        logger.exception(f"Background feature creation failed for idea {idea_id}")
        db.rollback()
    finally:
        db.close()


@router.post("/idea/{idea_id}/validate/approve")
async def approve_validation_report(
    idea_id: str,
    background_tasks: BackgroundTasks,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 2 Approval: Accepts the validation report and triggers automatic feature creation.
    This runs in the background and creates features/sub-features in the database.
    """

    if not idea.validation_report:
        raise HTTPException(
            status_code=400,
            detail="Validation report not found. Complete validation first.",
        )

    # Trigger background task
    background_tasks.add_task(create_features_background, idea_id, str(current_user.id))

    return {"message": "Phase 2 approved. Feature creation started in background."}


@router.post(
    "/idea/{idea_id}/validate", response_model=schemas.ValidationReportResponse
)
@limiter.limit("20/hour")
async def validate_idea(
    request: Request,
    idea_id: str,
    feedback: Optional[str] = None,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 2: Validation & Analysis - Validates idea against 6 core pillars.
    """

    # If validation report exists and no feedback, return serialized version
    if idea.validation_report and not feedback:
        return {
            "market_feasibility": idea.validation_report.market_feasibility,
            "core_features": idea.validation_report.core_features,
            "tech_stack": idea.validation_report.tech_stack,
            "pricing_model": idea.validation_report.pricing_model,
            "improvements": idea.validation_report.improvements,
        }

    # Build clarifications from questions if available
    clarifications = []
    if idea.clarification_questions:
        clarifications = [
            {"question": q["question"], "answer": q.get("answer", "")}
            for q in idea.clarification_questions
            if q.get("answer")
        ]

    full_text = f"{idea.raw_input}\n{idea.refined_description or ''}"
    if feedback:
        full_text += f"\n\nUSER FEEDBACK FOR REFINEMENT: {feedback}"

    report_data = await ai_service.validate_idea(full_text, clarifications, feedback)

    if not report_data:
        raise HTTPException(
            status_code=500, detail="AI Validation failed to generate report data."
        )

    # Ensure all required fields are present
    required_fields = [
        "market_feasibility",
        "improvements",
        "core_features",
        "tech_stack",
        "pricing_model",
    ]

    # Log the received report_data keys
    logger.info(f"Report data keys: {list(report_data.keys())}")

    missing_fields = [field for field in required_fields if field not in report_data]
    if missing_fields:
        logger.error(f"Missing fields in validation report: {missing_fields}")
        # Set default values for missing fields
        if "market_feasibility" not in report_data:
            report_data["market_feasibility"] = {
                "score": 50,
                "analysis": "Unable to analyze",
                "pillars": [],
            }
        if "improvements" not in report_data:
            report_data["improvements"] = []
        if "core_features" not in report_data:
            report_data["core_features"] = []
        if "tech_stack" not in report_data:
            report_data["tech_stack"] = {
                "frontend": [],
                "backend": [],
                "database": [],
                "infrastructure": [],
            }
        if "pricing_model" not in report_data:
            report_data["pricing_model"] = {"type": "Unknown", "tiers": []}

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

    idea.status = IdeaStatus.VALIDATED
    db.commit()
    db.refresh(report)

    # Notify user
    notification_service.notify_user(
        db,
        recipient_id=current_user.id,
        type=NotificationType.AI_VALIDATION_READY,
        title="Validation Report Ready",
        content=f"Market analysis for '{idea.refined_description or idea.raw_input[:30]}' is complete.",
        target_id=str(idea.id),
        target_type="ai_idea",
    )

    # Return serialized version to avoid Pydantic serialization issues
    return {
        "market_feasibility": report.market_feasibility,
        "core_features": report.core_features,
        "tech_stack": report.tech_stack,
        "pricing_model": report.pricing_model,
        "improvements": report.improvements,
    }


@router.put("/idea/{idea_id}/validate", response_model=schemas.ValidationReportResponse)
async def update_validation_report(
    idea_id: str,
    report_in: schemas.ValidationReportResponse,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 2: Manual Edit Update - Saves manual changes to the validation report.
    Auto-saves user edits.
    """
    if not idea.validation_report:
        raise HTTPException(status_code=404, detail="Report not found")

    report = idea.validation_report

    # Convert Pydantic models to dictionaries for JSON serialization
    from pydantic import BaseModel

    def to_dict(value):
        if isinstance(value, BaseModel):
            return value.model_dump()
        elif isinstance(value, list) and value and isinstance(value[0], BaseModel):
            return [item.model_dump() for item in value]
        return value

    report.market_feasibility = to_dict(report_in.market_feasibility)
    report.improvements = report_in.improvements
    report.core_features = to_dict(report_in.core_features)
    report.tech_stack = to_dict(report_in.tech_stack)
    report.pricing_model = to_dict(report_in.pricing_model)

    db.commit()
    db.refresh(report)

    # Return serialized version to avoid Pydantic serialization issues
    return {
        "market_feasibility": report.market_feasibility,
        "core_features": report.core_features,
        "tech_stack": report.tech_stack,
        "pricing_model": report.pricing_model,
        "improvements": report.improvements,
    }


@router.post("/idea/{idea_id}/validate/regenerate-field")
@limiter.limit("20/hour")
async def regenerate_validation_field(
    request: Request,
    idea_id: str,
    field_name: str,
    feedback: str,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 2: Regenerate a specific validation field based on user feedback.
    Supports nested fields like 'tech_stack.database'.
    """
    if not idea.validation_report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Handle nested field names like 'tech_stack.database'
    is_nested_field = "." in field_name
    if is_nested_field:
        parent_field, sub_field = field_name.split(".", 1)
        parent_value = getattr(idea.validation_report, parent_field, None)
        if parent_value is None or not isinstance(parent_value, dict):
            raise HTTPException(
                status_code=400,
                detail=f"Parent field {parent_field} not found or not a dict",
            )
        current_value = parent_value.get(sub_field)
    else:
        current_value = getattr(idea.validation_report, field_name, None)
        if current_value is None:
            raise HTTPException(status_code=400, detail=f"Field {field_name} not found")

    # Build context for regeneration
    context = {
        "idea": idea.raw_input,
        "clarifications": idea.clarification_questions or [],
        "current_report": {
            "market_feasibility": idea.validation_report.market_feasibility,
            "improvements": idea.validation_report.improvements,
            "core_features": idea.validation_report.core_features,
            "tech_stack": idea.validation_report.tech_stack,
            "pricing_model": idea.validation_report.pricing_model,
        },
    }

    # Regenerate the field
    new_value = await ai_service.regenerate_validation_field(
        field_name, current_value, feedback, context
    )

    # Update the field (handle nested fields)
    if is_nested_field:
        parent_value = getattr(idea.validation_report, parent_field)
        parent_value[sub_field] = new_value
        setattr(idea.validation_report, parent_field, parent_value)
        flag_modified(idea.validation_report, parent_field)
    else:
        setattr(idea.validation_report, field_name, new_value)
    db.commit()
    db.refresh(idea.validation_report)

    return {
        "market_feasibility": idea.validation_report.market_feasibility,
        "core_features": idea.validation_report.core_features,
        "tech_stack": idea.validation_report.tech_stack,
        "pricing_model": idea.validation_report.pricing_model,
        "improvements": idea.validation_report.improvements,
        "value": new_value,
    }


@router.post("/idea/{idea_id}/validate/accept-improvements")
@limiter.limit("20/hour")
async def accept_improvements_and_revalidate(
    request: Request,
    idea_id: str,
    accepted_improvements: List[int] = Body(
        ..., description="List of improvement indices to accept (0-based)"
    ),
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 2: Accept selected improvements and re-validate the idea.
    - Accepted improvements are applied (removed from list)
    - Remaining improvements are kept in the list
    - AI re-validates 6 core pillars considering accepted improvements
    """
    try:
        if not idea.validation_report:
            raise HTTPException(status_code=404, detail="Report not found")

        all_improvements = idea.validation_report.improvements or []
        if not all_improvements:
            raise HTTPException(status_code=400, detail="No improvements available")

        selected_improvements = [
            all_improvements[i]
            for i in accepted_improvements
            if 0 <= i < len(all_improvements)
        ]

        if not selected_improvements:
            raise HTTPException(
                status_code=400, detail="No valid improvements selected"
            )

        remaining_improvements = [
            imp
            for i, imp in enumerate(all_improvements)
            if i not in accepted_improvements
        ]

        accepted_text = "\n".join([f"- {imp}" for imp in selected_improvements])

        current_score = 0
        current_pillars = []
        if idea.validation_report and idea.validation_report.market_feasibility:
            mf = idea.validation_report.market_feasibility
            current_score = (
                mf.get("score", 0) if isinstance(mf, dict) else getattr(mf, "score", 0)
            )
            current_pillars = (
                mf.get("pillars", [])
                if isinstance(mf, dict)
                else getattr(mf, "pillars", [])
            )

        if remaining_improvements:
            feedback = f"""The user has applied these improvements:
{accepted_text}

BEFORE improvements were applied:
- Overall Score: {current_score}/100
- Current pillar statuses: {", ".join([f"{p.get('name', p)}: {p.get('status', 'Unknown')}" if isinstance(p, dict) else str(p) for p in current_pillars])}

Now re-validate with improvements applied. Increase the score and improve pillar statuses accordingly."""
        else:
            feedback = f"""The user has applied ALL suggested improvements:
{accepted_text}

BEFORE improvements were applied:
- Overall Score: {current_score}/100  
- Current pillar statuses: {", ".join([f"{p.get('name', p)}: {p.get('status', 'Unknown')}" if isinstance(p, dict) else str(p) for p in current_pillars])}

Now re-validate with ALL improvements applied. The score MUST be HIGHER. Each pillar status should improve. The improvements list should be empty []."""

        clarifications = []
        if idea.clarification_questions:
            clarifications = [
                {"question": q["question"], "answer": q.get("answer", "")}
                for q in idea.clarification_questions
                if q.get("answer")
            ]

        full_text = f"{idea.raw_input}\n{idea.refined_description or ''}"
        full_text += f"\n\nAPPLIED IMPROVEMENTS:\n{accepted_text}"

        logger.info(
            f"Re-validating idea {idea_id}: {len(selected_improvements)} accepted, {len(remaining_improvements)} remaining"
        )
        report_data = await ai_service.validate_idea(
            full_text,
            clarifications,
            feedback,
            remaining_improvements=remaining_improvements,
        )

        if not report_data:
            logger.error("AI service returned empty report data")
            raise HTTPException(
                status_code=500, detail="AI Validation failed to generate report data."
            )

        logger.info(f"Received report data with keys: {list(report_data.keys())}")

        required_fields = [
            "market_feasibility",
            "improvements",
            "core_features",
            "tech_stack",
            "pricing_model",
        ]
        missing_fields = [
            field for field in required_fields if field not in report_data
        ]
        if missing_fields:
            logger.warning(f"Missing fields in validation report: {missing_fields}")
            if "market_feasibility" not in report_data:
                report_data["market_feasibility"] = {
                    "score": 50,
                    "analysis": "Unable to analyze",
                    "pillars": [],
                }
            if "improvements" not in report_data:
                report_data["improvements"] = remaining_improvements
            if "core_features" not in report_data:
                report_data["core_features"] = []
            if "tech_stack" not in report_data:
                report_data["tech_stack"] = {
                    "frontend": [],
                    "backend": [],
                    "database": [],
                    "infrastructure": [],
                }
            if "pricing_model" not in report_data:
                report_data["pricing_model"] = {"type": "Unknown", "tiers": []}

        report_data["improvements"] = remaining_improvements

        if "market_feasibility" in report_data:
            new_score = report_data["market_feasibility"].get("score", 0)
            score_increase_per_improvement = 5
            expected_min_score = min(
                95,
                current_score
                + (len(selected_improvements) * score_increase_per_improvement),
            )

            if new_score < expected_min_score:
                logger.warning(
                    f"AI returned score {new_score}, expected at least {expected_min_score}. Adjusting upward."
                )
                report_data["market_feasibility"]["score"] = expected_min_score
                report_data["market_feasibility"]["analysis"] = (
                    f"(Score increased after applying {len(selected_improvements)} improvement{'s' if len(selected_improvements) > 1 else ''}) {report_data['market_feasibility'].get('analysis', '')}"
                )

        for key in required_fields:
            if key in report_data:
                setattr(idea.validation_report, key, report_data[key])
                flag_modified(idea.validation_report, key)

        db.commit()
        db.refresh(idea.validation_report)
        logger.info(f"Successfully updated validation report for idea {idea_id}")

        # Notify user
        try:
            notification_service.notify_user(
                db,
                recipient_id=current_user.id,
                type=NotificationType.AI_VALIDATION_READY,
                title="Validation Updated",
                content=f"Validation re-run with {len(selected_improvements)} accepted improvements.",
                target_id=str(idea.id),
                target_type="ai_idea",
            )
        except Exception:
            logger.exception("Failed to send notification")
            # Don't fail the whole request if notification fails

        # Return the updated report as a plain dict
        return {
            "market_feasibility": idea.validation_report.market_feasibility,
            "core_features": idea.validation_report.core_features,
            "tech_stack": idea.validation_report.tech_stack,
            "pricing_model": idea.validation_report.pricing_model,
            "improvements": idea.validation_report.improvements,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in accept_improvements_and_revalidate")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
