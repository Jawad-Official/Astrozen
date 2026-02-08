from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api import deps
from app.core.database import get_db, SessionLocal
from app.models.project_idea import ProjectIdea, IdeaStatus
from app.models.feature import Feature, FeatureStatus, FeatureType
from app.models.issue import IssuePriority
from app.schemas.ai_validator import ProjectIdeaCreate, ProjectIdeaResponse, ClarificationAnswer, ClarificationResponse, ValidationReportResponse
from app.services.idea_validator_service import IdeaValidatorService
from app.services.ai_service import AiService
from app.services.ai_prompt_manager import PromptManager
from app.services.storage_service import R2StorageProvider
from app.services.doc_generator import DocGenerator
from app.services.mermaid_generator import MermaidGenerator
from app.services.kanban_generator import KanbanGenerator
from uuid import UUID
from typing import List, Dict

router = APIRouter()

import logging

logger = logging.getLogger(__name__)

async def run_generate_validation_report(idea_id: UUID, ai_service: AiService, prompt_manager: PromptManager, qa_history: List[Dict[str, str]]):
    """Wrapper to run validation report generation with its own DB session"""
    logger.info(f"Starting validation report generation for idea {idea_id}")
    db = SessionLocal()
    try:
        validator = IdeaValidatorService(ai_service, prompt_manager)
        await validator.generate_validation_report(db, idea_id, qa_history)
        logger.info(f"Successfully generated validation report for idea {idea_id}")
    except Exception as e:
        logger.error(f"Failed to generate validation report for idea {idea_id}: {e}")
    finally:
        db.close()

async def run_generate_assets(idea_id: UUID, ai_service: AiService, storage: R2StorageProvider):
    """Wrapper to run asset generation with its own DB session"""
    logger.info(f"Starting asset generation for idea {idea_id}")
    db = SessionLocal()
    try:
        doc_gen = DocGenerator(ai_service, storage)
        mermaid_gen = MermaidGenerator(ai_service, storage)
        kanban_gen = KanbanGenerator(ai_service)
        
        await doc_gen.generate_all_docs(db, idea_id)
        await mermaid_gen.generate_user_flow(db, idea_id)
        await kanban_gen.generate_tickets(db, idea_id)
        logger.info(f"Successfully generated all assets for idea {idea_id}")
    except Exception as e:
        logger.error(f"Failed to generate assets for idea {idea_id}: {e}")
    finally:
        db.close()

@router.post("/", response_model=ProjectIdeaResponse)
def create_idea(
    *,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
    idea_in: ProjectIdeaCreate
):
    """Create a new project idea (Authenticated)"""
    idea = ProjectIdea(
        user_id=current_user.id,
        project_id=idea_in.project_id,
        raw_input=idea_in.raw_input,
        status=IdeaStatus.DRAFT
    )
    db.add(idea)
    db.commit()
    db.refresh(idea)
    logger.info(f"Created ProjectIdea {idea.id} for user {current_user.id}")
    return idea

@router.post("/{id}/clarify", response_model=ClarificationResponse)
async def clarify_idea(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    answer_in: ClarificationAnswer,
    ai_service: AiService = Depends(deps.get_ai_service),
    prompt_manager: PromptManager = Depends(deps.get_prompt_manager)
):
    """Submit answer to AI question and get next question or completion signal"""
    validator = IdeaValidatorService(ai_service, prompt_manager)
    try:
        result = await validator.get_next_question(db, id, answer_in.history or [])
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in clarify_idea: {e}")
        raise HTTPException(status_code=500, detail="Failed to process clarification")

@router.get("/{id}/validation", response_model=ValidationReportResponse)
def get_validation(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    current_user = Depends(deps.get_current_active_user)
):
    """Get validation report for an idea (Owner/Admin only)"""
    idea = db.query(ProjectIdea).filter(ProjectIdea.id == id).first()
    
    # If idea is not found yet, return 202 to keep polling alive
    if not idea:
        raise HTTPException(status_code=202, detail="Idea context initializing...")
    
    if idea.user_id and idea.user_id != current_user.id and not deps.check_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if not idea.validation_report:
        raise HTTPException(status_code=202, detail="Report is still generating")
    
    # Merge report data with refined_description from the idea
    return {
        "market_analysis": idea.validation_report.market_analysis,
        "core_features": idea.validation_report.core_features,
        "tech_stack": idea.validation_report.tech_stack,
        "pricing_model": idea.validation_report.pricing_model,
        "improvements": idea.validation_report.improvements,
        "refined_description": idea.refined_description or ""
    }

@router.post("/{id}/confirm", response_model=ProjectIdeaResponse)
async def confirm_idea(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    refined_in: ClarificationAnswer,
    background_tasks: BackgroundTasks,
    current_user = Depends(deps.get_current_active_user),
    ai_service: AiService = Depends(deps.get_ai_service),
    prompt_manager: PromptManager = Depends(deps.get_prompt_manager),
    storage: R2StorageProvider = Depends(deps.get_storage_provider)
):
    """Confirm the idea and trigger asset generation (Owner/Admin only)"""
    idea = db.query(ProjectIdea).filter(ProjectIdea.id == id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    if idea.user_id != current_user.id and not deps.check_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    idea.refined_description = refined_in.answer
    idea.status = IdeaStatus.CONFIRMED
    
    if idea.project_id and idea.validation_report:
        for feat_data in idea.validation_report.core_features:
            priority = IssuePriority.LOW
            p_str = feat_data.get("priority", "").upper()
            if "P1" in p_str: priority = IssuePriority.HIGH
            elif "P2" in p_str: priority = IssuePriority.MEDIUM
            
            new_feature = Feature(
                project_id=idea.project_id,
                name=feat_data.get("name", "Untitled Feature"),
                problem_statement=feat_data.get("description"),
                status=FeatureStatus.VALIDATED,
                priority=priority,
                type=FeatureType.NEW_CAPABILITY,
                owner_id=current_user.id
            )
            db.add(new_feature)
            
    db.commit()
    background_tasks.add_task(run_generate_assets, id, ai_service, storage)
    return idea

@router.get("/{id}/assets")
def list_idea_assets(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    current_user = Depends(deps.get_current_active_user)
):
    """List generated assets for an idea"""
    idea = db.query(ProjectIdea).filter(ProjectIdea.id == id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    if idea.user_id != current_user.id and not deps.check_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return idea.assets

class RefineRequest(BaseModel):
    section: str
    prompt: str

@router.post("/{id}/refine")
async def refine_validation(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    req: RefineRequest,
    current_user = Depends(deps.get_current_active_user),
    ai_service: AiService = Depends(deps.get_ai_service),
    prompt_manager: PromptManager = Depends(deps.get_prompt_manager)
):
    """Refine a specific section of the validation report using AI"""
    idea = db.query(ProjectIdea).filter(ProjectIdea.id == id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    validator = IdeaValidatorService(ai_service, prompt_manager)
    await validator.refine_report(db, id, req.section, req.prompt)
    return {"status": "success"}

@router.post("/{id}/start-validation", response_model=ProjectIdeaResponse)

async def start_validation(

    *,

    db: Session = Depends(get_db),

    id: UUID,

    answer_in: ClarificationAnswer,

    background_tasks: BackgroundTasks,

    current_user = Depends(deps.get_current_active_user),

    ai_service: AiService = Depends(deps.get_ai_service),

    prompt_manager: PromptManager = Depends(deps.get_prompt_manager)

):

    """Trigger the validation report generation asynchronously"""

    idea = db.query(ProjectIdea).filter(ProjectIdea.id == id).first()

    if not idea:

        raise HTTPException(status_code=404, detail="Idea not found")

    

    if idea.user_id != current_user.id and not deps.check_is_admin(current_user):

        raise HTTPException(status_code=403, detail="Not enough permissions")

    

    idea.status = IdeaStatus.VALIDATING

    db.commit()

    background_tasks.add_task(run_generate_validation_report, id, ai_service, prompt_manager, answer_in.history or [])

    return idea
