from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func
from app.crud.base import CRUDBase
from app.models.issue import Issue, IssueStatus, IssuePriority, TriageStatus, Visibility, IssueResource
from app.schemas.issue import IssueCreate, IssueUpdate
from uuid import UUID


class CRUDIssue(CRUDBase[Issue, IssueCreate, IssueUpdate]):
    """CRUD operations for Issue model"""
    
    def get(self, db: Session, id: any) -> Optional[Issue]:
        return db.query(self.model).options(joinedload(Issue.assignee)).filter(self.model.id == id).first()

    def create(
        self, 
        db: Session, 
        *, 
        obj_in: IssueCreate,
        identifier: str
    ) -> Issue:
        """Create issue"""
        obj_in_data = obj_in.model_dump()
        resources_data = obj_in_data.pop("resources", None)
        
        db_obj = Issue(**obj_in_data, identifier=identifier)
        db.add(db_obj)
        db.flush()
        
        if resources_data:
            for res in resources_data:
                resource_obj = IssueResource(
                    name=res['name'],
                    url=res['url'],
                    type=res['type'],
                    issue_id=db_obj.id
                )
                db.add(resource_obj)

        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(
        self,
        db: Session,
        *,
        db_obj: Issue,
        obj_in: IssueUpdate
    ) -> Issue:
        """Update issue"""
        update_data = obj_in.model_dump(exclude_unset=True)
        # Update fields
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_by_assignee(self, db: Session, *, assignee_id: UUID) -> List[Issue]:
        """Get all issues assigned to a user"""
        return db.query(Issue).options(joinedload(Issue.assignee)).filter(Issue.assignee_id == assignee_id).all()
    
    def get_triage_issues(self, db: Session) -> List[Issue]:
        """Get all issues pending triage"""
        return db.query(Issue).options(joinedload(Issue.assignee)).filter(Issue.triage_status == TriageStatus.PENDING).all()
    
    def get_next_identifier(self, db: Session, prefix: str) -> str:
        """Get the next identifier for a given prefix (e.g., ENG-1, ENG-2)"""
        # Query for the highest identifier number with the given prefix
        # This is simplified and assumes identifiers are always in prefix-number format
        # In a real system, you might want a more robust way to track this (like a counter table)
        
        # We search for the max number where identifier starts with {prefix}-
        pattern = f"{prefix}-%"
        max_id = db.query(func.max(Issue.identifier)).filter(Issue.identifier.like(pattern)).scalar()
        
        if not max_id:
            return f"{prefix}-1"
        
        try:
            # Extract number from prefix-number
            current_num = int(max_id.split("-")[1])
            return f"{prefix}-{current_num + 1}"
        except (ValueError, IndexError):
            # Fallback if parsing fails
            return f"{prefix}-1"
    
    def get_filtered(
        self,
        db: Session,
        *,
        user_id: UUID,
        user_team_ids: List[UUID],
        status: Optional[List[IssueStatus]] = None,
        priority: Optional[List[IssuePriority]] = None,
        issue_type: Optional[List[any]] = None,
        project_id: Optional[UUID] = None,
        feature_id: Optional[UUID] = None,
        cycle_id: Optional[UUID] = None,
        assignee_id: Optional[UUID] = None,
        team_id: Optional[UUID] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        organization_id: Optional[UUID] = None
    ) -> tuple[List[Issue], int]:
        """Get filtered issues with visibility rules"""
        
        from app.models.team_model import Team
        query = db.query(Issue).options(joinedload(Issue.assignee)).join(Issue.team)
        
        if organization_id:
            query = query.filter(Team.organization_id == organization_id)
        
        # Apply filters
        if status:
            query = query.filter(Issue.status.in_(status))
        if priority:
            query = query.filter(Issue.priority.in_(priority))
        if issue_type:
            query = query.filter(Issue.issue_type.in_(issue_type))
        if project_id:
            from app.models.feature import Feature
            query = query.join(Issue.feature).filter(Feature.project_id == project_id)
        if feature_id:
            query = query.filter(Issue.feature_id == feature_id)
        if cycle_id:
            query = query.filter(Issue.cycle_id == cycle_id)
        if assignee_id:
            query = query.filter(Issue.assignee_id == assignee_id)
        if team_id:
            query = query.filter(Issue.team_id == team_id)
            
        if search:
            query = query.filter(
                or_(
                    Issue.title.ilike(f"%{search}%"),
                    Issue.identifier.ilike(f"%{search}%")
                )
            )
        
        total = query.count()
        issues = query.offset(skip).limit(limit).all()
        
        return issues, total

issue = CRUDIssue(Issue)
