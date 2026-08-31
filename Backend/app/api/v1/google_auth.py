import secrets

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

OAUTH_STATE_COOKIE = "google_oauth_state"

@router.get("/login", response_class=RedirectResponse)
def google_login(db: Session = Depends(get_db)):
    """Start Google OAuth flow and redirect to Google consent screen."""
    state = secrets.token_urlsafe(32)
    auth_url = google_service.get_authorization_url(state=state)
    response = RedirectResponse(url=auth_url)
    # Short-lived, single-use, httpOnly: only this browser's next callback
    # request can present the matching state - not readable by JS, and not
    # meant to persist beyond the OAuth round-trip that's about to happen.
    response.set_cookie(
        key=OAUTH_STATE_COOKIE,
        value=state,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=600,
        path="/",
    )
    return response

@router.get("/callback")
@limiter.limit("10/minute")
def google_callback(request: Request, code: str | None = None, state: str | None = None, db: Session = Depends(get_db)):
    """Handle OAuth callback, exchange code for tokens, and return JWT."""
    if not code:
        log_event(OAUTH_FAILURE, success=False, ip_address=request.client.host if request.client else None, detail="Missing authorization code")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing authorization code")

    expected_state = request.cookies.get(OAUTH_STATE_COOKIE)
    if not state or not expected_state or not secrets.compare_digest(state, expected_state):
        log_event(OAUTH_FAILURE, success=False, ip_address=request.client.host if request.client else None, detail="Invalid or missing OAuth state")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")

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
    response.delete_cookie(OAUTH_STATE_COOKIE, path="/")
    return response
