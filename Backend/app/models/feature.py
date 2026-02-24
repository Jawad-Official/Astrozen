import uuid
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Date,
    Enum as SQLEnum,
    ForeignKey,
    Float,
    Boolean,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.models.enums import IssuePriority, FeatureType, FeatureStatus, FeatureHealth


class Feature(Base):
    __tablename__ = "features"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identifier = Column(String, unique=True, nullable=True, index=True)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    owner_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    parent_id = Column(
        UUID(as_uuid=True), ForeignKey("features.id", ondelete="CASCADE"), nullable=True
    )
    blueprint_node_id = Column(String, nullable=True, index=True)

    name = Column(String, nullable=False)
    problem_statement = Column(Text, nullable=True)
    target_user = Column(String, nullable=True)
    expected_outcome = Column(Text, nullable=True)
    success_metric = Column(Text, nullable=True)

    type = Column(
        SQLEnum(FeatureType), nullable=False, default=FeatureType.NEW_CAPABILITY
    )
    status = Column(
        SQLEnum(FeatureStatus), nullable=False, default=FeatureStatus.DISCOVERY
    )
    priority = Column(
        SQLEnum(IssuePriority), nullable=False, default=IssuePriority.NONE
    )
    validation_evidence = Column(Text, nullable=True)

    health = Column(
        SQLEnum(FeatureHealth), nullable=False, default=FeatureHealth.ON_TRACK
    )
    delivery_confidence = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="features")
    owner = relationship("User", foreign_keys=[owner_id])
    milestones = relationship(
        "Milestone", back_populates="feature", cascade="all, delete-orphan"
    )
    issues = relationship(
        "Issue", back_populates="feature", cascade="all, delete-orphan"
    )

    sub_features = relationship(
        "Feature", cascade="all, delete-orphan", back_populates="parent"
    )
    parent = relationship("Feature", remote_side=[id], back_populates="sub_features")

    __table_args__ = (
        Index("idx_features_project_id", "project_id"),
        Index("idx_features_status", "status"),
    )

    @property
    def top_level_milestones(self):
        return [m for m in self.milestones if m.parent_id is None]


class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    feature_id = Column(
        UUID(as_uuid=True),
        ForeignKey("features.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    target_date = Column(Date, nullable=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    feature = relationship("Feature", back_populates="milestones")

    __table_args__ = (Index("idx_milestones_feature_id", "feature_id"),)
