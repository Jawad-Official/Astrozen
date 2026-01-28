from typing import List
from sqlalchemy.orm import Session, joinedload
from app.models.activity import Activity, ActivityType
from uuid import UUID


class CRUDActivity:
    """CRUD operations for Activity model"""
    
    def create(
        self,
        db: Session,
        *,
        issue_id: UUID,
        type: ActivityType,
        actor_id: UUID,
        old_value: str = None,
        new_value: str = None
    ) -> Activity:
        """Create an activity record"""
        db_obj = Activity(
            issue_id=issue_id,
            type=type,
            actor_id=actor_id,
            old_value=old_value,
            new_value=new_value
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_by_issue(self, db: Session, *, issue_id: UUID) -> List[Activity]:
        """Get all activities for an issue"""
        return db.query(Activity).options(joinedload(Activity.actor)).filter(Activity.issue_id == issue_id).all()


activity = CRUDActivity()
