import logging
from app.services.ai_service import AiService
from sqlalchemy.orm import Session
from app.models.project_idea import ProjectIdea
from uuid import UUID

logger = logging.getLogger(__name__)

from app.models.project_asset import ProjectAsset, AssetType

from app.services.storage_service import R2StorageProvider

class MermaidGenerator:
    def __init__(self, ai_service: AiService, storage: R2StorageProvider):
        self.ai_service = ai_service
        self.storage = storage

    async def generate_user_flow(self, db: Session, idea_id: UUID) -> str:
        idea = db.query(ProjectIdea).filter(ProjectIdea.id == idea_id).first()
        if not idea:
            return ""

        system_prompt = "You are a UX architect. Generate a User Flow Diagram in Mermaid.js syntax."
        user_prompt = f"Project Description: {idea.refined_description}\n\nFeatures: {idea.validation_report.core_features}\n\nFormat: Return only the Mermaid syntax (graph TD...)."
        
        mermaid_code = await self.ai_service.generate_text(system_prompt, user_prompt)
        
        # Strip markdown code blocks if present
        mermaid_code = mermaid_code.replace("```mermaid", "").replace("```", "").strip()
        
        if mermaid_code:
            filename = f"projects/{idea_id}/diagrams/user_flow.mmd"
            self.storage.upload_file(mermaid_code.encode('utf-8'), filename, content_type="text/plain")
            
            new_asset = ProjectAsset(
                project_idea_id=idea_id,
                asset_type=AssetType.DIAGRAM_MERMAID,
                storage_path=filename,
                file_format="mmd"
            )
            db.add(new_asset)
            db.commit()
            
        return mermaid_code
