from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func
from app.crud.base import CRUDBase
from app.models.issue import (
    Issue,
    IssueStatus,
    IssuePriority,
    TriageStatus,
    Visibility,
    IssueType,
)
from app.models.project import Resource
from app.models.enums import ResourceTargetType
from app.schemas.issue import IssueCreate, IssueUpdate
from uuid import UUID


class CRUDIssue(CRUDBase[Issue, IssueCreate, IssueUpdate]):
    """CRUD operations for Issue model"""

    def get(self, db: Session, id: any) -> Optional[Issue]:
        return (
            db.query(self.model)
            .options(joinedload(Issue.assignee))
            .filter(self.model.id == id)
            .first()
        )

    def create(self, db: Session, *, obj_in: IssueCreate, identifier: str) -> Issue:
        """Create issue with collision retry using savepoints"""
        from sqlalchemy.exc import IntegrityError
        from app.models.team_model import Team

        obj_in_data = obj_in.model_dump()
        resources_data = obj_in_data.pop("resources", None)

        current_identifier = identifier

        for attempt in range(5):
            try:
                # Start a savepoint
                savepoint = db.begin_nested()
                db_obj = Issue(**obj_in_data, identifier=current_identifier)
                db.add(db_obj)
                db.flush()

                # If flush succeeds, we've successfully reserved the ID
                if resources_data:
                    for res in resources_data:
                        resource_obj = Resource(
                            name=res["name"],
                            url=res["url"],
                            type=res["type"],
                            target_id=db_obj.id,
                            target_type=ResourceTargetType.ISSUE,
                        )
                        db.add(resource_obj)

                db.commit()
                db.refresh(db_obj)
                return db_obj

            except IntegrityError:
                # Rollback to the savepoint on collision
                db.rollback()

                # Handle sub-issue retry
                parent_id = obj_in_data.get("parent_id")
                if parent_id:
                    parent = db.query(Issue).filter(Issue.id == parent_id).first()
                    if parent:
                        current_identifier = self.get_next_subissue_identifier(
                            db, parent_identifier=parent.identifier
                        )
                        continue

                team = db.query(Team).filter(Team.id == obj_in.team_id).first()
                if not team:
                    raise ValueError(f"Team {obj_in.team_id} not found during retry")

                current_identifier = self.get_next_identifier(
                    db, prefix=team.identifier
                )
                continue

        raise HTTPException(
            status_code=500,
            detail="Failed to generate unique issue identifier after multiple attempts",
        )

    def update(self, db: Session, *, db_obj: Issue, obj_in: IssueUpdate) -> Issue:
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
        return (
            db.query(Issue)
            .options(joinedload(Issue.assignee))
            .filter(Issue.assignee_id == assignee_id)
            .all()
        )

    def get_triage_issues(self, db: Session) -> List[Issue]:
        """Get all issues pending triage"""
        return (
            db.query(Issue)
            .options(joinedload(Issue.assignee))
            .filter(Issue.triage_status == TriageStatus.PENDING)
            .all()
        )

    def get_next_identifier(self, db: Session, prefix: str) -> str:
        """Get the next identifier for a given prefix (e.g., ENG-1, ENG-2)"""
        # Query for the highest identifier number with the given prefix
        # We sort by length first, then alphabetically to handle numeric strings correctly
        # e.g., 'JAW-10' (len 6) should be > 'JAW-9' (len 5)

        pattern = f"{prefix}-%"
        # Filter out sub-issues (containing -S) to get the true next parent ID
        max_id = (
            db.query(Issue.identifier)
            .filter(Issue.identifier.like(pattern), Issue.identifier.not_like("%-S%"))
            .order_by(func.length(Issue.identifier).desc(), Issue.identifier.desc())
            .first()
        )

        if not max_id:
            return f"{prefix}-1"

        try:
            # Extract number from prefix-number using rsplit to handle prefixes with hyphens
            # identifier is a Row in SQLAlchemy 2.0 if we only queried one column
            if hasattr(max_id, "_mapping"):
                id_str = max_id[0]
            elif isinstance(max_id, (tuple, list)):
                id_str = max_id[0]
            else:
                id_str = str(max_id)

            current_num = int(id_str.rsplit("-", 1)[1])
            return f"{prefix}-{current_num + 1}"
        except (ValueError, IndexError, AttributeError):
            # Fallback if parsing fails
            return f"{prefix}-1"

    def get_next_subissue_identifier(self, db: Session, parent_identifier: str) -> str:
        """Get the next sub-issue identifier for a given parent (e.g., ENG-1-S1, ENG-1-S2)"""
        pattern = f"{parent_identifier}-S%"
        max_id = (
            db.query(Issue.identifier)
            .filter(Issue.identifier.like(pattern))
            .order_by(func.length(Issue.identifier).desc(), Issue.identifier.desc())
            .first()
        )

        if not max_id:
            return f"{parent_identifier}-S1"

        try:
            if hasattr(max_id, "_mapping"):
                id_str = max_id[0]
            elif isinstance(max_id, (tuple, list)):
                id_str = max_id[0]
            else:
                id_str = str(max_id)

            # Extract number from parent_id-SN
            current_num_str = id_str.rsplit("-S", 1)[1]
            current_num = int(current_num_str)
            return f"{parent_identifier}-S{current_num + 1}"
        except (ValueError, IndexError, AttributeError):
            return f"{parent_identifier}-S1"

    def get_max_identifier_num(self, db: Session, prefix: str) -> int:
        """Get the current maximum identifier number for a team (excluding sub-issues)."""
        pattern = f"{prefix}-%"
        max_id = (
            db.query(Issue.identifier)
            .filter(Issue.identifier.like(pattern), Issue.identifier.not_like("%-S%"))
            .order_by(func.length(Issue.identifier).desc(), Issue.identifier.desc())
            .first()
        )

        if not max_id:
            return 0

        try:
            if hasattr(max_id, "_mapping"):
                id_str = max_id[0]
            elif isinstance(max_id, (tuple, list)):
                id_str = max_id[0]
            else:
                id_str = str(max_id)

            return int(id_str.rsplit("-", 1)[1])
        except (ValueError, IndexError, AttributeError):
            return 0

    def get_filtered(
        self,
        db: Session,
        *,
        user_id: UUID,
        user_team_ids: List[UUID],
        status: Optional[List[IssueStatus]] = None,
        priority: Optional[List[IssuePriority]] = None,
        issue_type: Optional[List[IssueType]] = None,
        project_id: Optional[UUID] = None,
        feature_id: Optional[UUID] = None,
        assignee_id: Optional[UUID] = None,
        team_id: Optional[UUID] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        organization_id: Optional[UUID] = None,
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
        if assignee_id:
            query = query.filter(Issue.assignee_id == assignee_id)
        if team_id:
            query = query.filter(Issue.team_id == team_id)

        if search:
            query = query.filter(
                or_(
                    Issue.title.ilike(f"%{search}%"),
                    Issue.identifier.ilike(f"%{search}%"),
                )
            )

        total = query.count()
        issues = query.offset(skip).limit(limit).all()

        return issues, total


issue = CRUDIssue(Issue)
