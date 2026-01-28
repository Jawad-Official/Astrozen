import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class ViewType(str, enum.Enum):
    ISSUES = "issues"
    PROJECTS = "projects"


class ViewVisibility(str, enum.Enum):
    PERSONAL = "personal"
    TEAM = "team"


class ViewLayout(str, enum.Enum):
    LIST = "list"
    BOARD = "board"


class CustomView(Base):
    __tablename__ = "custom_views"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    icon = Column(String, nullable=False)
    type = Column(SQLEnum(ViewType), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    visibility = Column(SQLEnum(ViewVisibility), nullable=False, default=ViewVisibility.PERSONAL)
    filter_config = Column(JSON, nullable=False)  # Stores filter configuration as JSON
    layout = Column(SQLEnum(ViewLayout), nullable=False, default=ViewLayout.LIST)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", back_populates="custom_views")


class SavedFilter(Base):
    __tablename__ = "saved_filters"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    filter_config = Column(JSON, nullable=False)  # Stores filter configuration as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="saved_filters")
