import uuid
from sqlalchemy import Column, String, Text, DateTime, Date, Enum as SQLEnum, ForeignKey, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base
from app.models.issue import IssuePriority


class FeatureType(str, enum.Enum):
    NEW_CAPABILITY = "new_capability"
    ENHANCEMENT = "enhancement"
    EXPERIMENT = "experiment"
    INFRASTRUCTURE = "infrastructure"


class FeatureStatus(str, enum.Enum):
    DISCOVERY = "discovery"
    VALIDATED = "validated"
    IN_BUILD = "in_build"
    IN_REVIEW = "in_review"
    SHIPPED = "shipped"
    ADOPTED = "adopted"
    KILLED = "killed"


class FeatureHealth(str, enum.Enum):
    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    OFF_TRACK = "off_track"


class Feature(Base):
    __tablename__ = "features"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identifier = Column(String, unique=True, nullable=True, index=True) # e.g., ENG-F1
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Core Definition (Hard Required for Validated)
    name = Column(String, nullable=False)
    problem_statement = Column(Text, nullable=True)
    target_user = Column(String, nullable=True)
    expected_outcome = Column(Text, nullable=True)
    success_metric = Column(Text, nullable=True)
    
    # Classification & State
    type = Column(SQLEnum(FeatureType), nullable=False, default=FeatureType.NEW_CAPABILITY)
    status = Column(SQLEnum(FeatureStatus), nullable=False, default=FeatureStatus.DISCOVERY)
    priority = Column(SQLEnum(IssuePriority), nullable=False, default=IssuePriority.NONE)
    validation_evidence = Column(Text, nullable=True) # JSON or Text
    
    # Health & Metrics
    health = Column(SQLEnum(FeatureHealth), nullable=False, default=FeatureHealth.ON_TRACK)
    delivery_confidence = Column(Float, nullable=True) # 0.0 to 1.0 (0-100%)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="features")
    owner = relationship("User", foreign_keys=[owner_id])
    milestones = relationship("Milestone", back_populates="feature", cascade="all, delete-orphan")
    issues = relationship("Issue", back_populates="feature")

    @property
    def top_level_milestones(self):
        return [m for m in self.milestones if m.parent_id is None]


class Milestone(Base):
    __tablename__ = "milestones"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    feature_id = Column(UUID(as_uuid=True), ForeignKey('features.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    target_date = Column(Date, nullable=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    feature = relationship("Feature", back_populates="milestones")
