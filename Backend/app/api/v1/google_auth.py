from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.services.auth_service import AuthService
from app.services.google_auth import GoogleAuthService
from app.services.audit_service import log_event, OAUTH_LOGIN, OAUTH_FAILURE
from app.core.rate_limit import limiter

router = APIRouter()

auth_service = AuthService()

google_service = GoogleAuthService()

@router.get("/auth/google/login", response_class=RedirectResponse)
def google_login(db: Session = Depends(get_db)):
    """Start Google OAuth flow and redirect to Google consent screen."""
    auth_url = google_service.get_authorization_url()
    return RedirectResponse(url=auth_url)

@router.get("/auth/google/callback")
@limiter.limit("10/minute")
def google_callback(request: Request, code: str | None = None, db: Session = Depends(get_db)):
    """Handle OAuth callback, exchange code for tokens, and return JWT."""
    if not code:
        log_event(OAUTH_FAILURE, success=False, ip_address=request.client.host if request.client else None, detail="Missing authorization code")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing authorization code")

    try:
        result = google_service.exchange_code_for_user_info(code)
        user_info = result["user"]
        tokens = result["tokens"]
    except Exception as e:
        log_event(OAUTH_FAILURE, success=False, ip_address=request.client.host if request.client else None, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google authentication failed")

    # Find or create a local user based on the Google email and save tokens
    user = google_service.get_or_create_user_by_google_email(
        db,
        email=user_info["email"],
        full_name=user_info.get("name"),
        tokens=tokens
    )

    access_token = auth_service.create_access_token_for_user(user)

    log_event(OAUTH_LOGIN, user_id=str(user.id), ip_address=request.client.host if request.client else None)

    response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    response.set_cookie(
        key="auth_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    return response
