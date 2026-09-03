"""Document routes: generation, chat/regeneration, upload, analysis, and enhancement of project docs."""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Request,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Any, List, Dict, Optional
import mammoth
import markdown
from html2docx import html2docx
import logging
import json
from app.api import deps
from app.schemas import ai as schemas
from app.core.rate_limit import limiter
from app.crud import crud_project_idea
from app.services.ai_service import ai_service, DOC_ORDER
from app.services.storage_service import storage_service
from app.services.notification_service import notification_service
from app.services.project_md_service import project_md_service
from app.services.doc_analyzer_service import doc_analyzer_service
from app.models.project_idea import (
    AssetType,
    AssetStatus,
    ProjectIdea,
)
from app.models.notification import NotificationType
from app.models.user import User
from app.api.v1.ai._shared import AssetParseError, _parse_asset_json, _strip_unsafe_images

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/idea/{idea_id}/doc/upload", response_model=schemas.DocResponse)
@limiter.limit("20/hour")
async def upload_document(
    request: Request,
    idea_id: str,
    doc_type: AssetType,
    file: UploadFile = File(...),
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Manual Upload - Uploads a .md or .docx file and saves it as an asset.
    Also analyzes document quality and notifies user if improvements are needed.
    """
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


    content = ""
    filename = file.filename.lower() if file.filename else ""

    # Validate file size before reading
    file_size = 0
    chunk_size = 8192
    chunks = []
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        file_size += len(chunk)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, detail="File too large. Maximum size is 10 MB."
            )
        chunks.append(chunk)

    if filename.endswith(".md"):
        content = b"".join(chunks).decode("utf-8")
    elif filename.endswith(".docx"):
        import io
        file.file = io.BytesIO(b"".join(chunks))
        result = mammoth.convert_to_markdown(file.file)
        content = result.value
    else:
        raise HTTPException(
            status_code=400, detail="Only .md and .docx files supported"
        )

    if not content.strip():
        raise HTTPException(
            status_code=400, detail="Uploaded file is empty."
        )

    r2_key = f"projects/{idea_id}/docs/{doc_type.value}_manual_{filename}.md"
    await storage_service.upload_content(r2_key, content)

    analysis_result = None
    try:
        project_context = {
            "idea": idea.raw_input,
            "refined_description": idea.refined_description,
        }
        if idea.validation_report:
            project_context["features"] = [
                f.get("name") if isinstance(f, dict) else getattr(f, "name", "")
                for f in (idea.validation_report.core_features or [])
            ]

        analysis_result = await doc_analyzer_service.analyze_document(
            doc_type.value, content, project_context
        )

        if analysis_result.get("severity") in ["critical", "warning"]:
            notification_service.notify_user(
                db,
                recipient_id=current_user.id,
                type=NotificationType.AI_DOC_GENERATED,
                title=f"Document Review: {doc_type.value}",
                content=analysis_result.get("summary", "Document needs review"),
                target_id=idea_id,
                target_type="ai_idea",
            )
    except Exception:
        logger.exception(f"Document analysis failed for {doc_type.value}")

    asset = crud_project_idea.project_idea.create_or_update_asset(
        db=db,
        idea_id=idea_id,
        asset_type=doc_type,
        content=content,
        status=AssetStatus.COMPLETED,
        r2_path=r2_key,
    )

    if analysis_result:
        asset.analysis_result = analysis_result
        db.commit()

    return {
        **schemas.DocResponse.from_orm(asset).dict(),
        "analysis": analysis_result,
    }


@router.get("/idea/{idea_id}/doc/{doc_type}/questions")
@limiter.limit("20/hour")
async def get_doc_questions(
    request: Request,
    idea_id: str,
    doc_type: AssetType,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 4: Get questions for a specific document type.
    Returns empty if no questions are needed.
    Includes AI suggestions for skipping questions.
    """

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
        }
        if idea.validation_report
        else None,
    }

    # Get previous docs
    doc_index = ai_service.get_doc_index(doc_type.value)
    previous_docs = {}

    if doc_index > 0:
        for i in range(doc_index):
            prev_type = DOC_ORDER[i]
            prev_asset = crud_project_idea.project_idea.get_asset(
                db, idea_id=idea_id, asset_type=prev_type
            )
            if prev_asset and prev_asset.content:
                previous_docs[prev_type] = prev_asset.content

    # Also include blueprint context
    if doc_index > 0:
        blueprint_asset = crud_project_idea.project_idea.get_asset(
            db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_USER_FLOW
        )
        kanban_asset = crud_project_idea.project_idea.get_asset(
            db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_KANBAN
        )
        if blueprint_asset:
            project_context["blueprint"] = {"user_flow": blueprint_asset.content}
        if kanban_asset:
            try:
                project_context["blueprint"]["kanban"] = _parse_asset_json(
                    kanban_asset.content or "[]", asset_id=kanban_asset.id
                )
            except AssetParseError:
                project_context["blueprint"]["kanban"] = []

    # Generate questions
    questions = await ai_service.generate_doc_questions(
        doc_type.value, project_context, previous_docs
    )

    return questions


@router.post("/idea/{idea_id}/doc/{doc_type}", response_model=schemas.DocResponse)
@limiter.limit("20/hour")
async def generate_document(
    request: Request,
    idea_id: str,
    doc_type: AssetType,
    answers: Optional[List[Dict[str, str]]] = None,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 4: Generate Doc - Generates a document with optional user answers.
    Checks if previous docs are completed before proceeding.
    Answers are from the question flow that users answered (or skipped with AI suggestions).
    """

    # Check dependencies - previous doc must be completed
    doc_index = ai_service.get_doc_index(doc_type.value)
    if doc_index > 0:
        prev_type = DOC_ORDER[doc_index - 1]
        prev_asset = crud_project_idea.project_idea.get_asset(
            db, idea_id=idea_id, asset_type=prev_type
        )
        if not prev_asset or prev_asset.status != AssetStatus.COMPLETED:
            raise HTTPException(
                status_code=400, detail=f"Please complete {prev_type} document first"
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
        }
        if idea.validation_report
        else None,
    }

    # Get previous docs
    previous_docs = {}
    for i in range(doc_index):
        prev_type = DOC_ORDER[i]
        prev_asset = crud_project_idea.project_idea.get_asset(
            db, idea_id=idea_id, asset_type=prev_type
        )
        if prev_asset and prev_asset.content:
            previous_docs[prev_type] = prev_asset.content

    # Also include blueprint context
    blueprint_asset = crud_project_idea.project_idea.get_asset(
        db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_USER_FLOW
    )
    kanban_asset = crud_project_idea.project_idea.get_asset(
        db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_KANBAN
    )
    if blueprint_asset:
        context["blueprint"] = {"user_flow": blueprint_asset.content}
        if kanban_asset:
            try:
                context["blueprint"]["kanban"] = _parse_asset_json(
                    kanban_asset.content or "[]", asset_id=kanban_asset.id
                )
            except AssetParseError:
                context["blueprint"]["kanban"] = []

    # Get chat history from existing asset
    chat_history = []
    existing_asset = crud_project_idea.project_idea.get_asset(
        db, idea_id=idea_id, asset_type=doc_type.value
    )
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

    # 1. Standard R2 Asset (Legacy/Fallback)
    r2_key = f"projects/{idea_id}/docs/{doc_type.value}.md"
    await storage_service.upload_content(r2_key, content)

    asset = crud_project_idea.project_idea.create_or_update_asset(
        db=db,
        idea_id=idea_id,
        asset_type=doc_type,
        content=content,
        status=AssetStatus.COMPLETED,
        r2_path=r2_key,
    )

    # 2. Dual-Source: Google Doc creation
    try:
        from app.services.document_service import document_service
        from app.models.document import Document

        title = f"{idea.name or 'Project'} - {doc_type.value.replace('_', ' ').title()}"
        drive_file_id = await document_service.create_google_doc(title, content, user_email=current_user.email)

        db_doc = Document(
            project_id=idea.project_id,
            idea_id=idea.id,
            drive_file_id=drive_file_id,
            r2_path=r2_key,
            title=title
        )
        db.add(db_doc)
        db.flush()
    except Exception:
        logger.exception("Failed to create Google Doc")
        # Don't fail the whole request if Drive fails
    # Update chat history
    if chat_history:
        asset.chat_history = chat_history
        db.commit()

    try:
        project_id = str(idea.project_id) if idea.project_id else None
        await project_md_service.save_project_md(db, idea_id, project_id)
    except Exception:
        logger.exception("Failed to update project.md after doc generation")

    # Notify user
    notification_service.notify_user(
        db,
        recipient_id=current_user.id,
        type=NotificationType.AI_DOC_GENERATED,
        title=f"{doc_type.value.replace('_', ' ')} Generated",
        content=f"The {doc_type.value} for your project has been generated successfully.",
        target_id=str(idea.id),
        target_type="ai_idea",
    )

    return asset


@router.post("/idea/{idea_id}/doc/{doc_type}/chat", response_model=schemas.DocResponse)
@limiter.limit("20/hour")
async def chat_document(
    request: Request,
    idea_id: str,
    doc_type: AssetType,
    chat_req: schemas.DocChatRequest,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 4: Chat about Doc - Regenerates/Edits doc based on user feedback.
    Each doc has its own chat session.
    """

    asset = crud_project_idea.project_idea.get_asset(
        db=db, idea_id=idea_id, asset_type=doc_type
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Doc not found")

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
        }
        if idea.validation_report
        else None,
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
@limiter.limit("20/hour")
async def regenerate_doc_section(
    request: Request,
    idea_id: str,
    doc_type: AssetType,
    section_content: str,
    user_message: str,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 4: Regenerate a specific section of a document.
    User can select text and ask AI to regenerate a better version.
    """

    asset = crud_project_idea.project_idea.get_asset(
        db=db, idea_id=idea_id, asset_type=doc_type
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Doc not found")

    context = {
        "idea": idea.raw_input,
        "refined_description": idea.refined_description,
        "validation": {
            "market_feasibility": idea.validation_report.market_feasibility,
            "core_features": idea.validation_report.core_features,
            "tech_stack": idea.validation_report.tech_stack,
            "pricing_model": idea.validation_report.pricing_model,
            "improvements": idea.validation_report.improvements,
        }
        if idea.validation_report
        else None,
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


@router.get("/idea/{idea_id}/doc/{doc_type}/download")
async def download_doc_as_docx(
    idea_id: str,
    doc_type: AssetType,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Downloads a document as a .docx file.
    Converts Markdown content to HTML, then to Docx in memory.
    """

    asset = crud_project_idea.project_idea.get_asset(
        db=db, idea_id=idea_id, asset_type=doc_type
    )
    if not asset or not asset.content:
        raise HTTPException(status_code=404, detail="Document not found")

    # Convert Markdown to HTML
    html_content = markdown.markdown(asset.content)

    # Wrap in basic HTML structure for better conversion
    full_html = f"<html><body>{html_content}</body></html>"

    # Strip any <img src="..."> that would make html2docx fetch an
    # external URL server-side (SSRF) - see _strip_unsafe_images.
    full_html = _strip_unsafe_images(full_html)

    # Convert HTML to Docx in memory
    docx_io = html2docx(full_html, title=doc_type.value)
    docx_io.seek(0)

    filename = f"{doc_type.value.replace('_', ' ')}.docx"
    return StreamingResponse(
        docx_io,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/idea/{idea_id}/project-md/regenerate")
async def regenerate_project_md(
    idea_id: str,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Regenerate project.md file for an idea."""

    project_id = str(idea.project_id) if idea.project_id else None

    try:
        r2_path = await project_md_service.save_project_md(
            db, idea_id=idea_id, project_id=project_id
        )
        return {"success": True, "r2_path": r2_path}
    except Exception as e:
        logger.exception(f"Failed to regenerate project.md for idea {idea_id}")
        raise HTTPException(
            status_code=500, detail=f"Failed to regenerate project.md: {str(e)}"
        )


@router.get("/idea/{idea_id}/project-md")
async def get_project_md(
    idea_id: str,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get project.md content for an idea."""

    asset = crud_project_idea.project_idea.get_asset(
        db, idea_id=idea_id, asset_type=AssetType.PROJECT_MD
    )
    if not asset:
        raise HTTPException(status_code=404, detail="project.md not found")

    return {
        "content": asset.content,
        "r2_path": asset.r2_path,
        "updated_at": asset.updated_at if hasattr(asset, "updated_at") else None,
    }


@router.get("/idea/{idea_id}/doc/{doc_type}/analysis")
async def get_document_analysis(
    idea_id: str,
    doc_type: AssetType,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Get the quality analysis for an uploaded document."""

    asset = crud_project_idea.project_idea.get_asset(
        db, idea_id=idea_id, asset_type=doc_type
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Document not found")

    if not asset.analysis_result:
        raise HTTPException(
            status_code=404, detail="No analysis available for this document"
        )

    return asset.analysis_result


@router.post("/idea/{idea_id}/doc/{doc_type}/enhance")
@limiter.limit("20/hour")
async def generate_document_enhancement(
    request: Request,
    idea_id: str,
    doc_type: AssetType,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Generate AI-enhanced version of the document."""

    asset = crud_project_idea.project_idea.get_asset(
        db, idea_id=idea_id, asset_type=doc_type
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Document not found")

    if not asset.analysis_result:
        raise HTTPException(
            status_code=400, detail="Document must be analyzed before enhancement"
        )

    if not asset.analysis_result.get("ai_can_enhance"):
        raise HTTPException(
            status_code=400, detail="AI cannot meaningfully enhance this document"
        )

    project_context = {
        "idea": idea.raw_input,
        "refined_description": idea.refined_description,
    }
    if idea.validation_report:
        project_context["features"] = [
            f.get("name") if isinstance(f, dict) else getattr(f, "name", "")
            for f in (idea.validation_report.core_features or [])
        ]
        project_context["tech_stack"] = idea.validation_report.tech_stack

    try:
        enhanced_content = await doc_analyzer_service.generate_enhanced_content(
            doc_type.value, asset.content, asset.analysis_result, project_context
        )

        asset.enhanced_content = enhanced_content
        db.commit()

        return {
            "success": True,
            "enhanced_content": enhanced_content,
            "preview": enhanced_content[:500] + "..."
            if len(enhanced_content) > 500
            else enhanced_content,
        }
    except Exception as e:
        logger.exception(f"Failed to generate enhancement for idea {idea_id}")
        raise HTTPException(
            status_code=500, detail=f"Failed to generate enhancement: {str(e)}"
        )


@router.post("/idea/{idea_id}/doc/{doc_type}/accept-enhancement")
async def accept_document_enhancement(
    idea_id: str,
    doc_type: AssetType,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Accept the AI enhancement and replace the original document."""

    asset = crud_project_idea.project_idea.get_asset(
        db, idea_id=idea_id, asset_type=doc_type
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Document not found")

    if not asset.enhanced_content:
        raise HTTPException(
            status_code=400, detail="No enhanced version available. Generate one first."
        )

    asset.content = asset.enhanced_content
    asset.enhanced_content = None
    asset.analysis_result = None

    if asset.r2_path:
        await storage_service.upload_content(asset.r2_path, asset.content)

    db.commit()

    try:
        project_id = str(idea.project_id) if idea.project_id else None
        await project_md_service.save_project_md(db, idea_id, project_id)
    except Exception:
        logger.exception(f"Failed to update project.md after enhancement for idea {idea_id}")

    return {"success": True, "message": "Enhancement accepted and applied"}


@router.post("/idea/{idea_id}/doc/{doc_type}/decline-enhancement")
async def decline_document_enhancement(
    idea_id: str,
    doc_type: AssetType,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Decline the AI enhancement and keep the original document."""

    asset = crud_project_idea.project_idea.get_asset(
        db, idea_id=idea_id, asset_type=doc_type
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Document not found")

    asset.enhanced_content = None
    asset.analysis_result = None
    db.commit()

    return {"success": True, "message": "Enhancement declined, original preserved"}
