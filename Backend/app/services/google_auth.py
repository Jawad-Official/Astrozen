import requests
import logging
from urllib.parse import urlencode

from app.core.config import settings
from app.core.security import create_access_token
from app.services.auth_service import AuthService
from app.models.user import User

logger = logging.getLogger(__name__)

class GoogleAuthService:
    """Handles Google OAuth flow and user info retrieval.

    Uses the client ID/secret from ``settings`` and the redirect URI defined in the
    ``setup_google.md`` guide. Tokens are exchanged server‑side and a local user is
    created/updated via :class:`AuthService`. The returned JWT can be used by the
    frontend for authenticated API calls.
    """

    AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID or "dummy_client_id"
        self.client_secret = settings.GOOGLE_CLIENT_SECRET or "dummy_client_secret"
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI or "http://localhost:8000/api/v1/auth/google/callback"
        if not settings.GOOGLE_CLIENT_ID:
            logger.warning("GOOGLE_CLIENT_ID is not set. Google Auth will not work.")
        self.scope = [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/documents"
        ]

    def get_authorization_url(self) -> str:
        """Generate the URL to redirect the user to Google consent screen."""
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.scope),
            "access_type": "offline",
            "prompt": "consent",
        }
        return f"{self.AUTH_BASE}?{urlencode(params)}"

    def exchange_code_for_user_info(self, code: str) -> dict:
        """Exchange an authorization *code* for tokens and fetch user info.

        Returns a dict with tokens and user info (email, name, etc.).
        """
        data = {
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
        }
        token_resp = requests.post(self.TOKEN_URL, data=data)
        token_resp.raise_for_status()
        tokens = token_resp.json()
        
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        user_resp = requests.get(self.USERINFO_URL, headers=headers)
        user_resp.raise_for_status()
        user_info = user_resp.json()
        
        return {
            "tokens": tokens,
            "user": user_info
        }

    def get_or_create_user_by_google_email(self, db, email: str, full_name: str | None = None, tokens: dict | None = None):
        """Find existing user by email or create a new one, and update tokens."""
        from datetime import timedelta
        from app.core.time import utc_now
        from app.crud import user as crud_user
        from app.schemas.user import UserCreate
        from app.services.auth_service import AuthService

        auth_srv = AuthService()
        user = crud_user.get_by_email(db, email=email)
        
        if not user:
            user = User(
                email=email,
                first_name=full_name.split()[0] if full_name else "",
                last_name=" ".join(full_name.split()[1:]) if full_name else "",
                role="member",
                is_active=True,
                oauth_provider="google",
                hashed_password=None,
            )
            db.add(user)
            db.flush()
        
        if tokens:
            from app.core.encryption import encrypt_token
            user.google_access_token = encrypt_token(tokens.get("access_token"))
            if tokens.get("refresh_token"):
                user.google_refresh_token = encrypt_token(tokens.get("refresh_token"))

            if tokens.get("expires_in"):
                user.google_token_expires_at = utc_now() + timedelta(seconds=tokens["expires_in"])

            db.add(user)
            db.commit()
            db.refresh(user)
            
        return user

    def create_access_token_for_user(self, user):
        """Create a JWT for the given user object using the existing utility."""
        from app.core.security import create_access_token
        return create_access_token(data={"sub": str(user.id)})
