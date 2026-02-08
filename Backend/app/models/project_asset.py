import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class AssetType(str, enum.Enum):
    PRD = "PRD"
    APP_FLOW = "APP_FLOW"
    TECH_STACK = "TECH_STACK"
    FRONTEND_GUIDE = "FRONTEND_GUIDE"
    BACKEND_SCHEMA = "BACKEND_SCHEMA"
    IMPLEMENTATION_PLAN = "IMPLEMENTATION_PLAN"
    DIAGRAM_MERMAID = "DIAGRAM_MERMAID"

class AssetStatus(str, enum.Enum):
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETE = "COMPLETE"
    FAILED = "FAILED"

class ProjectAsset(Base):
    __tablename__ = "project_assets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_idea_id = Column(UUID(as_uuid=True), ForeignKey("project_ideas.id", ondelete="CASCADE"), nullable=False)
    asset_type = Column(SQLEnum(AssetType, name="assettype"), nullable=False)
    storage_path = Column(String, nullable=True) # Markdown path (default for preview)
    storage_path_pdf = Column(String, nullable=True)
    storage_path_docx = Column(String, nullable=True)
    file_format = Column(String, nullable=True) # Primary format
    generation_status = Column(SQLEnum(AssetStatus, name="assetstatus"), default=AssetStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project_idea = relationship("ProjectIdea", back_populates="assets")
