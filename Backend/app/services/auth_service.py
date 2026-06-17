from datetime import timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.crud import user as crud_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.config import settings
from app.schemas.user import UserCreate
from app.models.user import User


class AuthService:
    """Business logic for authentication."""

    def register_user(
        self,
        db: Session,
        *,
        user_in: UserCreate
    ) -> User:
        """Register a new user"""
        if crud_user.get_by_email(db, email=user_in.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed. Please check your input and try again."
            )
        if user_in.username and crud_user.get_by_username(db, username=user_in.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed. Please check your input and try again."
            )

        db_obj = User(
            email=user_in.email,
            username=user_in.username,
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
        username: str,
        password: str
    ):
        """Authenticate with an email address or username."""
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

        # Block password login for OAuth-only accounts
        if user.oauth_provider is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"This account uses {user.oauth_provider.capitalize()} sign-in. Please sign in with {user.oauth_provider.capitalize()}.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )

        return {"access_token": access_token, "token_type": "bearer"}


auth_service = AuthService()
