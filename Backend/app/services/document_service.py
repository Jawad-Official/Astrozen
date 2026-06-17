import logging
import io
import uuid
from typing import Optional, List, Dict, Any
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaInMemoryUpload
from markdownify import markdownify as md
from app.core.config import settings
from app.services.storage_service import storage_service
from app.services.service_account import get_service_account_credentials
from app.models.document import Document
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class DocumentService:
    """Service to handle Google Drive and Docs interactions along with R2 sync."""

    def __init__(self):
        self.creds = get_service_account_credentials()
        self.drive_service = build('drive', 'v3', credentials=self.creds) if self.creds else None
        self.docs_service = build('docs', 'v1', credentials=self.creds) if self.creds else None

    async def create_google_doc(self, title: str, content_md: str, user_email: Optional[str] = None) -> str:
        """Creates a Google Doc from Markdown content and optionally shares it.
        
        Returns: drive_file_id
        """
        if not self.drive_service:
            raise Exception("Google Drive service not initialized (check service-account.json)")

        # First create an empty Doc
        file_metadata = {
            'name': title,
            'mimeType': 'application/vnd.google-apps.document'
        }
        
        # Convert Markdown to HTML for initial upload
        import markdown
        html_content = markdown.markdown(content_md)
        
        media = MediaInMemoryUpload(html_content.encode('utf-8'), mimetype='text/html')
        
        file = self.drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()
        
        drive_file_id = file.get('id')
        
        # Share with user if email provided
        if user_email:
            try:
                self.share_document_with_user(drive_file_id, user_email)
            except Exception as e:
                logger.error(f"Failed to share document {drive_file_id} with {user_email}: {e}")
        
        return drive_file_id

    def share_document_with_user(self, drive_file_id: str, email: str, role: str = 'writer'):
        """Shares the document with a specific user email."""
        if not self.drive_service:
            return

        user_permission = {
            'type': 'user',
            'role': role,
            'emailAddress': email
        }

        self.drive_service.permissions().create(
            fileId=drive_file_id,
            body=user_permission,
            fields='id',
            sendNotificationEmail=False
        ).execute()

    def _decrypt_user_tokens(self, user) -> tuple:
        """Decrypt Google tokens for a user. Returns (access_token, refresh_token)."""
        from app.core.encryption import decrypt_token
        access_token = decrypt_token(user.google_access_token)
        refresh_token = decrypt_token(user.google_refresh_token)
        return access_token, refresh_token

    async def get_doc_content_as_markdown(self, drive_file_id: str) -> str:
        """Exports a Google Doc to Markdown."""
        if not self.drive_service:
            raise Exception("Google Drive service not initialized")

        # Export as text/plain or text/markdown if supported, but html is safest for conversion
        content_html = self.drive_service.files().export(
            fileId=drive_file_id,
            mimeType='text/html'
        ).execute()
        
        return md(content_html.decode('utf-8'))

    async def sync_doc_to_r2(self, drive_file_id: str, r2_path: str):
        """Fetches from Drive and uploads to R2."""
        content_md = await self.get_doc_content_as_markdown(drive_file_id)
        await storage_service.upload_content(r2_path, content_md)
        return content_md

    async def apply_batch_update(self, drive_file_id: str, requests: List[Dict[str, Any]]):
        """Applies batch updates to a Google Doc."""
        if not self.docs_service:
            raise Exception("Google Docs service not initialized")
            
        self.docs_service.documents().batchUpdate(
            documentId=drive_file_id,
            body={'requests': requests}
        ).execute()

    async def delete_google_doc(self, drive_file_id: str):
        """Deletes a file from Google Drive."""
        if self.drive_service:
            self.drive_service.files().delete(fileId=drive_file_id).execute()

document_service = DocumentService()
