import logging
import asyncio
from app.core.time import utc_now
from app.core.database import SessionLocal
from app.models.document import Document
from app.models.user import User
from app.services.document_service import document_service
from app.core.encryption import decrypt_token

logger = logging.getLogger(__name__)


def refresh_google_token(user: User) -> bool:
    """Refresh a user's Google OAuth token if it has expired."""
    if not user.google_refresh_token or not user.google_token_expires_at:
        return False

    if utc_now() < user.google_token_expires_at:
        return True  # Token is still valid

    # Token has expired — try to refresh
    try:
        import requests
        from app.core.config import settings

        refresh_token = decrypt_token(user.google_refresh_token)
        if not refresh_token:
            logger.error(f"Cannot refresh token for user {user.id}: decryption failed")
            return False

        data = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        resp = requests.post("https://oauth2.googleapis.com/token", data=data)
        resp.raise_for_status()
        tokens = resp.json()

        from app.core.encryption import encrypt_token

        user.google_access_token = encrypt_token(tokens.get("access_token"))
        if tokens.get("expires_in"):
            from datetime import timedelta
            user.google_token_expires_at = utc_now() + timedelta(seconds=tokens["expires_in"])
        return True
    except Exception as e:
        logger.error(f"Failed to refresh Google token for user {user.id}: {e}")
        return False


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
