import logging
import asyncio
import threading
from app.core.time import utc_now
from app.core.database import SessionLocal
from app.models.document import Document
from app.services.document_service import document_service

logger = logging.getLogger(__name__)

# Guards against two overlapping runs within this process - e.g. a sync
# that takes longer than the 15-minute schedule interval, or the task
# being manually triggered while a scheduled run is still in flight.
# APScheduler's own default (max_instances=1) already prevents the
# scheduler itself from double-firing this job, but this makes the
# function safe to call from anywhere without relying on that. It does
# NOT protect against multiple *processes* running the scheduler at
# once - see ENABLE_SCHEDULER in app/main.py for that.
_sync_lock = threading.Lock()


async def sync_all_documents_to_r2():
    """Background task to sync all active Google Docs to R2.

    Syncing the same document twice is itself harmless (R2 upload is a
    key overwrite, not an append), so "idempotent" here means: safe to
    invoke concurrently without doing the same work twice at once, or
    leaving a stale in-progress state behind on failure.
    """
    if not _sync_lock.acquire(blocking=False):
        logger.info("Document sync already in progress, skipping this run")
        return

    try:
        db = SessionLocal()
        try:
            documents = db.query(Document).all()
            logger.info(f"Starting background sync for {len(documents)} documents at {utc_now()}")

            for doc in documents:
                try:
                    await document_service.sync_doc_to_r2(doc.drive_file_id, doc.r2_path)
                    logger.debug(f"Synced doc {doc.id} ({doc.title})")
                except Exception:
                    logger.exception(f"Failed to sync doc {doc.id} ({doc.title})")

            logger.info(f"Background sync completed at {utc_now()}")
        except Exception:
            logger.exception("Error in background sync task")
        finally:
            db.close()
    finally:
        _sync_lock.release()


def run_sync_task():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(sync_all_documents_to_r2())
    finally:
        loop.close()
