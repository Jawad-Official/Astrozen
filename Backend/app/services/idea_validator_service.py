import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.project_idea import ProjectIdea, ValidationReport, IdeaStatus
from app.services.ai_service import AiService
from app.services.ai_prompt_manager import PromptManager
from uuid import UUID

logger = logging.getLogger(__name__)

class IdeaValidatorService:
    def __init__(self, ai_service: AiService, prompt_manager: PromptManager):
        self.ai_service = ai_service
        self.prompt_manager = prompt_manager

    async def get_next_question(self, db: Session, idea_id: UUID, qa_history: List[Dict[str, str]]) -> Dict[str, Any]:
        idea = db.query(ProjectIdea).filter(ProjectIdea.id == idea_id).first()
        if not idea:
            raise ValueError("Project idea not found")

        try:
            formatted_history = "\n".join([f"Q: {h.get('question', '')}\nA: {h.get('answer', '')}" for h in qa_history])
        except Exception as e:
            logger.error(f"Error formatting history: {e}")
            formatted_history = ""

        current_index = len(qa_history) + 1
        
        try:
            prompts = self.prompt_manager.get_prompt("clarification_questions", {
                "idea": idea.raw_input,
                "qa_history": formatted_history,
                "current_index": current_index
            })
            
            result = await self.ai_service.generate_json(prompts["system"], prompts["user"])
            return result
        except Exception as e:
            logger.error(f"Error generating next question: {e}")
            raise e

    async def generate_validation_report(self, db: Session, idea_id: UUID, qa_history: List[Dict[str, str]]) -> ValidationReport:
        idea = db.query(ProjectIdea).filter(ProjectIdea.id == idea_id).first()
        if not idea:
            raise ValueError("Project idea not found")

        formatted_history = "\n".join([f"Q: {h['question']}\nA: {h['answer']}" for h in qa_history])
        
        prompts = self.prompt_manager.get_prompt("validation_report", {
            "idea": idea.raw_input,
            "qa_history": formatted_history
        })
        
        report_data = await self.ai_service.generate_json(prompts["system"], prompts["user"])
        
        # Create report in DB
        report = ValidationReport(
            project_idea_id=idea_id,
            market_analysis=report_data["market_analysis"],
            improvements=report_data["improvements"],
            core_features=report_data["core_features"],
            tech_stack=report_data["tech_stack"],
            pricing_model=report_data["pricing_model"]
        )
        
        idea.refined_description = report_data["refined_description"]
        idea.status = IdeaStatus.VALIDATED
        
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    async def refine_report(self, db: Session, idea_id: UUID, section: str, feedback: str) -> ValidationReport:
        idea = db.query(ProjectIdea).filter(ProjectIdea.id == idea_id).first()
        if not idea or not idea.validation_report:
            raise ValueError("Report not found for refinement")

        system_prompt = f"You are a project architect. The user wants to refine the '{section}' of their project validation report."
        user_prompt = f"Original Data: {getattr(idea.validation_report, section)}\nUser Feedback: {feedback}\n\nGenerate the updated '{section}' in valid JSON format only."

        updated_section_data = await self.ai_service.generate_json(system_prompt, user_prompt)
        
        # Update specific section
        setattr(idea.validation_report, section, updated_section_data)
        db.commit()
        db.refresh(idea.validation_report)
        return idea.validation_report
