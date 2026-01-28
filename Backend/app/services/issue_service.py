from sqlalchemy.orm import Session
from app.crud import issue as crud_issue, activity as crud_activity
from app.models.issue import Issue, IssueStatus, IssuePriority
from app.models.activity import ActivityType
from app.schemas.issue import IssueCreate, IssueUpdate
from uuid import UUID


class IssueService:
    """Business logic for Issue management"""
    
    def create_issue(
        self,
        db: Session,
        *,
        issue_in: IssueCreate,
        current_user_id: UUID
    ) -> Issue:
        """Create a new issue with activity tracking"""
        # Fetch team to get its identifier
        from app.models.team_model import Team
        
        # Inherit context from parent if sub-issue
        if issue_in.parent_id:
            parent_issue = crud_issue.get(db, id=issue_in.parent_id)
            if parent_issue:
                issue_in.team_id = parent_issue.team_id
                issue_in.feature_id = parent_issue.feature_id
                issue_in.milestone_id = parent_issue.milestone_id
                issue_in.cycle_id = parent_issue.cycle_id
        
        team = db.query(Team).filter(Team.id == issue_in.team_id).first()
        if not team:
            raise ValueError(f"Team with id {issue_in.team_id} not found")
        
        # Generate identifier using team identifier
        identifier = crud_issue.get_next_identifier(db, prefix=team.identifier)
        
        # Create issue
        issue = crud_issue.create(
            db,
            obj_in=issue_in,
            identifier=identifier
        )
        
        # Create activity
        crud_activity.create(
            db,
            issue_id=issue.id,
            type=ActivityType.CREATED,
            actor_id=current_user_id
        )
        
        return issue
    
    def update_issue(
        self,
        db: Session,
        *,
        issue_id: UUID,
        issue_in: IssueUpdate,
        current_user_id: UUID
    ) -> Issue:
        """Update an issue with activity tracking"""
        # Get existing issue
        issue = crud_issue.get(db, id=issue_id)
        if not issue:
            return None
        
        # Track changes
        update_data = issue_in.model_dump(exclude_unset=True)
        
        # Status change
        if "status" in update_data and update_data["status"] != issue.status:
            crud_activity.create(
                db,
                issue_id=issue.id,
                type=ActivityType.STATUS_CHANGED,
                actor_id=current_user_id,
                old_value=issue.status.value,
                new_value=update_data["status"].value
            )
        
        # Priority change
        if "priority" in update_data and update_data["priority"] != issue.priority:
            crud_activity.create(
                db,
                issue_id=issue.id,
                type=ActivityType.PRIORITY_CHANGED,
                actor_id=current_user_id,
                old_value=issue.priority.value,
                new_value=update_data["priority"].value
            )

        # Type change
        if "issue_type" in update_data and update_data["issue_type"] != issue.issue_type:
            crud_activity.create(
                db,
                issue_id=issue.id,
                type=ActivityType.TYPE_CHANGED,
                actor_id=current_user_id,
                old_value=issue.issue_type.value,
                new_value=update_data["issue_type"].value
            )
        
        # Assignee change
        if "assignee_id" in update_data and update_data["assignee_id"] != issue.assignee_id:
            crud_activity.create(
                db,
                issue_id=issue.id,
                type=ActivityType.ASSIGNED,
                actor_id=current_user_id,
                old_value=str(issue.assignee_id) if issue.assignee_id else None,
                new_value=str(update_data["assignee_id"]) if update_data["assignee_id"] else None
            )
        
        # Cycle change
        if "cycle_id" in update_data and update_data["cycle_id"] != issue.cycle_id:
            crud_activity.create(
                db,
                issue_id=issue.id,
                type=ActivityType.CYCLE_CHANGED,
                actor_id=current_user_id,
                old_value=str(issue.cycle_id) if issue.cycle_id else None,
                new_value=str(update_data["cycle_id"]) if update_data["cycle_id"] else None
            )
        
        # Update issue
        updated_issue = crud_issue.update(db, db_obj=issue, obj_in=issue_in)
        
        return updated_issue
    
    def add_comment(
        self,
        db: Session,
        *,
        issue_id: UUID,
        content: str,
        author_id: UUID
    ):
        """Add a comment to an issue"""
        from app.crud import comment as crud_comment
        from app.schemas.comment import CommentCreate
        
        # Create comment
        comment = crud_comment.create_for_issue(
            db,
            obj_in=CommentCreate(content=content),
            issue_id=issue_id,
            author_id=author_id
        )
        
        # Create activity
        crud_activity.create(
            db,
            issue_id=issue_id,
            type=ActivityType.COMMENT,
            actor_id=author_id
        )
        
        return comment


issue_service = IssueService()
