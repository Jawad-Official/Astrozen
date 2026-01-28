from pydantic import BaseModel, UUID4, Field, model_validator
from typing import Optional, List
from datetime import date, datetime
from app.models.feature import FeatureType, FeatureStatus, FeatureHealth
from app.models.issue import IssuePriority


class FeatureBase(BaseModel):
    name: str
    identifier: Optional[str] = None
    problem_statement: Optional[str] = None
    target_user: Optional[str] = None
    expected_outcome: Optional[str] = None
    success_metric: Optional[str] = None
    type: FeatureType = FeatureType.NEW_CAPABILITY
    status: FeatureStatus = FeatureStatus.DISCOVERY
    priority: IssuePriority = IssuePriority.NONE
    validation_evidence: Optional[str] = None
    delivery_confidence: Optional[float] = None


class FeatureCreate(FeatureBase):
    project_id: UUID4
    owner_id: Optional[UUID4] = None


class FeatureUpdate(FeatureBase):
    name: Optional[str] = None
    type: Optional[FeatureType] = None
    status: Optional[FeatureStatus] = None
    priority: Optional[IssuePriority] = None


class MilestoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    target_date: Optional[date] = None
    completed: bool = False


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(MilestoneBase):
    name: Optional[str] = None
    completed: Optional[bool] = None


class Milestone(MilestoneBase):
    id: UUID4
    feature_id: UUID4
    created_at: datetime
    
    class Config:
        from_attributes = True
        use_enum_values = True


class Feature(FeatureBase):
    id: UUID4
    project_id: UUID4
    owner_id: Optional[UUID4] = None
    health: FeatureHealth
    milestones: List[Milestone] = Field([])
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        use_enum_values = True
        populate_by_name = True
