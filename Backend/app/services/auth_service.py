from datetime import timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.crud import user as crud_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.config import settings
from app.schemas.user import UserCreate
from app.models.user import User


class AuthService:
    """Business logic for authentication"""
    
    def register_user(
        self,
        db: Session,
        *,
        user_in: UserCreate
    ) -> User:
        """Register a new user"""
        # Check if user exists
        if crud_user.get_by_email(db, email=user_in.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create user
        db_obj = User(
            email=user_in.email,
            # username removed
            first_name=user_in.first_name,
            last_name=user_in.last_name,
            job_title=user_in.job_title,
            role="member",
            hashed_password=get_password_hash(user_in.password),
            is_active=True
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def login_user(
        self,
        db: Session,
        *,
        username: str, # This will be the email from the frontend
        password: str
    ):
        """Authenticate and login user (username field contains email)"""
        # We pass 'username' (which is the email) to authenticate
        user = crud_user.authenticate(db, username=username, password=password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}


auth_service = AuthService()
