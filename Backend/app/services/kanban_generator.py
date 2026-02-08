import logging
import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.project_idea import ProjectIdea
from app.models.issue import Issue, IssueStatus, IssueType, IssuePriority
from app.models.feature import Feature
from app.services.ai_service import AiService
from uuid import UUID

logger = logging.getLogger(__name__)

class KanbanGenerator:
    def __init__(self, ai_service: AiService):
        self.ai_service = ai_service

    async def generate_tickets(self, db: Session, idea_id: UUID):
        idea = db.query(ProjectIdea).filter(ProjectIdea.id == idea_id).first()
        if not idea or not idea.project_id:
            return

        # Fetch features created for this project/idea
        features = db.query(Feature).filter(Feature.project_id == idea.project_id).all()
        
        for feature in features:
            system_prompt = "You are a technical project manager. Break down this feature into 2-4 atomic Kanban tasks."
            user_prompt = f"Feature: {feature.name}\nDescription: {feature.problem_statement}\n\nFormat: Return a JSON list of objects with 'title', 'description', 'type' (task/bug/refactor), and 'priority' (low/medium/high/critical)."
            
            tickets_data = await self.ai_service.generate_json(system_prompt, user_prompt)
            
            if not tickets_data or not isinstance(tickets_data, list):
                continue

            for t in tickets_data:
                # Map priority
                priority = IssuePriority.LOW
                p_str = t.get("priority", "").lower()
                if "critical" in p_str: priority = IssuePriority.URGENT
                elif "high" in p_str: priority = IssuePriority.HIGH
                elif "medium" in p_str: priority = IssuePriority.MEDIUM
                
                # Map type
                issue_type = IssueType.TASK
                t_str = t.get("type", "").lower()
                if "bug" in t_str: issue_type = IssueType.BUG
                elif "refactor" in t_str: issue_type = IssueType.REFACTOR
                
                new_issue = Issue(
                    title=t.get("title", "Untitled Task"),
                    description=t.get("description"),
                    status=IssueStatus.TODO,
                    priority=priority,
                    issue_type=issue_type,
                    feature_id=feature.id,
                    team_id=feature.project.team_id,
                    identifier=f"AI-{uuid.uuid4().hex[:4].upper()}" # Temporary identifier
                )
                db.add(new_issue)
            
            db.commit()
            logger.info(f"Generated tickets for feature {feature.name}")