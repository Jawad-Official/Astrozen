from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user


from uuid import UUID


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def check_is_admin(user: User) -> bool:
    """Check if user has organization ADMIN role"""
    return user.role == "admin"


def check_is_team_leader(user: User, team_id: UUID) -> bool:
    """Check if user is a leader of the specific team"""
    if check_is_admin(user):
        return True
    return any(team.id == team_id for team in user.led_teams)


def check_is_team_member(user: User, team_id: UUID) -> bool:
    """Check if user is a member of the specific team"""
    if check_is_admin(user):
        return True
    return any(team.id == team_id for team in user.teams)


def check_can_manage_project(user: User, project_id: UUID, db: Session) -> bool:
    """
    Check if user can edit/delete project:
    1. Is org Admin (Always True)
    2. Is leader of the team assigned to the project
    3. Is the project lead
    """
    if check_is_admin(user):
        return True
        
    from app.models.project import Project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return False
        
    # Check if project lead
    if project.lead_id == user.id:
        return True

    # Check primary team leadership
    if check_is_team_leader(user, project.team_id):
        return True
        
    # Check contributing teams leadership
    for team in project.teams:
        if check_is_team_leader(user, team.id):
            return True
            
    return False


def check_can_edit_issue(user: User, issue_id: UUID, db: Session) -> bool:
    """
    Check if user can edit/delete issue:
    1. Is org Admin (Always True)
    2. Is leader of the team the issue belongs to
    3. Is the assignee of the issue
    """
    if check_is_admin(user):
        return True
        
    from app.models.issue import Issue
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        return False
        
    # Check team leadership
    if check_is_team_leader(user, issue.team_id):
        return True
        
    # Check if assignee
    if issue.assignee_id == user.id:
        return True
        
    return False


def check_can_edit_feature(user: User, feature_id: UUID, db: Session) -> bool:
    """
    Check if user can edit/delete feature:
    1. Is org Admin (Always True)
    2. Has manage access to parent project
    3. Is the feature owner
    """
    if check_is_admin(user):
        return True
        
    from app.models.feature import Feature
    feature = db.query(Feature).filter(Feature.id == feature_id).first()
    if not feature:
        return False
        
    # Check ownership
    if feature.owner_id == user.id:
        return True
        
    # Check project management permissions
    return check_can_manage_project(user, feature.project_id, db)


from app.services.ai_prompt_manager import PromptManager
from app.services.ai_service import AiService
from app.services.storage_service import R2StorageProvider

def get_prompt_manager() -> PromptManager:
    return PromptManager()

def get_ai_service() -> AiService:
    return AiService()

def get_storage_provider() -> R2StorageProvider:
    return R2StorageProvider()
