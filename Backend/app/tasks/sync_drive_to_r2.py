import logging
import asyncio
from app.core.time import utc_now
from app.core.database import SessionLocal
from app.models.document import Document
from app.services.document_service import document_service

logger = logging.getLogger(__name__)

async def sync_all_documents_to_r2():
    """Background task to sync all active Google Docs to R2."""
    db = SessionLocal()
    try:
        documents = db.query(Document).all()
        logger.info(f"Starting background sync for {len(documents)} documents at {utc_now()}")
        
        for doc in documents:
            try:
                await document_service.sync_doc_to_r2(doc.drive_file_id, doc.r2_path)
                logger.debug(f"Synced doc {doc.id} ({doc.title})")
            except Exception as e:
                logger.error(f"Failed to sync doc {doc.id} ({doc.title}): {e}")
                
        logger.info(f"Background sync completed at {utc_now()}")
    except Exception as e:
        logger.error(f"Error in background sync task: {e}")
    finally:
        db.close()

def run_sync_task():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(sync_all_documents_to_r2())
    finally:
        loop.close()
