import boto3
from botocore.exceptions import ClientError
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        if all([
            settings.R2_ACCOUNT_ID,
            settings.R2_ACCESS_KEY_ID,
            settings.R2_SECRET_ACCESS_KEY,
            settings.R2_BUCKET_NAME,
        ]):
            endpoint_url = settings.R2_ENDPOINT
            if not endpoint_url:
                endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

            self.s3_client = boto3.client(
                's3',
                endpoint_url=endpoint_url,
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                region_name="auto"
            )
            self.bucket_name = settings.R2_BUCKET_NAME
        else:
            self.s3_client = None
            self.bucket_name = None
            logger.warning("R2 credentials missing. StorageService will be disabled.")

    async def upload_content(self, key: str, content: str, content_type: str = "text/markdown") -> str:
        """Uploads text content to R2 and returns the key."""
        if not self.s3_client:
            logger.error("Attempted to upload to R2 but client is not initialized.")
            return key # Return key anyway for local mock behavior if needed

        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=content.encode('utf-8'),
                ContentType=content_type
            )
            return key
        except ClientError as e:
            logger.error(f"Error uploading to R2: {e}")
            raise e

    async def get_content(self, key: str) -> str:
        """Retrieves text content from R2."""
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
            return response['Body'].read().decode('utf-8')
        except ClientError as e:
            logger.error(f"Error reading from R2: {e}")
            raise e

storage_service = StorageService()
