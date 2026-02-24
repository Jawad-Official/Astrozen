import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    JSON,
    Enum as SQLEnum,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.models.enums import IdeaStatus, AssetType, AssetStatus


class ProjectIdea(Base):
    __tablename__ = "project_ideas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    project_id = Column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    raw_input = Column(String, nullable=False)
    refined_description = Column(String, nullable=True)

    clarification_questions = Column(JSON, nullable=True)

    status = Column(SQLEnum(IdeaStatus), default=IdeaStatus.DRAFT, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User")
    project = relationship("Project")
    validation_report = relationship(
        "ValidationReport",
        back_populates="project_idea",
        uselist=False,
        cascade="all, delete-orphan",
    )
    assets = relationship(
        "ProjectAsset", back_populates="project_idea", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_project_ideas_user_id", "user_id"),
        Index("idx_project_ideas_status", "status"),
    )


class ValidationReport(Base):
    __tablename__ = "validation_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_idea_id = Column(
        UUID(as_uuid=True),
        ForeignKey("project_ideas.id", ondelete="CASCADE"),
        nullable=False,
    )

    market_feasibility = Column(JSON, nullable=False)
    improvements = Column(JSON, nullable=False)
    core_features = Column(JSON, nullable=False)
    tech_stack = Column(JSON, nullable=False)
    pricing_model = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    project_idea = relationship("ProjectIdea", back_populates="validation_report")


class ProjectAsset(Base):
    __tablename__ = "project_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_idea_id = Column(
        UUID(as_uuid=True),
        ForeignKey("project_ideas.id", ondelete="CASCADE"),
        nullable=False,
    )

    asset_type = Column(SQLEnum(AssetType), nullable=False)
    content = Column(Text, nullable=True)
    r2_path = Column(String, nullable=True)
    status = Column(SQLEnum(AssetStatus), default=AssetStatus.PENDING, nullable=False)

    chat_history = Column(JSON, nullable=True)

    analysis_result = Column(JSON, nullable=True)
    enhanced_content = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    project_idea = relationship("ProjectIdea", back_populates="assets")

    __table_args__ = (Index("idx_project_assets_project_idea_id", "project_idea_id"),)
