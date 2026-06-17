import os
import json
from google.oauth2 import service_account
from app.core.config import settings

def get_service_account_credentials():
    """Load service account credentials from service-account.json file.
    
    This file should be located in the Backend/ directory and is gitignored.
    Returns: google.oauth2.service_account.Credentials or None if file not found.
    """
    file_path = os.path.join(os.getcwd(), "service-account.json")
    
    if not os.path.exists(file_path):
        # Fallback to env var if available (useful for CI/CD or production)
        service_account_info = getattr(settings, "GOOGLE_SERVICE_ACCOUNT_INFO", None)
        if service_account_info:
            if isinstance(service_account_info, str):
                service_account_info = json.loads(service_account_info)
            return service_account.Credentials.from_service_account_info(
                service_account_info,
                scopes=[
                    "https://www.googleapis.com/auth/drive",
                    "https://www.googleapis.com/auth/documents"
                ]
            )
        return None

    return service_account.Credentials.from_service_account_file(
        file_path,
        scopes=[
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/documents"
        ]
    )
