"""Document routes: generation, chat/regeneration, upload, analysis, and enhancement of project docs."""

import io
import re
import logging
from typing import Any, List, Optional, Union
from urllib.parse import quote

from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Request,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import mammoth
import markdown
from html2docx import html2docx

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
    ProjectAsset,
    ProjectIdea,
)
from app.models.notification import NotificationType
from app.models.user import User
from app.api.v1.ai._shared import AssetParseError, _parse_asset_json, _strip_unsafe_images

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
UPLOAD_EXTENSIONS = (".md", ".markdown", ".txt", ".docx")
DOC_TYPES = set(DOC_ORDER)


def _require_doc_type(doc_type: AssetType) -> None:
    """The doc routes take an AssetType path param, which also admits the
    PROJECT_MD / DIAGRAM_* asset types. Those are not user documents -
    writing one here would clobber the blueprint or project.md."""
    if doc_type.value not in DOC_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"{doc_type.value} is not a document type. Use one of: {', '.join(DOC_ORDER)}",
        )


def _doc_label(doc_type: AssetType) -> str:
    return doc_type.value.replace("_", " ").title()


def _doc_payload(asset: ProjectAsset, **extra: Any) -> dict:
    """Serialise a doc asset for the frontend. Built by hand (not
    from_attributes) so the computed has_enhancement flag is included."""
    return {
        "id": str(asset.id),
        "asset_type": asset.asset_type,
        "content": asset.content or "",
        "status": asset.status,
        "r2_path": asset.r2_path,
        "chat_history": asset.chat_history or [],
        "analysis_result": asset.analysis_result,
        "has_enhancement": bool(asset.enhanced_content),
        **extra,
    }


def _idea_context(idea: ProjectIdea) -> dict:
    report = idea.validation_report
    return {
        "idea": idea.raw_input,
        "refined_description": idea.refined_description,
        "validation": {
            "market_feasibility": report.market_feasibility,
            "core_features": report.core_features,
            "tech_stack": report.tech_stack,
            "pricing_model": report.pricing_model,
            "improvements": report.improvements,
        }
        if report
        else None,
    }


def _previous_docs(db: Session, idea_id: str, doc_type: AssetType) -> dict:
    """Content of every doc that comes before doc_type in DOC_ORDER."""
    docs = {}
    for prev_type in DOC_ORDER[: ai_service.get_doc_index(doc_type.value)]:
        prev_asset = crud_project_idea.project_idea.get_asset(
            db, idea_id=idea_id, asset_type=prev_type
        )
        if prev_asset and prev_asset.content:
            docs[prev_type] = prev_asset.content
    return docs


def _blueprint_context(db: Session, idea_id: str) -> Optional[dict]:
    """User flow + kanban from the blueprint step, or None if there is
    neither. Each half is optional on its own - the old inline code did
    `context["blueprint"]["kanban"] = ...` when only the kanban existed,
    which raised KeyError and 500'd the questions route."""
    blueprint = {}
    flow_asset = crud_project_idea.project_idea.get_asset(
        db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_USER_FLOW
    )
    if flow_asset and flow_asset.content:
        blueprint["user_flow"] = flow_asset.content

    kanban_asset = crud_project_idea.project_idea.get_asset(
        db, idea_id=idea_id, asset_type=AssetType.DIAGRAM_KANBAN
    )
    if kanban_asset and kanban_asset.content:
        try:
            blueprint["kanban"] = _parse_asset_json(
                kanban_asset.content, asset_id=kanban_asset.id
            )
        except AssetParseError:
            blueprint["kanban"] = []

    return blueprint or None


async def _store_r2(key: Optional[str], content: str) -> None:
    """Mirror doc content to R2. The DB row is the source of truth, so an
    R2 outage must not fail a request whose (paid) AI call already
    succeeded."""
    if not key:
        return
    try:
        await storage_service.upload_content(key, content)
    except Exception:
        logger.exception("Failed to mirror document to R2 at %s", key)


async def _mirror_to_google_doc(
    db: Session, idea: ProjectIdea, doc_type: AssetType, content: str, r2_key: str, user_email: str
) -> None:
    """Best-effort Google Docs copy of a generated doc.

    Document.r2_path is UNIQUE and the R2 key is the same on every
    regeneration, so the old code's blind INSERT failed with an
    IntegrityError the second time a doc was generated. That error was
    swallowed but the session was left needing a rollback, so the next
    db.commit() in the route raised and the whole request 500'd - after
    the doc had already been saved. Now the existing row is updated, and
    all DB work runs in a SAVEPOINT so a failure can't poison the session.
    """
    from app.services.document_service import document_service
    from app.models.document import Document

    if not document_service.drive_service:
        return  # Google Drive isn't configured on this server - nothing to mirror.

    title = f"{idea.name if getattr(idea, 'name', None) else 'Project'} - {_doc_label(doc_type)}"
    try:
        drive_file_id = await document_service.create_google_doc(title, content, user_email=user_email)
    except Exception:
        logger.exception("Failed to create Google Doc for %s", doc_type.value)
        return

    old_drive_file_id = None
    try:
        with db.begin_nested():
            existing = db.query(Document).filter(Document.r2_path == r2_key).first()
            if existing:
                old_drive_file_id = existing.drive_file_id
                existing.drive_file_id = drive_file_id
                existing.title = title
            else:
                db.add(
                    Document(
                        project_id=idea.project_id,
                        idea_id=idea.id,
                        drive_file_id=drive_file_id,
                        r2_path=r2_key,
                        title=title,
                    )
                )
        db.commit()
    except Exception:
        logger.exception("Failed to record Google Doc for %s", doc_type.value)
        try:
            await document_service.delete_google_doc(drive_file_id)
        except Exception:
            logger.exception("Failed to clean up orphaned Google Doc %s", drive_file_id)
        return

    if old_drive_file_id and old_drive_file_id != drive_file_id:
        try:
            await document_service.delete_google_doc(old_drive_file_id)
        except Exception:
            logger.exception("Failed to delete superseded Google Doc %s", old_drive_file_id)


async def _refresh_project_md(db: Session, idea: ProjectIdea) -> None:
    try:
        project_id = str(idea.project_id) if idea.project_id else None
        await project_md_service.save_project_md(db, str(idea.id), project_id)
    except Exception:
        db.rollback()
        logger.exception("Failed to update project.md for idea %s", idea.id)


def _get_doc_or_404(db: Session, idea_id: str, doc_type: AssetType) -> ProjectAsset:
    asset = crud_project_idea.project_idea.get_asset(db, idea_id=idea_id, asset_type=doc_type)
    if not asset or not asset.content:
        raise HTTPException(status_code=404, detail=f"{_doc_label(doc_type)} has not been created yet")
    return asset


@router.post("/idea/{idea_id}/doc/upload", response_model=schemas.DocUploadResponse)
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
    Manual Upload - Uploads a .md, .txt or .docx file and saves it as an asset.
    Also analyzes document quality and notifies user if improvements are needed.
    """
    _require_doc_type(doc_type)

    filename = (file.filename or "").lower()
    if not filename.endswith(UPLOAD_EXTENSIONS):
        raise HTTPException(
            status_code=400, detail="Only .md, .txt and .docx files are supported"
        )

    file_size = 0
    chunks = []
    while True:
        chunk = await file.read(8192)
        if not chunk:
            break
        file_size += len(chunk)
        if file_size > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=400, detail="File too large. Maximum size is 10 MB."
            )
        chunks.append(chunk)
    raw = b"".join(chunks)

    if filename.endswith(".docx"):
        try:
            content = mammoth.convert_to_markdown(io.BytesIO(raw)).value
        except Exception:
            logger.exception("Could not read uploaded .docx for idea %s", idea_id)
            raise HTTPException(status_code=400, detail="Could not read that .docx file. Is it a valid Word document?")
    else:
        try:
            content = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Text files must be UTF-8 encoded.")

    if not content.strip():
        raise HTTPException(
            status_code=400, detail="Uploaded file is empty."
        )

    safe_name = re.sub(r"[^a-z0-9._-]+", "_", filename)[:80] or "upload"
    r2_key = f"projects/{idea_id}/docs/{doc_type.value}_manual_{safe_name}.md"
    await _store_r2(r2_key, content)

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
    asset.analysis_result = analysis_result
    asset.enhanced_content = None
    db.commit()
    db.refresh(asset)

    if analysis_result and analysis_result.get("severity") in ["critical", "warning"]:
        try:
            notification_service.notify_user(
                db,
                recipient_id=current_user.id,
                type=NotificationType.AI_DOC_GENERATED,
                title=f"Document Review: {_doc_label(doc_type)}",
                content=analysis_result.get("summary", "Document needs review"),
                target_id=idea_id,
                target_type="ai_idea",
            )
        except Exception:
            db.rollback()
            logger.exception("Failed to send document review notification")

    await _refresh_project_md(db, idea)
    db.refresh(asset)

    return _doc_payload(asset, analysis=analysis_result)


@router.get("/idea/{idea_id}/doc/{doc_type}/questions", response_model=schemas.DocQuestionsResponse)
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
    _require_doc_type(doc_type)

    project_context = _idea_context(idea)
    blueprint = _blueprint_context(db, idea_id)
    if blueprint:
        project_context["blueprint"] = blueprint

    return await ai_service.generate_doc_questions(
        doc_type.value, project_context, _previous_docs(db, idea_id, doc_type)
    )


@router.post("/idea/{idea_id}/doc/{doc_type}", response_model=schemas.DocResponse)
@limiter.limit("20/hour")
async def generate_document(
    request: Request,
    idea_id: str,
    doc_type: AssetType,
    payload: Optional[Union[schemas.DocGenerateRequest, List[schemas.DocAnswer]]] = Body(default=None),
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 4: Generate Doc - Generates a document with optional user answers.
    Checks if previous docs are completed before proceeding.

    Body: `{"answers": [{"question": ..., "answer": ...}]}`, `{}`, or no
    body. A bare list of answers is accepted too, for older clients. The
    previous signature declared a bare `List[Dict]` body while the
    frontend sent `{"answers": [...]}`, so every generation 422'd.
    """
    _require_doc_type(doc_type)

    if isinstance(payload, list):
        answer_models = payload
    elif payload is not None:
        answer_models = payload.answers or []
    else:
        answer_models = []
    answers = [a.model_dump() for a in answer_models]

    doc_index = ai_service.get_doc_index(doc_type.value)
    if doc_index > 0:
        prev_type = DOC_ORDER[doc_index - 1]
        prev_asset = crud_project_idea.project_idea.get_asset(
            db, idea_id=idea_id, asset_type=prev_type
        )
        if not prev_asset or prev_asset.status != AssetStatus.COMPLETED:
            raise HTTPException(
                status_code=400,
                detail=f"Create the {prev_type.replace('_', ' ').title()} document first - documents build on each other in order.",
            )

    context = _idea_context(idea)
    blueprint = _blueprint_context(db, idea_id)
    if blueprint:
        context["blueprint"] = blueprint

    existing_asset = crud_project_idea.project_idea.get_asset(
        db, idea_id=idea_id, asset_type=doc_type
    )
    # Earlier edit requests for this doc steer a regeneration. Answers are
    # passed separately and are NOT folded into chat_history - the old code
    # appended them on every generation, so they piled up and were sent to
    # the model twice.
    chat_history = list(existing_asset.chat_history or []) if existing_asset else []

    content = await ai_service.generate_doc(
        doc_type.value, context, chat_history, _previous_docs(db, idea_id, doc_type), answers
    )

    r2_key = f"projects/{idea_id}/docs/{doc_type.value}.md"
    await _store_r2(r2_key, content)

    asset = crud_project_idea.project_idea.create_or_update_asset(
        db=db,
        idea_id=idea_id,
        asset_type=doc_type,
        content=content,
        status=AssetStatus.COMPLETED,
        r2_path=r2_key,
    )
    # A freshly generated doc replaces any uploaded one, so its review and
    # pending enhancement no longer apply.
    asset.analysis_result = None
    asset.enhanced_content = None
    db.commit()

    await _mirror_to_google_doc(db, idea, doc_type, content, r2_key, current_user.email)
    await _refresh_project_md(db, idea)

    try:
        notification_service.notify_user(
            db,
            recipient_id=current_user.id,
            type=NotificationType.AI_DOC_GENERATED,
            title=f"{_doc_label(doc_type)} Generated",
            content=f"The {_doc_label(doc_type)} for your project has been generated successfully.",
            target_id=str(idea.id),
            target_type="ai_idea",
        )
    except Exception:
        db.rollback()
        logger.exception("Failed to send doc generated notification")

    db.refresh(asset)
    return _doc_payload(asset)


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
    _require_doc_type(doc_type)
    asset = _get_doc_or_404(db, idea_id, doc_type)

    previous_history = list(asset.chat_history or [])
    updated_content = await ai_service.chat_about_doc(
        doc_type.value,
        asset.content,
        chat_req.message,
        _idea_context(idea),
        previous_history + [{"role": "user", "content": chat_req.message}],
    )

    await _store_r2(asset.r2_path, updated_content)

    asset.content = updated_content
    # Assign a NEW list: chat_history is a plain JSON column, so mutating
    # the loaded list in place is not reliably detected as a change.
    asset.chat_history = (
        previous_history
        + [
            {"role": "user", "content": chat_req.message},
            {"role": "assistant", "content": "Updated the document."},
        ]
    )[-40:]
    db.commit()
    db.refresh(asset)

    await _refresh_project_md(db, idea)
    db.refresh(asset)
    return _doc_payload(asset)


@router.post("/idea/{idea_id}/doc/{doc_type}/regenerate-section", response_model=schemas.DocResponse)
@limiter.limit("20/hour")
async def regenerate_doc_section(
    request: Request,
    idea_id: str,
    doc_type: AssetType,
    section_req: schemas.RegenerateSectionRequest,
    idea: ProjectIdea = Depends(deps.get_owned_idea),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Phase 4: Regenerate a specific section of a document.
    User can select text and ask AI to regenerate a better version.

    Takes a JSON body (`section_content`, `user_message`). These used to be
    bare `str` params, which FastAPI reads from the query string, while the
    frontend sent a JSON body - so every call 422'd.
    """
    _require_doc_type(doc_type)
    asset = _get_doc_or_404(db, idea_id, doc_type)

    updated_content = await ai_service.regenerate_doc_section(
        doc_type.value,
        asset.content,
        section_req.section_content,
        section_req.user_message,
        _idea_context(idea),
    )

    await _store_r2(asset.r2_path, updated_content)

    asset.content = updated_content
    db.commit()
    db.refresh(asset)

    await _refresh_project_md(db, idea)
    db.refresh(asset)
    return _doc_payload(asset)


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
    _require_doc_type(doc_type)
    asset = _get_doc_or_404(db, idea_id, doc_type)

    # tables / fenced_code: generated docs lean on both, and without the
    # extensions they came out of the .docx as raw pipes and backticks.
    html_content = markdown.markdown(
        asset.content, extensions=["tables", "fenced_code", "sane_lists"]
    )
    full_html = f"<html><body>{html_content}</body></html>"

    # Strip any <img src="..."> that would make html2docx fetch an
    # external URL server-side (SSRF) - see _strip_unsafe_images.
    full_html = _strip_unsafe_images(full_html)

    try:
        docx_io = html2docx(full_html, title=_doc_label(doc_type))
    except Exception:
        logger.exception("DOCX conversion failed for %s", doc_type.value)
        raise HTTPException(
            status_code=500,
            detail="Could not convert this document to .docx. Use Copy Markdown instead.",
        )
    docx_io.seek(0)

    filename = f"{_doc_label(doc_type).replace(' ', '_')}.docx"
    return StreamingResponse(
        docx_io,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{quote(filename)}"
        },
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

    result = dict(asset.analysis_result)
    if asset.enhanced_content:
        result["enhanced_content"] = asset.enhanced_content
        result["preview"] = (
            asset.enhanced_content[:500] + "..."
            if len(asset.enhanced_content) > 500
            else asset.enhanced_content
        )
    return result


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
    except HTTPException:
        raise  # 502/503 from the AI layer already carry a clear message
    except Exception as e:
        logger.exception(f"Failed to generate enhancement for idea {idea_id}")
        raise HTTPException(
            status_code=502, detail="The AI failed to generate an enhanced version. Please try again."
        ) from e

    asset.enhanced_content = enhanced_content
    db.commit()

    return {
        "success": True,
        "enhanced_content": enhanced_content,
        "preview": enhanced_content[:500] + "..."
        if len(enhanced_content) > 500
        else enhanced_content,
    }


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
    db.commit()
    db.refresh(asset)

    await _store_r2(asset.r2_path, asset.content)
    await _refresh_project_md(db, idea)
    db.refresh(asset)

    return {
        "success": True,
        "message": "Enhancement accepted and applied",
        "doc": _doc_payload(asset),
    }


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
