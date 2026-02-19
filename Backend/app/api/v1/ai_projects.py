from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Body, Body
from sqlalchemy.orm import Session
from typing import Any, List, Dict, Optional
import mammoth
import logging
from app.api import deps
from app.schemas import ai as schemas
from app.crud import crud_project_idea, feature as crud_feature, issue as crud_issue
from app.services.ai_service import ai_service
from app.services.storage_service import storage_service
from app.services.notification_service import notification_service
from app.models.project_idea import IdeaStatus, AssetType, AssetStatus, ProjectIdea, ProjectAsset
from app.models.notification import NotificationType
from app.models.user import User
from app.models.team_model import Team
from app.core.database import SessionLocal
from app.models.feature import Feature, FeatureStatus, FeatureType, FeatureHealth
from app.models.issue import IssuePriority

from app.models.issue import Issue, IssuePriority, IssueStatus, IssueType
from app.models.feature import Feature, FeatureStatus, FeatureType, FeatureHealth, Milestone

router = APIRouter()

# ... existing code ...

@router.post("/idea/{idea_id}/blueprint/node/{node_id}/issues")
async def generate_issues_for_node(
    idea_id: str,
    node_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    AI generates detailed Features, Milestones, and Issues for a specific blueprint node.
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea or not idea.project_id:
        raise HTTPException(status_code=404, detail="Idea or linked project not found")

    from app.models.project import Project
    project = db.query(Project).filter(Project.id == idea.project_id).first()
    team = db.query(Team).filter(Team.id == project.team_id).first() if project else None
    team_prefix = team.identifier if team else "AST"

    # Get blueprint asset to find node details
    blueprint_asset = crud_project_idea.project_idea.get_asset(db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_USER_FLOW)
    if not blueprint_asset:
        raise HTTPException(status_code=400, detail="Blueprint not generated yet")

    import json
    try:
        blueprint_data = json.loads(blueprint_asset.content)
        nodes = blueprint_data.get("nodes", [])
        node_details = next((n for n in nodes if n["id"] == node_id), None)
        if not node_details:
            # Fallback: maybe id is different or it's a simple label match
            node_details = {"id": node_id, "label": node_id, "type": "component", "subtasks": []}
    except:
        node_details = {"id": node_id, "label": node_id, "type": "component", "subtasks": []}

    # Context for AI
    existing_features = db.query(Feature).filter(Feature.project_id == idea.project_id).all()
    features_list = [{"id": str(f.id), "name": f.name, "description": f.problem_statement} for f in existing_features]
    
    project_context = {
        "idea": idea.raw_input,
        "description": idea.refined_description,
        "project_id": str(idea.project_id)
    }

    # Generate plan
    plan = await ai_service.generate_issues_for_blueprint_node(node_details, project_context, features_list)

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
            if pass_num == 0 and parent_name: # Wait for second pass for sub-features
                continue
                
            parent_id = feature_map.get(parent_name).id if parent_name and parent_name in feature_map else None
            
            # Map type safely
            raw_type = f_data.get("type", "new_capability").lower()
            if raw_type == "sub_feature": # Common AI hallucination based on field names
                f_type = FeatureType.ENHANCEMENT
            else:
                try:
                    f_type = FeatureType(raw_type)
                except ValueError:
                    f_type = FeatureType.NEW_CAPABILITY

            # Map status safely
            try:
                f_status = FeatureStatus(f_data.get("status", "validated").lower())
            except ValueError:
                f_status = FeatureStatus.VALIDATED

            # Map priority safely
            try:
                f_priority = IssuePriority(f_data.get("priority", "medium").lower())
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
                identifier=f_identifier
            )
            db.add(new_f)
            db.flush()
            feature_map[f_data["name"]] = new_f

    # 2. Create Milestones
    milestone_map = {}
    for m_data in plan.get("milestones", []):
        target_f = feature_map.get(m_data["feature_name"])
        if target_f:
            new_m = Milestone(
                feature_id=target_f.id,
                name=m_data["name"],
                description=m_data.get("description"),
                completed=False
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
        target_f = feature_map.get(i_data["feature_name"])
        target_m = milestone_map.get(i_data["milestone_name"])
        
        # Map issue_type safely
        try:
            i_type = IssueType(i_data.get("type", "task").lower())
        except ValueError:
            i_type = IssueType.TASK

        # Map priority safely
        try:
            i_priority = IssuePriority(i_data.get("priority", "medium").lower())
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
            blueprint_node_id=node_id
        )
        db.add(parent_issue)
        db.flush() # Flush to get parent_issue.id for sub-issues
        
        created_count += 1

        # Create Sub-issues
        for sub_idx, s_data in enumerate(i_data.get("sub_issues", [])):
            try:
                si_type = IssueType(s_data.get("type", "task").lower())
            except ValueError:
                si_type = IssueType.TASK

            try:
                si_priority = IssuePriority(s_data.get("priority", "medium").lower())
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
                identifier=f"{parent_issue.identifier}-S{sub_idx+1}",
                blueprint_node_id=node_id
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
        target_type="ai_idea"
    )

    return {"message": f"Generated {created_count} items (including sub-issues) across {len(milestone_map)} milestones and {len(new_features_data)} features."}


async def create_features_background(idea_id: str, user_id: str):
    """
    Background task to expand and create features/sub-features after Phase 2 approval.
    """
    db = SessionLocal()
    try:
        idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
        if not idea or not idea.validation_report:
            logging.error(f"Background feature creation aborted: Idea {idea_id} not found or invalid.")
            return

        if not idea.project_id:
            logging.error(f"Background feature creation aborted: Idea {idea_id} has no project_id.")
            return

        # Get team prefix for identifiers
        from app.models.project import Project
        project = db.query(Project).filter(Project.id == idea.project_id).first()
        team = db.query(Team).filter(Team.id == project.team_id).first() if project else None
        team_prefix = team.identifier if team else "AST"

        # Prepare context for AI
        context = {
            "idea": idea.raw_input,
            "core_features": idea.validation_report.core_features,
            "refined_description": idea.refined_description
        }

        # Call AI to expand features
        expanded_features = await ai_service.expand_features_for_creation(context)

        # Get current max identifier number to increment locally
        current_feature_num = crud_feature.get_max_identifier_num(db, team_prefix)

        # Create features in DB
        for f_data in expanded_features:
            # Map string values to Enums (handling case sensitivity)
            try:
                status = FeatureStatus(f_data.get('status', 'discovery').lower())
            except ValueError:
                status = FeatureStatus.DISCOVERY

            try:
                priority = IssuePriority(f_data.get('priority', 'medium').lower())
            except ValueError:
                priority = IssuePriority.MEDIUM

            try:
                f_type = FeatureType(f_data.get('type', 'new_capability').lower())
            except ValueError:
                f_type = FeatureType.NEW_CAPABILITY

            # Generate parent identifier
            current_feature_num += 1
            p_identifier = f"{team_prefix}-F{current_feature_num}"

            # Create Parent Feature
            parent_feature = Feature(
                project_id=idea.project_id,
                name=f_data.get('name', 'Unnamed Feature'),
                problem_statement=f_data.get('description'),
                target_user=f_data.get('target_user'),
                expected_outcome=f_data.get('expected_outcome'),
                success_metric=f_data.get('success_metric'),
                status=status,
                priority=priority,
                type=f_type,
                owner_id=user_id,
                health=FeatureHealth.ON_TRACK,
                identifier=p_identifier
            )
            db.add(parent_feature)
            db.flush() # Flush to get ID for sub-features

            # Create Sub-features
            sub_features = f_data.get('sub_features', [])
            for sub_data in sub_features:
                try:
                    sub_status = FeatureStatus(sub_data.get('status', 'discovery').lower())
                except ValueError:
                    sub_status = FeatureStatus.DISCOVERY

                try:
                    sub_priority = IssuePriority(sub_data.get('priority', 'medium').lower())
                except ValueError:
                    sub_priority = IssuePriority.MEDIUM

                try:
                    sub_type = FeatureType(sub_data.get('type', 'new_capability').lower())
                except ValueError:
                    sub_type = FeatureType.NEW_CAPABILITY

                # Generate sub-feature identifier
                current_feature_num += 1
                s_identifier = f"{team_prefix}-F{current_feature_num}"

                sub_feature = Feature(
                    project_id=idea.project_id,
                    parent_id=parent_feature.id,
                    name=sub_data.get('name', 'Unnamed Sub-feature'),
                    problem_statement=sub_data.get('description'),
                    target_user=sub_data.get('target_user'),
                    expected_outcome=sub_data.get('expected_outcome'),
                    success_metric=sub_data.get('success_metric'),
                    status=sub_status,
                    priority=sub_priority,
                    type=sub_type,
                    owner_id=user_id,
                    health=FeatureHealth.ON_TRACK,
                    identifier=s_identifier
                )
                db.add(sub_feature)

        db.commit()
        logging.info(f"Successfully created features for idea {idea_id}")

    except Exception as e:
        logging.error(f"Background feature creation failed: {str(e)}")
        db.rollback()
    finally:
        db.close()


@router.post("/idea/{idea_id}/validate/approve")
async def approve_validation_report(
    idea_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Phase 2 Approval: Accepts the validation report and triggers automatic feature creation.
    This runs in the background and creates features/sub-features in the database.
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    if not idea.validation_report:
        raise HTTPException(status_code=400, detail="Validation report not found. Complete validation first.")

    # Trigger background task
    background_tasks.add_task(create_features_background, idea_id, str(current_user.id))
    
    return {"message": "Phase 2 approved. Feature creation started in background."}


@router.get("/ideas/{project_id}")
async def get_project_ideas(
    project_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Get all ideas for a project, ordered by most recent."""
    ideas = db.query(ProjectIdea).filter(
        ProjectIdea.project_id == project_id
    ).order_by(ProjectIdea.created_at.desc()).all()

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
async def get_project_ideas(
    project_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Get all ideas for a specific project, ordered by created_at descending."""
    ideas = db.query(ProjectIdea).filter(
        ProjectIdea.project_id == project_id
    ).order_by(ProjectIdea.created_at.desc()).all()

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
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Get progress dashboard for an idea."""
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    # Count completed docs
    completed_docs = db.query(ProjectAsset).filter(
        ProjectAsset.project_idea_id == idea_id,
        ProjectAsset.status == AssetStatus.COMPLETED,
        ProjectAsset.asset_type.in_(DOC_ORDER)
    ).count()

    context = {
        "validation_report": idea.validation_report is not None,
        "blueprint": db.query(ProjectAsset).filter(
            ProjectAsset.project_idea_id == idea_id,
            ProjectAsset.asset_type == AssetType.DIAGRAM_USER_FLOW
        ).first() is not None,
        "needs_clarification": idea.status == IdeaStatus.CLARIFICATION_NEEDED,
        "docs_completed": completed_docs,
        "next_steps": _get_next_steps(idea, completed_docs, db)
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


@router.post("/idea/{idea_id}/doc/upload")
async def upload_document(
    idea_id: str,
    doc_type: AssetType,
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Manual Upload - Uploads a .md or .docx file and saves it as an asset.
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    content = ""
    filename = file.filename.lower() if file.filename else ""

    if filename.endswith(".md"):
        content = (await file.read()).decode("utf-8")
    elif filename.endswith(".docx"):
        result = mammoth.convert_to_markdown(file.file)
        content = result.value
    else:
        raise HTTPException(status_code=400, detail="Only .md and .docx files supported")

    # Upload to R2
    r2_key = f"projects/{idea_id}/docs/{doc_type.value}_manual_{filename}.md"
    await storage_service.upload_content(r2_key, content)

    asset = crud_project_idea.project_idea.create_or_update_asset(
        db=db, idea_id=idea_id, asset_type=doc_type,
        content=content, status=AssetStatus.COMPLETED, r2_path=r2_key
    )

    return asset


@router.post("/idea/{idea_id}/blueprint/sync")
async def sync_blueprint_from_docs(
    idea_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Syncs validation and blueprint from existing manual docs.
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    # Fetch all completed assets (docs) for this idea
    assets = db.query(ProjectAsset).filter(
        ProjectAsset.project_idea_id == idea_id,
        ProjectAsset.status == AssetStatus.COMPLETED
    ).all()

    if not assets:
        raise HTTPException(status_code=400, detail="No completed documents found to sync from")

    # Combine content from all docs
    docs_context = "\n\n".join([f"--- {a.asset_type.value} ---\n{a.content}" for a in assets])

    # 1. Generate validation report from docs
    report_data = await ai_service.validate_idea(idea.raw_input, [], docs_context)

    required_fields = ["market_feasibility", "improvements", "core_features", "tech_stack", "pricing_model"]

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
        "tech_stack": report.tech_stack
    }
    blueprint_data = await ai_service.generate_blueprint(blueprint_context)

    # 3. Save blueprint assets
    crud_project_idea.project_idea.create_or_update_asset(
        db=db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_USER_FLOW,
        content=blueprint_data.get("user_flow_mermaid", ""), status=AssetStatus.COMPLETED
    )
    crud_project_idea.project_idea.create_or_update_asset(
        db=db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_KANBAN,
        content=str(blueprint_data.get("kanban_features", [])), status=AssetStatus.COMPLETED
    )

    idea.status = IdeaStatus.BLUEPRINT_GENERATED
    db.commit()

    return {
        "validation_report": report,
        "blueprint": blueprint_data
    }


@router.post("/idea/submit", response_model=schemas.IdeaResponse)
async def submit_idea(
    idea_in: schemas.IdeaSubmit,
    project_id: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
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
            questions = await ai_service.generate_clarification_questions(idea_in.raw_input, max_questions=7)
        except Exception as e:
            import logging
            logging.error(f"AI Clarification failed: {str(e)}")
            questions = []

        # If no project_id provided, create a placeholder project
        if not project_id:
            from app.models.project import Project, ProjectStatus
            from app.models.team_model import Team

            # Try to find any team user leads or belongs to
            default_team = db.query(Team).join(Team.members).filter(User.id == current_user.id).first()

            # Fallback: Any team in user's organization
            if not default_team and current_user.organization_id:
                default_team = db.query(Team).filter(Team.organization_id == current_user.organization_id).first()

            if not default_team:
                raise HTTPException(status_code=400, detail="User must belong to a team or organization to create a project")

            new_proj = Project(
                name=idea_in.name or (idea_in.raw_input[:47] + "..." if len(idea_in.raw_input) > 50 else idea_in.raw_input),
                icon="🚀",
                color="blue",
                status=ProjectStatus.PLANNED,
                team_id=default_team.id,
                lead_id=current_user.id
            )
            db.add(new_proj)
            db.flush()
            project_id = str(new_proj.id)

        db_idea = crud_project_idea.project_idea.create_with_user(
            db=db, obj_in=idea_in, user_id=str(current_user.id)
        )
        db_idea.project_id = project_id

        if questions:
            db_idea.clarification_questions = [{"question": q, "answer": None, "suggestion": None} for q in questions]
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
    except Exception as e:
        import traceback
        logging.error(f"Submit idea error: {str(e)}")
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.post("/idea/{idea_id}/suggest/{question_index}")
async def suggest_answer(
    idea_id: str,
    question_index: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Phase 1: Skip & Suggest - AI suggests an answer for a specific clarification question.
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea or not idea.clarification_questions:
        raise HTTPException(status_code=404, detail="Idea or questions not found")

    if question_index >= len(idea.clarification_questions):
        raise HTTPException(status_code=400, detail="Invalid question index")

    question_obj = idea.clarification_questions[question_index]
    previous_qa = [q for q in idea.clarification_questions if q.get("answer")]

    suggestion = await ai_service.suggest_answer(
        idea.raw_input,
        question_obj["question"],
        previous_qa,
        {"project_name": idea.name}
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
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Phase 1: Answer Clarifications - Updates the idea with answers.
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    if idea.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Update questions with answers
    answer_dict = {a.question: a.answer for a in answers}
    for i, q in enumerate(idea.clarification_questions):
        if q["question"] in answer_dict:
            idea.clarification_questions[i]["answer"] = answer_dict[q["question"]]

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(idea, "clarification_questions")

    # Format answers into the refined description
    formatted_qa = "\n".join([f"Q: {a.question}\nA: {a.answer}" for a in answers])
    idea.refined_description = (idea.refined_description or "") + "\n\nClarifications:\n" + formatted_qa
    idea.status = IdeaStatus.READY_FOR_VALIDATION
    db.commit()
    db.refresh(idea)
    return idea


@router.post("/idea/{idea_id}/validate", response_model=schemas.ValidationReportResponse)
async def validate_idea(
    idea_id: str,
    feedback: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Phase 2: Validation & Analysis - Validates idea against 6 core pillars.
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

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
        raise HTTPException(status_code=500, detail="AI Validation failed to generate report data.")

    # Ensure all required fields are present
    required_fields = ["market_feasibility", "improvements", "core_features", "tech_stack", "pricing_model"]
    
    # Log the received report_data keys
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Report data keys: {list(report_data.keys())}")

    missing_fields = [field for field in required_fields if field not in report_data]
    if missing_fields:
        logger.error(f"Missing fields in validation report: {missing_fields}")
        # Set default values for missing fields
        if "market_feasibility" not in report_data:
            report_data["market_feasibility"] = {"score": 50, "analysis": "Unable to analyze", "pillars": []}
        if "improvements" not in report_data:
            report_data["improvements"] = []
        if "core_features" not in report_data:
            report_data["core_features"] = []
        if "tech_stack" not in report_data:
            report_data["tech_stack"] = {"frontend": [], "backend": [], "infrastructure": []}
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
        target_type="ai_idea"
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
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Phase 2: Manual Edit Update - Saves manual changes to the validation report.
    Auto-saves user edits.
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea or not idea.validation_report:
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
async def regenerate_validation_field(
    idea_id: str,
    field_name: str,
    feedback: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Phase 2: Regenerate a specific validation field based on user feedback.
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea or not idea.validation_report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Get current value of the field
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
        }
    }

    # Regenerate the field
    new_value = await ai_service.regenerate_validation_field(
        field_name, current_value, feedback, context
    )

    # Update the field
    setattr(idea.validation_report, field_name, new_value)
    db.commit()
    db.refresh(idea.validation_report)

    # Return serialized version to avoid Pydantic serialization issues
    return {
        "market_feasibility": idea.validation_report.market_feasibility,
        "core_features": idea.validation_report.core_features,
        "tech_stack": idea.validation_report.tech_stack,
        "pricing_model": idea.validation_report.pricing_model,
        "improvements": idea.validation_report.improvements,
    }


@router.post("/idea/{idea_id}/validate/accept-improvements")
async def accept_improvements_and_revalidate(
    idea_id: str,
    accepted_improvements: List[int] = Body(..., description="List of improvement indices to accept (0-based)"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Phase 2: Accept selected improvements and re-validate the idea.
    The AI will incorporate the accepted improvements into the validation and re-run the 6-pillar analysis.
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea or not idea.validation_report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Get the improvements
    all_improvements = idea.validation_report.improvements or []
    if not all_improvements:
        raise HTTPException(status_code=400, detail="No improvements available")

    # Filter accepted improvements
    selected_improvements = [all_improvements[i] for i in accepted_improvements if 0 <= i < len(all_improvements)]

    if not selected_improvements:
        raise HTTPException(status_code=400, detail="No valid improvements selected")

    # Build feedback text incorporating accepted improvements
    improvements_text = "\n".join([f"- {imp}" for imp in selected_improvements])
    feedback = f"The user has accepted these improvements and wants them incorporated into the validation:\n{improvements_text}\n\nPlease re-validate the idea against the 6 core pillars, considering these improvements have been accepted."

    # Build clarifications from questions if available
    clarifications = []
    if idea.clarification_questions:
        clarifications = [
            {"question": q["question"], "answer": q.get("answer", "")}
            for q in idea.clarification_questions
            if q.get("answer")
        ]

    # Re-run validation with the feedback
    full_text = f"{idea.raw_input}\n{idea.refined_description or ''}"
    full_text += f"\n\nUSER ACCEPTED IMPROVEMENTS:\n{improvements_text}"

    report_data = await ai_service.validate_idea(full_text, clarifications, feedback)

    # Ensure all required fields are present
    required_fields = ["market_feasibility", "improvements", "core_features", "tech_stack", "pricing_model"]
    missing_fields = [field for field in required_fields if field not in report_data]
    if missing_fields:
        logger.error(f"Missing fields in validation report: {missing_fields}")
        if "market_feasibility" not in report_data:
            report_data["market_feasibility"] = {"score": 50, "analysis": "Unable to analyze", "pillars": []}
        if "improvements" not in report_data:
            report_data["improvements"] = []
        if "core_features" not in report_data:
            report_data["core_features"] = []
        if "tech_stack" not in report_data:
            report_data["tech_stack"] = {"frontend": [], "backend": [], "infrastructure": []}
        if "pricing_model" not in report_data:
            report_data["pricing_model"] = {"type": "Unknown", "tiers": []}

    # Update the validation report
    for key, value in report_data.items():
        setattr(idea.validation_report, key, value)
    db.commit()
    db.refresh(idea.validation_report)

    # Notify user
    notification_service.notify_user(
        db,
        recipient_id=current_user.id,
        type=NotificationType.AI_VALIDATION_READY,
        title="Validation Updated",
        content=f"Validation re-run with {len(selected_improvements)} accepted improvements.",
        target_id=str(idea.id),
        target_type="ai_idea"
    )

    # Return the updated report
    return {
        "market_feasibility": idea.validation_report.market_feasibility,
        "core_features": idea.validation_report.core_features,
        "tech_stack": idea.validation_report.tech_stack,
        "pricing_model": idea.validation_report.pricing_model,
        "improvements": idea.validation_report.improvements,
    }


@router.post("/idea/{idea_id}/blueprint", response_model=schemas.BlueprintResponse)
async def generate_blueprint(
    idea_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Phase 3: Visual Blueprint - Generates User Flow and Kanban.
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea or not idea.validation_report:
        raise HTTPException(status_code=400, detail="Idea not validated yet")

    context = {
        "idea": idea.raw_input,
        "features": idea.validation_report.core_features,
        "tech_stack": idea.validation_report.tech_stack
    }

    blueprint_data = await ai_service.generate_blueprint(context)

    # Save as assets
    crud_project_idea.project_idea.create_or_update_asset(
        db=db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_USER_FLOW,
        content=blueprint_data.get("user_flow_mermaid", ""), status=AssetStatus.COMPLETED
    )

    # Save kanban features
    kanban_content = str(blueprint_data.get("kanban_features", []))

    # Save nodes and edges for frontend visualization
    nodes_data = blueprint_data.get("nodes", [])
    edges_data = blueprint_data.get("edges", [])

    crud_project_idea.project_idea.create_or_update_asset(
        db=db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_KANBAN,
        content=kanban_content, status=AssetStatus.COMPLETED
    )

    # Save flow nodes for visualization
    if nodes_data:
        import json
        crud_project_idea.project_idea.create_or_update_asset(
            db=db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_USER_FLOW,
            content=json.dumps({"nodes": nodes_data, "edges": edges_data}),
            status=AssetStatus.COMPLETED
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
        target_type="ai_idea"
    )

    return {
        "user_flow_mermaid": blueprint_data.get("user_flow_mermaid", ""),
        "kanban_features": blueprint_data.get("kanban_features", []),
        "nodes": nodes_data,
        "edges": edges_data
    }


@router.put("/idea/{idea_id}/blueprint")
async def save_blueprint(
    idea_id: str,
    blueprint_in: Dict[str, Any],
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Manually save updated blueprint data (node positions, etc.).
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    import json
    content = json.dumps({
        "nodes": blueprint_in.get("nodes", []),
        "edges": blueprint_in.get("edges", []),
        "user_flow_mermaid": blueprint_in.get("user_flow_mermaid", "")
    })

    crud_project_idea.project_idea.create_or_update_asset(
        db=db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_USER_FLOW,
        content=content, status=AssetStatus.COMPLETED
    )

    return {"message": "Blueprint saved successfully"}


@router.get("/idea/{idea_id}/doc/{doc_type}/questions")
async def get_doc_questions(
    idea_id: str,
    doc_type: AssetType,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Phase 4: Get questions for a specific document type.
    Returns empty if no questions are needed.
    Includes AI suggestions for skipping questions.
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    # Build project context
    project_context = {
        "idea": idea.raw_input,
        "refined_description": idea.refined_description,
        "validation": {
            "market_feasibility": idea.validation_report.market_feasibility,
            "core_features": idea.validation_report.core_features,
            "tech_stack": idea.validation_report.tech_stack,
            "pricing_model": idea.validation_report.pricing_model,
            "improvements": idea.validation_report.improvements,
        } if idea.validation_report else None,
    }

    # Get previous docs
    doc_index = ai_service.get_doc_index(doc_type.value)
    previous_docs = {}

    if doc_index > 0:
        for i in range(doc_index):
            prev_type = DOC_ORDER[i]
            prev_asset = crud_project_idea.project_idea.get_asset(db, idea_id=idea_id, asset_type=prev_type)
            if prev_asset and prev_asset.content:
                previous_docs[prev_type] = prev_asset.content

    # Also include blueprint context
    if doc_index > 0:
        blueprint_asset = crud_project_idea.project_idea.get_asset(db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_USER_FLOW)
        kanban_asset = crud_project_idea.project_idea.get_asset(db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_KANBAN)
        if blueprint_asset:
            project_context["blueprint"] = {"user_flow": blueprint_asset.content}
        if kanban_asset:
            try:
                import ast
                project_context["blueprint"]["kanban"] = ast.literal_eval(kanban_asset.content or "[]")
            except:
                project_context["blueprint"]["kanban"] = []

    # Generate questions
    questions = await ai_service.generate_doc_questions(
        doc_type.value, project_context, previous_docs
    )

    return questions


@router.post("/idea/{idea_id}/doc/{doc_type}", response_model=schemas.DocResponse)
async def generate_document(
    idea_id: str,
    doc_type: AssetType,
    answers: Optional[List[Dict[str, str]]] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Phase 4: Generate Doc - Generates a document with optional user answers.
    Checks if previous docs are completed before proceeding.
    Answers are from the question flow that users answered (or skipped with AI suggestions).
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    # Check dependencies - previous doc must be completed
    doc_index = ai_service.get_doc_index(doc_type.value)
    if doc_index > 0:
        prev_type = DOC_ORDER[doc_index - 1]
        prev_asset = crud_project_idea.project_idea.get_asset(db, idea_id=idea_id, asset_type=prev_type)
        if not prev_asset or prev_asset.status != AssetStatus.COMPLETED:
            raise HTTPException(
                status_code=400,
                detail=f"Please complete {prev_type} document first"
            )

    # Construct context from all previous steps
    context = {
        "idea": idea.raw_input,
        "refined_description": idea.refined_description,
        "validation": {
            "market_feasibility": idea.validation_report.market_feasibility,
            "core_features": idea.validation_report.core_features,
            "tech_stack": idea.validation_report.tech_stack,
            "pricing_model": idea.validation_report.pricing_model,
            "improvements": idea.validation_report.improvements,
        } if idea.validation_report else None,
    }

    # Get previous docs
    previous_docs = {}
    for i in range(doc_index):
        prev_type = DOC_ORDER[i]
        prev_asset = crud_project_idea.project_idea.get_asset(db, idea_id=idea_id, asset_type=prev_type)
        if prev_asset and prev_asset.content:
            previous_docs[prev_type] = prev_asset.content

    # Also include blueprint context
    blueprint_asset = crud_project_idea.project_idea.get_asset(db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_USER_FLOW)
    kanban_asset = crud_project_idea.project_idea.get_asset(db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_KANBAN)
    if blueprint_asset:
        context["blueprint"] = {"user_flow": blueprint_asset.content}
        if kanban_asset:
            try:
                import ast
                context["blueprint"]["kanban"] = ast.literal_eval(kanban_asset.content or "[]")
            except:
                context["blueprint"]["kanban"] = []

    # Get chat history from existing asset
    chat_history = []
    existing_asset = crud_project_idea.project_idea.get_asset(db, idea_id=idea_id, asset_type=doc_type.value)
    if existing_asset and existing_asset.chat_history:
        chat_history = existing_asset.chat_history

    # Build answers text for AI context
    answers_text = ""
    if answers:
        answers_text = "\n\n=== User Provided Answers ===\n"
        for ans in answers:
            if ans.get("question"):
                answers_text += f"Q: {ans['question']}\nA: {ans.get('answer', ans.get('suggestion', ''))}\n"

    # Add answers to chat history for context
    if answers:
        chat_history.append({"role": "user", "content": answers_text})

    content = await ai_service.generate_doc(
        doc_type.value, context, chat_history, previous_docs, answers
    )

    # Upload to R2
    r2_key = f"projects/{idea_id}/docs/{doc_type.value}.md"
    await storage_service.upload_content(r2_key, content)

    asset = crud_project_idea.project_idea.create_or_update_asset(
        db=db, idea_id=idea_id, asset_type=doc_type,
        content=content, status=AssetStatus.COMPLETED, r2_path=r2_key
    )

    # Update chat history
    if chat_history:
        asset.chat_history = chat_history
        db.commit()

    # Notify user
    notification_service.notify_user(
        db,
        recipient_id=current_user.id,
        type=NotificationType.AI_DOC_GENERATED,
        title=f"{doc_type.value.replace('_', ' ')} Generated",
        content=f"The {doc_type.value} for your project has been generated successfully.",
        target_id=str(idea.id),
        target_type="ai_idea"
    )

    return asset


@router.post("/idea/{idea_id}/doc/{doc_type}/chat", response_model=schemas.DocResponse)
async def chat_document(
    idea_id: str,
    doc_type: AssetType,
    chat_req: schemas.DocChatRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Phase 4: Chat about Doc - Regenerates/Edits doc based on user feedback.
    Each doc has its own chat session.
    """
    asset = crud_project_idea.project_idea.get_asset(db=db, idea_id=idea_id, asset_type=doc_type)
    if not asset:
        raise HTTPException(status_code=404, detail="Doc not found")

    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)

    # Get chat history
    chat_history = asset.chat_history or []
    chat_history.append({"role": "user", "content": chat_req.message})

    context = {
        "idea": idea.raw_input,
        "refined_description": idea.refined_description,
        "validation": {
            "market_feasibility": idea.validation_report.market_feasibility,
            "core_features": idea.validation_report.core_features,
            "tech_stack": idea.validation_report.tech_stack,
            "pricing_model": idea.validation_report.pricing_model,
            "improvements": idea.validation_report.improvements,
        } if idea.validation_report else None,
    }

    updated_content = await ai_service.chat_about_doc(
        doc_type.value, asset.content, chat_req.message, context, chat_history
    )

    # Update R2
    await storage_service.upload_content(asset.r2_path, updated_content)

    asset.content = updated_content
    asset.chat_history = chat_history
    db.commit()
    db.refresh(asset)

    return asset


@router.post("/idea/{idea_id}/doc/{doc_type}/regenerate-section")
async def regenerate_doc_section(
    idea_id: str,
    doc_type: AssetType,
    section_content: str,
    user_message: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Phase 4: Regenerate a specific section of a document.
    User can select text and ask AI to regenerate a better version.
    """
    asset = crud_project_idea.project_idea.get_asset(db=db, idea_id=idea_id, asset_type=doc_type)
    if not asset:
        raise HTTPException(status_code=404, detail="Doc not found")

    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)

    context = {
        "idea": idea.raw_input,
        "refined_description": idea.refined_description,
        "validation": {
            "market_feasibility": idea.validation_report.market_feasibility,
            "core_features": idea.validation_report.core_features,
            "tech_stack": idea.validation_report.tech_stack,
            "pricing_model": idea.validation_report.pricing_model,
            "improvements": idea.validation_report.improvements,
        } if idea.validation_report else None,
    }

    updated_content = await ai_service.regenerate_doc_section(
        doc_type.value, asset.content, section_content, user_message, context
    )

    # Update R2
    await storage_service.upload_content(asset.r2_path, updated_content)

    asset.content = updated_content
    db.commit()
    db.refresh(asset)

    return asset


@router.get("/idea/{idea_id}/blueprint/node/{node_id}/details")
async def get_blueprint_node_details(
    idea_id: str,
    node_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
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
        "stats": {
            "total_issues": total_issues,
            "done_issues": done_issues
        },
        "issues": [
            {
                "id": str(i.id),
                "identifier": i.identifier,
                "title": i.title,
                "status": i.status,
                "priority": i.priority
            } for i in issues
        ],
        "features": [
            {
                "id": str(f.id),
                "name": f.name,
                "status": f.status
            } for f in features
        ]
    }

@router.post("/idea/{idea_id}/blueprint/node/{node_id}/link-issue")
async def link_issue_to_node(
    idea_id: str,
    node_id: str,
    issue_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Manually link an issue to a blueprint node."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    issue.blueprint_node_id = node_id
    db.commit()
    return {"message": "Issue linked successfully"}

@router.post("/idea/{idea_id}/blueprint/node/{node_id}/unlink-issue")
async def unlink_issue_from_node(
    idea_id: str,
    node_id: str,
    issue_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Unlink an issue from a blueprint node."""
    issue = db.query(Issue).filter(Issue.id == issue_id, Issue.blueprint_node_id == node_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue link not found")
    
    issue.blueprint_node_id = None
    db.commit()
    return {"message": "Issue unlinked successfully"}

@router.get("/idea/{idea_id}", response_model=Any)
async def get_idea_details(
    idea_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Get full idea details including assets and dynamic blueprint completion."""
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    # Load assets
    assets = db.query(ProjectAsset).filter(
        ProjectAsset.project_idea_id == idea_id
    ).all()

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
    blueprint_data = {} # Initialize as dict
    
    for a in assets:
        asset_dict = {
            "id": str(a.id),
            "asset_type": a.asset_type.value,
            "content": a.content,
            "status": a.status.value,
            "chat_history": a.chat_history
        }
        
        if a.asset_type == AssetType.DIAGRAM_USER_FLOW and a.content:
            import json
            try:
                # Try to parse as JSON (new format with nodes/edges)
                flow_data = json.loads(a.content)
                if isinstance(flow_data, dict) and "nodes" in flow_data:
                    blueprint_data.update(flow_data) # Merge nodes/edges
                    
                    # Update each node with actual completion from linked issues
                    for node in blueprint_data.get("nodes", []):
                        node_id = node.get("id")
                        issues = db.query(Issue).filter(Issue.blueprint_node_id == node_id).all()
                        if issues:
                            total = len(issues)
                            done = len([i for i in issues if i.status == IssueStatus.DONE])
                            node["completion"] = round((done / total) * 100)
                            node["issue_count"] = total
                        else:
                            node["completion"] = 0
                    
                    # Update asset content with dynamic completion for frontend
                    asset_dict["content"] = json.dumps(blueprint_data)
                else:
                    # Legacy: Content is just mermaid string
                    blueprint_data["user_flow_mermaid"] = a.content
            except:
                # Fallback if not JSON
                blueprint_data["user_flow_mermaid"] = a.content

        elif a.asset_type == AssetType.DIAGRAM_KANBAN and a.content:
            try:
                import json
                kanban_data = json.loads(a.content)
                blueprint_data["kanban_features"] = kanban_data
            except:
                try:
                    import ast
                    kanban_data = ast.literal_eval(a.content)
                    blueprint_data["kanban_features"] = kanban_data
                except:
                    blueprint_data["kanban_features"] = []
        
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
        "blueprint": blueprint_data if blueprint_data else None # Return None if empty
    }

    return response


@router.post("/idea/{idea_id}/convert", response_model=Any)
async def convert_to_project(
    idea_id: str,
    team_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Phase 3: Finalize - Converts the validated idea and blueprint into a real Project.
    """
    idea = crud_project_idea.project_idea.get(db=db, id=idea_id)
    if not idea or not idea.validation_report:
        raise HTTPException(status_code=400, detail="Idea not validated")

    team = db.query(Team).filter(Team.id == team_id).first()
    team_prefix = team.identifier if team else "AST"

    from app.models.project import Project, ProjectStatus
    from app.models.feature import Feature, FeatureStatus
    from app.models.issue import Issue, IssueStatus, IssueType

    new_project = Project(
        name=idea.raw_input[:50],
        description=idea.refined_description or idea.raw_input,
        team_id=team_id,
        lead_id=current_user.id,
        status=ProjectStatus.PLANNED,
        icon="🚀",
        color="#3b82f6"
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
            name=f_data['name'],
            problem_statement=f_data.get('description'),
            status=FeatureStatus.VALIDATED,
            owner_id=current_user.id,
            identifier=f"{team_prefix}-F{current_feature_num}"
        )
        db.add(feature)
        features_map[f_data['name']] = feature

    db.flush()

    # Create Issues from Kanban
    kanban_asset = crud_project_idea.project_idea.get_asset(db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_KANBAN)
    if kanban_asset and kanban_asset.content:
        import ast
        try:
            kanban_data = ast.literal_eval(kanban_asset.content)
            current_issue_num = crud_issue.get_max_identifier_num(db, team_prefix)
            for i, issue_data in enumerate(kanban_data):
                feature_list = list(features_map.values())
                feature_id = feature_list[i % len(feature_list)].id if feature_list else None

                current_issue_num += 1
                issue = Issue(
                    title=issue_data['title'],
                    status=IssueStatus.TODO,
                    issue_type=IssueType.TASK,
                    team_id=team_id,
                    feature_id=feature_id,
                    identifier=f"{team_prefix}-{current_issue_num}"
                )
                db.add(issue)
        except:
            pass

    idea.status = IdeaStatus.COMPLETED
    db.commit()

    return {"project_id": str(new_project.id)}


@router.get("/doc-order")
async def get_doc_order() -> Any:
    """Get the order of document generation."""
    return {"order": DOC_ORDER}


@router.get("/pillars")
async def get_core_pillars() -> Any:
    """Get the 6 core pillars for validation."""
    return {"pillars": ai_service.get_core_pillars()}