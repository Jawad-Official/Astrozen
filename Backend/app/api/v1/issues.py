from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.api.deps import (
    get_current_active_user,
    check_can_edit_issue,
    check_is_team_member,
)
from app.models.user import User
from app.models.team_model import Team
from app.models.issue import Issue, IssueStatus, IssuePriority, IssueType, TriageStatus
from app.schemas.issue import IssueCreate, IssueUpdate, Issue as IssueSchema, IssueList
from app.schemas.comment import Comment as CommentSchema, CommentCreate
from app.schemas.comment import Activity as ActivitySchema
from app.crud import (
    issue as crud_issue,
    comment as crud_comment,
    activity as crud_activity,
    team as crud_team,
)
from app.services import issue_service
from uuid import UUID

router = APIRouter()


@router.get("", response_model=IssueList)
def list_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    status: Optional[List[IssueStatus]] = Query(None),
    priority: Optional[List[IssuePriority]] = Query(None),
    issue_type: Optional[List[IssueType]] = Query(None),
    project_id: Optional[UUID] = None,
    feature_id: Optional[UUID] = None,
    assignee_id: Optional[UUID] = None,
    team_id: Optional[UUID] = None,  # Added
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
):
    """List issues with visibility rules"""

    # Get user's teams for logic
    user_team_ids = [team.id for team in current_user.teams]

    issues, total = crud_issue.get_filtered(
        db,
        user_id=current_user.id,
        user_team_ids=user_team_ids,
        status=status,
        priority=priority,
        issue_type=issue_type,
        project_id=project_id,
        feature_id=feature_id,
        assignee_id=assignee_id,
        team_id=team_id,
        search=search,
        skip=skip,
        limit=limit,
        organization_id=current_user.organization_id,
    )

    return {"issues": issues, "total": total}


@router.get("/my-issues", response_model=List[IssueSchema])
def get_my_issues(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    """Get issues assigned to current user"""
    issues = crud_issue.get_by_assignee(db, assignee_id=current_user.id)
    return issues


@router.get("/inbox", response_model=List[IssueSchema])
def get_inbox_issues(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    """Get issues pending triage"""
    all_triage = (
        db.query(Issue)
        .options(joinedload(Issue.assignee))
        .join(Issue.team)
        .filter(
            Issue.triage_status == TriageStatus.PENDING,
            Team.organization_id == current_user.organization_id,
        )
        .all()
    )
    return all_triage


@router.post("", response_model=IssueSchema, status_code=status.HTTP_201_CREATED)
async def create_issue(
    issue_in: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new issue"""
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="Must belong to an organization")

    if not check_is_team_member(current_user, issue_in.team_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of the team to create issues in it",
        )

    issue = await issue_service.create_issue(
        db, issue_in=issue_in, current_user_id=current_user.id
    )
    return issue


@router.get("/{issue_id}", response_model=IssueSchema)
def get_issue(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get issue by ID"""
    issue = crud_issue.get(db, id=issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # If org member, can see all issues in org
    if issue.team.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this issue")

    return issue


@router.patch("/{issue_id}", response_model=IssueSchema)
def update_issue(
    issue_id: UUID,
    issue_in: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an issue"""
    # Restricted fields that only Admin/Leaders/Assignee can change
    if not check_can_edit_issue(current_user, issue_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization admins, team leaders or the assignee can update this issue",
        )

    issue = issue_service.update_issue(
        db, issue_id=issue_id, issue_in=issue_in, current_user_id=current_user.id
    )

    return issue


@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issue(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an issue"""
    if not check_can_edit_issue(current_user, issue_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization admins, team leaders or the assignee can delete this issue",
        )

    crud_issue.delete(db, id=issue_id)
    return None


@router.post(
    "/{issue_id}/comments",
    response_model=CommentSchema,
    status_code=status.HTTP_201_CREATED,
)
def add_comment(
    issue_id: UUID,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add a comment to an issue"""
    issue = crud_issue.get(db, id=issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    comment = issue_service.add_comment(
        db, issue_id=issue_id, content=comment_in.content, author_id=current_user.id
    )

    return comment


@router.get("/{issue_id}/comments", response_model=List[CommentSchema])
def get_comments(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get comments for an issue"""
    comments = crud_comment.get_by_issue(db, issue_id=issue_id)
    return comments


@router.get("/{issue_id}/activities", response_model=List[ActivitySchema])
def get_activities(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get activity history for an issue"""
    activities = crud_activity.get_by_issue(db, issue_id=issue_id)
    return activities
