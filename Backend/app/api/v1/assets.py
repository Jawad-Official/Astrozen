from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.api import deps
from app.core.database import get_db, SessionLocal
from app.models.project_asset import ProjectAsset, AssetType, AssetStatus
from app.services.storage_service import R2StorageProvider
from app.services.doc_generator import DocGenerator
from app.services.ai_service import AiService
from uuid import UUID
from typing import List, Dict, Optional
from pydantic import BaseModel

router = APIRouter()

class DocGenerateRequest(BaseModel):
    answers: Optional[Dict[str, str]] = None

async def run_generate_doc(idea_id: UUID, doc_type: AssetType, answers: Optional[Dict[str, str]], ai_service: AiService, storage: R2StorageProvider):
    db = SessionLocal()
    try:
        doc_gen = DocGenerator(ai_service, storage)
        await doc_gen.generate_single_doc(db, idea_id, doc_type, answers)
    finally:
        db.close()

@router.get("/{idea_id}/docs/{doc_type}/questions")
async def get_doc_questions(
    idea_id: UUID,
    doc_type: AssetType,
    db: Session = Depends(get_db),
    ai_service: AiService = Depends(deps.get_ai_service),
    storage: R2StorageProvider = Depends(deps.get_storage_provider)
):
    doc_gen = DocGenerator(ai_service, storage)
    questions = await doc_gen.get_doc_questions(db, idea_id, doc_type)
    return {"questions": questions}

@router.post("/{idea_id}/docs/{doc_type}/generate")
async def generate_doc(
    idea_id: UUID,
    doc_type: AssetType,
    req: DocGenerateRequest,
    background_tasks: BackgroundTasks,
    ai_service: AiService = Depends(deps.get_ai_service),
    storage: R2StorageProvider = Depends(deps.get_storage_provider)
):
    background_tasks.add_task(run_generate_doc, idea_id, doc_type, req.answers, ai_service, storage)
    return {"status": "generating"}

@router.get("/{asset_id}/download")
def download_asset(
    *,
    db: Session = Depends(get_db),
    asset_id: UUID,
    format: str = "pdf",
    current_user = Depends(deps.get_current_active_user),
    storage: R2StorageProvider = Depends(deps.get_storage_provider)
):
    asset = db.query(ProjectAsset).filter(ProjectAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    path = asset.storage_path_pdf if format == "pdf" else (asset.storage_path_docx if format == "docx" else asset.storage_path)
    
    if not path:
        raise HTTPException(status_code=400, detail=f"Format {format} not available for this asset")

    url = storage.generate_signed_url(path)
    if not url:
        raise HTTPException(status_code=500, detail="Failed to generate download link")
    
    return {"url": url}

@router.get("/{asset_id}/content")
def get_asset_content(
    *,
    db: Session = Depends(get_db),
    asset_id: UUID,
    current_user = Depends(deps.get_current_active_user),
    storage: R2StorageProvider = Depends(deps.get_storage_provider)
):
    asset = db.query(ProjectAsset).filter(ProjectAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    try:
        response = storage.s3_client.get_object(Bucket=storage.bucket_name, Key=asset.storage_path)
        content = response['Body'].read().decode('utf-8')
        return content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch content: {e}")