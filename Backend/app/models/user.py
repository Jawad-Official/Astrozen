import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    # username removed
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    job_title = Column(String, nullable=True)  # e.g., "Frontend Dev"
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="member", nullable=False)  # admin, leader, member
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization", back_populates="members", foreign_keys=[organization_id])
    created_organizations = relationship("Organization", back_populates="created_by", foreign_keys="Organization.created_by_id")
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    teams = relationship("Team", secondary="team_members", back_populates="members")
    led_teams = relationship("Team", secondary="team_leaders", back_populates="leaders")
    assigned_issues = relationship("Issue", back_populates="assignee", foreign_keys="Issue.assignee_id")
    led_projects = relationship("Project", back_populates="lead", foreign_keys="Project.lead_id")
    project_memberships = relationship("Project", secondary="project_members", back_populates="members")
    comments = relationship("Comment", back_populates="author")
    activities = relationship("Activity", back_populates="actor")
    custom_views = relationship("CustomView", back_populates="owner")
    saved_filters = relationship("SavedFilter", back_populates="user")
    project_updates = relationship("ProjectUpdate", back_populates="author")
    created_invite_codes = relationship("InviteCode", back_populates="created_by")
    
    @property
    def full_name(self) -> str:
        """Get full name from first_name and last_name"""
        return f"{self.first_name} {self.last_name}"
