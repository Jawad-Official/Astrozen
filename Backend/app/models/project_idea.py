import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class IdeaStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    CLARIFICATION_NEEDED = "CLARIFICATION_NEEDED"
    READY_FOR_VALIDATION = "READY_FOR_VALIDATION"
    VALIDATED = "VALIDATED"
    BLUEPRINT_GENERATED = "BLUEPRINT_GENERATED"
    COMPLETED = "COMPLETED"

class AssetType(str, enum.Enum):
    PRD = "PRD"
    APP_FLOW = "APP_FLOW"
    TECH_STACK = "TECH_STACK"
    FRONTEND_GUIDELINES = "FRONTEND_GUIDELINES"
    BACKEND_SCHEMA = "BACKEND_SCHEMA"
    IMPLEMENTATION_PLAN = "IMPLEMENTATION_PLAN"
    DIAGRAM_USER_FLOW = "DIAGRAM_USER_FLOW"
    DIAGRAM_KANBAN = "DIAGRAM_KANBAN"

class AssetStatus(str, enum.Enum):
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class ProjectIdea(Base):
    __tablename__ = "project_ideas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    raw_input = Column(String, nullable=False)
    refined_description = Column(String, nullable=True)
    
    # Phase 1: Clarification
    clarification_questions = Column(JSON, nullable=True) # List of {question: str, answer: str, suggestion: str}
    
    status = Column(SQLEnum(IdeaStatus), default=IdeaStatus.DRAFT, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    project = relationship("Project")
    validation_report = relationship("ValidationReport", back_populates="project_idea", uselist=False, cascade="all, delete-orphan")
    assets = relationship("ProjectAsset", back_populates="project_idea", cascade="all, delete-orphan")

class ValidationReport(Base):
    __tablename__ = "validation_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_idea_id = Column(UUID(as_uuid=True), ForeignKey("project_ideas.id", ondelete="CASCADE"), nullable=False)
    
    market_feasibility = Column(JSON, nullable=False) # {score: int, analysis: str, pillars: [{name: str, status: str}]}
    improvements = Column(JSON, nullable=False) # List of strings
    core_features = Column(JSON, nullable=False) # List of {name: str, description: str, type: str}
    tech_stack = Column(JSON, nullable=False) # {frontend: [], backend: [], infrastructure: []}
    pricing_model = Column(JSON, nullable=False) # {type: str, tiers: [{name: str, price: str, features: []}]}
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project_idea = relationship("ProjectIdea", back_populates="validation_report")

class ProjectAsset(Base):
    __tablename__ = "project_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_idea_id = Column(UUID(as_uuid=True), ForeignKey("project_ideas.id", ondelete="CASCADE"), nullable=False)
    
    asset_type = Column(SQLEnum(AssetType), nullable=False)
    content = Column(Text, nullable=True) # Markdown content or JSON for diagrams
    r2_path = Column(String, nullable=True) # Path in R2 bucket
    status = Column(SQLEnum(AssetStatus), default=AssetStatus.PENDING, nullable=False)
    
    chat_history = Column(JSON, nullable=True) # History for this specific doc generation
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project_idea = relationship("ProjectIdea", back_populates="assets")