from typing import List, Optional, Any, Tuple
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_, func
from app.crud.base import CRUDBase
from app.models.feature import Feature, Milestone, FeatureStatus, FeatureHealth
from app.models.issue import IssuePriority
from app.schemas.feature import FeatureCreate, FeatureUpdate, MilestoneCreate, MilestoneUpdate
from uuid import UUID


class CRUDFeature(CRUDBase[Feature, FeatureCreate, FeatureUpdate]):
    """CRUD operations for Feature model"""
    
    def get(self, db: Session, id: Any) -> Optional[Feature]:
        return db.query(Feature).options(
            selectinload(Feature.milestones)
        ).filter(Feature.id == id).first()

    def get_by_project(self, db: Session, *, project_id: UUID) -> List[Feature]:
        """Get all features for a project"""
        return db.query(Feature).options(
            selectinload(Feature.milestones)
        ).filter(Feature.project_id == project_id).all()

    def get_multi_by_user_projects(
        self, 
        db: Session, 
        *, 
        user_id: UUID, 
        user_team_ids: List[UUID],
        organization_id: Optional[UUID] = None
    ) -> List[Feature]:
        """Get all features for all projects the user has access to"""
        from app.models.project import Project
        from app.models.team_model import Team
        query = db.query(Feature).options(
            selectinload(Feature.milestones)
        ).join(Project).join(Project.team)
        
        if organization_id:
            query = query.filter(Team.organization_id == organization_id)
            
        return query.all()

    def get_next_identifier(self, db: Session, prefix: str) -> str:
        """Get the next identifier for a given prefix (e.g., ENG-F1, ENG-F2)"""
        from sqlalchemy import func
        # We use a distinct suffix for features, like prefix-F{number}
        feature_prefix = f"{prefix}-F"
        pattern = f"{feature_prefix}%"
        max_id = db.query(func.max(Feature.identifier)).filter(Feature.identifier.like(pattern)).scalar()
        
        if not max_id:
            return f"{feature_prefix}1"
        
        try:
            # Extract number from prefix-Fnumber
            current_num = int(max_id.replace(feature_prefix, ""))
            return f"{feature_prefix}{current_num + 1}"
        except (ValueError, IndexError):
            return f"{feature_prefix}1"

    def create(
        self, 
        db: Session, 
        *, 
        obj_in: FeatureCreate,
        identifier: str
    ) -> Feature:
        """Create feature"""
        obj_in_data = obj_in.model_dump()
        if "identifier" in obj_in_data:
            del obj_in_data["identifier"]
        db_obj = Feature(**obj_in_data, identifier=identifier)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def create_milestone(self, db: Session, *, feature_id: UUID, obj_in: MilestoneCreate) -> Milestone:
        """Create a milestone for a feature"""
        db_obj = Milestone(
            feature_id=feature_id,
            name=obj_in.name,
            description=obj_in.description,
            target_date=obj_in.target_date,
            completed=obj_in.completed
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        return db_obj
        
    def get_milestones(self, db: Session, *, feature_id: UUID) -> List[Milestone]:
        return db.query(Milestone).filter(Milestone.feature_id == feature_id).all()

    def get_milestone(self, db: Session, *, id: UUID) -> Optional[Milestone]:
        return db.query(Milestone).filter(Milestone.id == id).first()

    def update_milestone(self, db: Session, *, db_obj: Milestone, obj_in: MilestoneUpdate) -> Milestone:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        return db_obj

    def delete_milestone(self, db: Session, *, id: UUID) -> Optional[Milestone]:
        obj = db.query(Milestone).get(id)
        if obj:
            db.delete(obj)
            db.commit()
        return obj


feature = CRUDFeature(Feature)
