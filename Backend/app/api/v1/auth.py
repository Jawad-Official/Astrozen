from fastapi import APIRouter, Depends, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.api.deps import get_current_active_user
from app.models.user import User
from app.schemas.user import UserCreate, User as UserSchema, Token
from app.services import auth_service
from app.services.audit_service import log_event, LOGIN_SUCCESS, LOGIN_FAILURE, REGISTER, PERMISSION_DENIED
from app.core.rate_limit import limiter

router = APIRouter()


@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
def register(request: Request, user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        user = auth_service.register_user(db, user_in=user_in)
        log_event(REGISTER, user_id=str(user.id), ip_address=request.client.host if request.client else None)
        return user
    except Exception as e:
        log_event(REGISTER, success=False, ip_address=request.client.host if request.client else None, detail=str(e))
        raise


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Login and get access token"""
    try:
        result = auth_service.login_user(
            db,
            username=form_data.username,
            password=form_data.password
        )
        # Log successful login (sub is user_id in the token)
        log_event(LOGIN_SUCCESS, ip_address=request.client.host if request.client else None)
        response = JSONResponse(content=result)
        response.set_cookie(
            key="auth_token",
            value=result["access_token"],
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/",
        )
        return response
    except Exception as e:
        log_event(LOGIN_FAILURE, success=False, ip_address=request.client.host if request.client else None, detail=str(e))
        raise


@router.get("/me", response_model=UserSchema)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user
