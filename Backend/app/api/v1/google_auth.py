from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.services.auth_service import AuthService
from app.services.google_auth import GoogleAuthService

router = APIRouter()

auth_service = AuthService()

google_service = GoogleAuthService()

@router.get("/auth/google/login", response_class=RedirectResponse)
def google_login(db: Session = Depends(get_db)):
    """Start Google OAuth flow and redirect to Google consent screen."""
    auth_url = google_service.get_authorization_url()
    return RedirectResponse(url=auth_url)

@router.get("/auth/google/callback")
def google_callback(code: str | None = None, db: Session = Depends(get_db)):
    """Handle OAuth callback, exchange code for tokens, and return JWT.

    The frontend should capture the redirect and extract the token from the response.
    """
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing authorization code")

    try:
        result = google_service.exchange_code_for_user_info(code)
        user_info = result["user"]
        tokens = result["tokens"]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Find or create a local user based on the Google email and save tokens
    user = google_service.get_or_create_user_by_google_email(
        db, 
        email=user_info["email"], 
        full_name=user_info.get("name"),
        tokens=tokens
    )

    access_token = auth_service.create_access_token_for_user(user)
    return {"access_token": access_token, "token_type": "bearer"}
