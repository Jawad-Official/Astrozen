import asyncio
import os
import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.project_idea import ProjectAsset, ProjectIdea
from app.models.document import Document
from app.models.enums import AssetType, AssetStatus
from app.services.document_service import document_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate():
    db: Session = SessionLocal()
    try:
        # Get all completed text documents that haven't been migrated yet
        text_asset_types = [
            AssetType.PRD, 
            AssetType.APP_FLOW, 
            AssetType.TECH_STACK, 
            AssetType.FRONTEND_GUIDELINES, 
            AssetType.BACKEND_SCHEMA, 
            AssetType.IMPLEMENTATION_PLAN
        ]
        
        assets = db.query(ProjectAsset).filter(
            ProjectAsset.asset_type.in_(text_asset_types),
            ProjectAsset.status == AssetStatus.COMPLETED
        ).all()
        
        logger.info(f"Found {len(assets)} assets to migrate.")
        
        for asset in assets:
            # Check if Document already exists for this asset's R2 path
            existing_doc = db.query(Document).filter(Document.r2_path == asset.r2_path).first()
            if existing_doc:
                logger.info(f"Skipping already migrated asset: {asset.r2_path}")
                continue
            
            idea = asset.project_idea
            title = f"{idea.raw_input[:30]} - {asset.asset_type.value.replace('_', ' ').title()}"
            
            try:
                logger.info(f"Creating Google Doc for asset: {asset.asset_type.value} of idea {idea.id}")
                drive_file_id = await document_service.create_google_doc(title, asset.content)
                
                new_doc = Document(
                    project_id=idea.project_id,
                    idea_id=idea.id,
                    drive_file_id=drive_file_id,
                    r2_path=asset.r2_path,
                    title=title
                )
                db.add(new_doc)
                db.commit()
                logger.info(f"Successfully migrated {asset.r2_path} to Google Doc {drive_file_id}")
            except Exception as e:
                logger.error(f"Failed to migrate asset {asset.id}: {e}")
                db.rollback()
                
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(migrate())
