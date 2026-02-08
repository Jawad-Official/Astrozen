import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class IdeaStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    VALIDATING = "VALIDATING"
    VALIDATED = "VALIDATED"
    CONFIRMED = "CONFIRMED"
    GENERATING_ASSETS = "GENERATING_ASSETS"
    GENERATED = "GENERATED"

class ProjectIdea(Base):
    __tablename__ = "project_ideas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    title = Column(String, nullable=True)
    raw_input = Column(String, nullable=False)
    refined_description = Column(String, nullable=True)
    status = Column(SQLEnum(IdeaStatus, name="ideastatus"), default=IdeaStatus.DRAFT, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)       
    
    # Relationships
    user = relationship("User")
    validation_report = relationship("ValidationReport", back_populates="project_idea", uselist=False, cascade="all, delete-orphan")
    assets = relationship("ProjectAsset", back_populates="project_idea", cascade="all, delete-orphan")

class ValidationReport(Base):
    __tablename__ = "validation_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_idea_id = Column(UUID(as_uuid=True), ForeignKey("project_ideas.id", ondelete="CASCADE"), nullable=False)
    market_analysis = Column(JSON, nullable=False)
    improvements = Column(JSON, nullable=False)
    core_features = Column(JSON, nullable=False)
    tech_stack = Column(JSON, nullable=False)
    pricing_model = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project_idea = relationship("ProjectIdea", back_populates="validation_report")