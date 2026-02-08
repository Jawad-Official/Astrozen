import boto3
import os
import logging
from typing import Optional
from botocore.client import Config

logger = logging.getLogger(__name__)

class R2StorageProvider:
    def __init__(self):
        self.account_id = os.getenv("R2_ACCOUNT_ID")
        self.access_key_id = os.getenv("R2_ACCESS_KEY_ID")
        self.secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY")
        self.bucket_name = os.getenv("R2_BUCKET_NAME")
        
        self.s3_client = boto3.client(
            's3',
            endpoint_url=f'https://{self.account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            config=Config(signature_version='s3v4'),
            region_name='auto'
        )

    def upload_file(self, file_content: bytes, object_name: str, content_type: str = "application/octet-stream") -> bool:
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_name,
                Body=file_content,
                ContentType=content_type
            )
            return True
        except Exception as e:
            logger.error(f"Error uploading to R2: {e}")
            return False

    def generate_signed_url(self, object_name: str, expiration: int = 3600) -> Optional[str]:
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': object_name},
                ExpiresIn=expiration
            )
            return url
        except Exception as e:
            logger.error(f"Error generating signed URL: {e}")
            return None
