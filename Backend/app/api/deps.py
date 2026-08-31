from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.crud.base import _coerce_uuid
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_token_from_request(request: Request) -> Optional[str]:
    """Extract JWT from Authorization header or HTTP-only cookie."""
    # Try Authorization header first
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]

    # Fall back to HTTP-only cookie
    token = request.cookies.get("auth_token")
    if token:
        return token

    return None


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> User:
    """Get current authenticated user from token or cookie"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # If no token from OAuth2 scheme, try cookie
    if not token:
        token = get_token_from_request(request)

    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        from uuid import UUID as pyUUID
        user_uuid = pyUUID(user_id)
    except (ValueError, AttributeError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_uuid).first()
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


def check_is_team_leader(user: User, team_id: UUID, db: Session) -> bool:
    """Check if user is a leader of the specific team.

    The team must belong to the user's own organization before the admin
    bypass is considered - otherwise an admin of one organization could act
    on a team belonging to a different organization entirely.
    """
    from app.models.team_model import Team
    team_id = _coerce_uuid(team_id)
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team or team.organization_id != user.organization_id:
        return False

    if check_is_admin(user):
        return True
    return any(t.id == team_id for t in user.led_teams)


def check_is_team_member(user: User, team_id: UUID, db: Session) -> bool:
    """Check if user is a member of the specific team.

    The team must belong to the user's own organization before the admin
    bypass is considered - see check_is_team_leader.
    """
    from app.models.team_model import Team
    team_id = _coerce_uuid(team_id)
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team or team.organization_id != user.organization_id:
        return False

    if check_is_admin(user):
        return True
    return any(t.id == team_id for t in user.teams)


def check_can_manage_project(user: User, project_id: UUID, db: Session) -> bool:
    """
    Check if user can edit/delete project:
    0. Project must belong to the user's own organization
    1. Is org Admin (Always True)
    2. Is leader of the team assigned to the project
    3. Is the project lead
    """
    from app.models.project import Project
    project_id = _coerce_uuid(project_id)
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or not project.team or project.team.organization_id != user.organization_id:
        return False

    if check_is_admin(user):
        return True

    # Check if project lead
    if project.lead_id == user.id:
        return True

    # Check primary team leadership
    if check_is_team_leader(user, project.team_id, db):
        return True

    # Check contributing teams leadership
    for team in project.teams:
        if check_is_team_leader(user, team.id, db):
            return True

    return False


def check_can_edit_issue(user: User, issue_id: UUID, db: Session) -> bool:
    """
    Check if user can edit/delete issue:
    0. Issue must belong to the user's own organization
    1. Is org Admin (Always True)
    2. Is leader of the team the issue belongs to
    3. Is the assignee of the issue
    """
    from app.models.issue import Issue
    issue_id = _coerce_uuid(issue_id)
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue or not issue.team or issue.team.organization_id != user.organization_id:
        return False

    if check_is_admin(user):
        return True

    # Check team leadership
    if check_is_team_leader(user, issue.team_id, db):
        return True

    # Check if assignee
    if issue.assignee_id == user.id:
        return True

    return False


def check_can_edit_feature(user: User, feature_id: UUID, db: Session) -> bool:
    """
    Check if user can edit/delete feature:
    0. Feature's project must belong to the user's own organization
    1. Is org Admin (Always True)
    2. Has manage access to parent project
    3. Is the feature owner
    """
    from app.models.feature import Feature
    feature_id = _coerce_uuid(feature_id)
    feature = db.query(Feature).filter(Feature.id == feature_id).first()
    if (
        not feature
        or not feature.project
        or not feature.project.team
        or feature.project.team.organization_id != user.organization_id
    ):
        return False

    if check_is_admin(user):
        return True

    # Check ownership
    if feature.owner_id == user.id:
        return True

    # Check project management permissions
    return check_can_manage_project(user, feature.project_id, db)


def verify_project_in_org(db: Session, project_id, user: User):
    """Fetch a project and verify it belongs to the current user's organization.

    Raises 404 (not 403) on any mismatch so cross-organization resource
    existence is never confirmed to an unauthorized caller.

    Accepts project_id as either a UUID or a str (some callers only have a
    `str` path parameter) - see app.crud.base._coerce_uuid for why a plain
    str must be converted before it reaches a UUID(as_uuid=True) column.
    """
    from app.models.project import Project
    from app.crud.base import _coerce_uuid
    project = db.query(Project).filter(Project.id == _coerce_uuid(project_id)).first()
    if not project or not project.team or project.team.organization_id != user.organization_id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def get_owned_document(
    doc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Fetch a document and verify the caller may access it: either the
    document's project belongs to the caller's organization, or the
    document's idea belongs to the caller. Raises 404 otherwise - the same
    response as a genuinely missing document, so existence isn't leaked.
    """
    from app.models.document import Document
    doc = db.query(Document).filter(Document.id == doc_id).first()
    not_found = HTTPException(status_code=404, detail="Document not found")
    if not doc:
        raise not_found

    if doc.project_id:
        from app.models.project import Project
        project = db.query(Project).filter(Project.id == doc.project_id).first()
        if not project or not project.team or project.team.organization_id != current_user.organization_id:
            raise not_found
    elif doc.idea_id:
        from app.models.project_idea import ProjectIdea
        idea = db.query(ProjectIdea).filter(ProjectIdea.id == doc.idea_id).first()
        if not idea or idea.user_id != current_user.id:
            raise not_found
    else:
        raise not_found

    return doc
