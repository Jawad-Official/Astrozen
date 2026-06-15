from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
import sqlalchemy as sa
from sqlalchemy.orm import Session
from typing import List, Any, Optional
from uuid import UUID

from app.api import deps
from app.models.document import Document
from app.models.user import User
from app.schemas import ai as schemas
from app.services.document_service import document_service
from app.services.storage_service import storage_service

router = APIRouter()

@router.post("/", response_model=schemas.DocumentMeta)
async def create_document(
    project_id: UUID,
    title: str,
    content_md: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Create a new Google Doc and sync it to R2."""
    try:
        drive_file_id = await document_service.create_google_doc(title, content_md, user_email=current_user.email)
        r2_path = f"projects/{project_id}/docs/{title.replace(' ', '_').lower()}.md"
        
        # Initial sync to R2
        await document_service.sync_doc_to_r2(drive_file_id, r2_path)
        
        db_doc = Document(
            project_id=project_id,
            drive_file_id=drive_file_id,
            r2_path=r2_path,
            title=title
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        
        # Add embed_url for response
        db_doc.embed_url = f"https://docs.google.com/document/d/{drive_file_id}/edit"
        return db_doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[schemas.DocumentMeta])
async def list_documents(
    project_id: Optional[UUID] = None,
    idea_id: Optional[UUID] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """List documents for a project or an idea."""
    query = db.query(Document)
    if project_id:
        query = query.filter(Document.project_id == project_id)
    if idea_id:
        query = query.filter(Document.idea_id == idea_id)
    
    if not project_id and not idea_id:
        raise HTTPException(status_code=400, detail="Must provide either project_id or idea_id")
        
    docs = query.all()
    for doc in docs:
        doc.embed_url = f"https://docs.google.com/document/d/{doc.drive_file_id}/edit"
    return docs

@router.get("/doc/{doc_id}", response_model=schemas.DocumentMeta)
async def get_document(
    doc_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Get document metadata and embed URL."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.embed_url = f"https://docs.google.com/document/d/{doc.drive_file_id}/edit"
    return doc

@router.delete("/doc/{doc_id}")
async def delete_document(
    doc_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Delete document from Drive, R2, and DB."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        await document_service.delete_google_doc(doc.drive_file_id)
        # R2 deletion could also be handled here
        db.delete(doc)
        db.commit()
        return {"message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/doc/{doc_id}/sync")
async def sync_document(
    doc_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Manual trigger to sync Drive content to R2."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    background_tasks.add_task(document_service.sync_doc_to_r2, doc.drive_file_id, doc.r2_path)
    return {"message": "Sync task started in background"}

@router.post("/doc/{doc_id}/upload", response_model=schemas.DocumentMeta)
async def upload_document(
    doc_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Replace document with an uploaded .docx file."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files supported for replacement")

    try:
        # 1. Convert .docx to Markdown
        import mammoth
        from markdownify import markdownify as md
        
        result = mammoth.convert_to_html(file.file)
        content_md = md(result.value)
        
        # 2. Update Drive (Simplest is to delete and recreate or update content)
        # For Drive API update, we need media upload
        from googleapiclient.http import MediaInMemoryUpload
        media = MediaInMemoryUpload(result.value.encode('utf-8'), mimetype='text/html')
        document_service.drive_service.files().update(
            fileId=doc.drive_file_id,
            media_body=media
        ).execute()
        
        # 3. Sync to R2
        await storage_service.upload_content(doc.r2_path, content_md)
        
        doc.updated_at = sa.func.now()
        db.commit()
        db.refresh(doc)
        
        doc.embed_url = f"https://docs.google.com/document/d/{doc.drive_file_id}/edit"
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/doc/{doc_id}/apply-change")
async def apply_change(
    doc_id: UUID,
    payload: schemas.ApplyDocumentChangeRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Apply an AI-proposed change to the Google Doc."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        requests = [
            {
                'replaceAllText': {
                    'containsText': {
                        'text': payload.find,
                        'matchCase': True
                    },
                    'replaceText': payload.replace
                }
            }
        ]
        await document_service.apply_batch_update(doc.drive_file_id, requests)
        
        # Trigger R2 sync
        await document_service.sync_doc_to_r2(doc.drive_file_id, doc.r2_path)
        
        return {"message": "Change applied successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/doc/{doc_id}/chat")
async def chat_document(
    doc_id: UUID,
    chat_req: schemas.DocChatRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Chat with AI about a specific document. Returns proposed changes if applicable."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        from app.services.ai_service import ai_service
        
        # Get current content from R2 for context
        content_md = await storage_service.get_content(doc.r2_path)
        
        # In a real implementation, we would pass this to AI with a special prompt
        # requesting JSON if a change is proposed.
        # For now, we'll wrap the existing ai_service.chat_about_doc
        # and assume it can be extended to return structured data.
        
        # Construct context
        context = {
            "document_title": doc.title,
            "project_id": str(doc.project_id)
        }
        
        response = await ai_service.chat_about_doc_structured(
            doc.title, content_md, chat_req.message, context
        )
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
