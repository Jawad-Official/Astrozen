import uuid
from sqlalchemy import Column, String, Text, DateTime, Date, Enum as SQLEnum, ForeignKey, Integer, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base
from app.models.project import ResourceType


# Association table for issue labels removed


class IssueStatus(str, enum.Enum):
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"


class IssuePriority(str, enum.Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class IssueType(str, enum.Enum):
    BUG = "bug"
    TASK = "task"
    REFACTOR = "refactor"
    CHORE = "chore"
    TECH_DEBT = "technical_debt"
    INVESTIGATION = "investigation"


class TriageStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    DUPLICATE = "duplicate"


class Visibility(str, enum.Enum):
    TEAM = "team"
    ORGANIZATION = "organization"


class Issue(Base):
    __tablename__ = "issues"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identifier = Column(String, unique=True, nullable=False, index=True)  # e.g., ENG-1, DES-2
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    issue_type = Column(SQLEnum(IssueType), nullable=False, default=IssueType.TASK)
    status = Column(SQLEnum(IssueStatus), nullable=False, default=IssueStatus.BACKLOG)
    priority = Column(SQLEnum(IssuePriority), nullable=False, default=IssuePriority.NONE)
    triage_status = Column(SQLEnum(TriageStatus), nullable=True)
    
    # Organization/Team fields
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    visibility = Column(SQLEnum(Visibility), nullable=False, default=Visibility.TEAM)
    
    # Relations
    # Issue MUST belong to a Feature
    feature_id = Column(UUID(as_uuid=True), ForeignKey('features.id', ondelete='CASCADE'), nullable=False)
    milestone_id = Column(UUID(as_uuid=True), ForeignKey('milestones.id', ondelete='SET NULL'), nullable=True)
    cycle_id = Column(UUID(as_uuid=True), ForeignKey('cycles.id', ondelete='SET NULL'), nullable=True)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey('issues.id', ondelete='CASCADE'), nullable=True) # Sub-issue support
    
    estimate = Column(Integer, nullable=True)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    team = relationship("Team", back_populates="issues")
    feature = relationship("Feature", back_populates="issues")
    milestone = relationship("Milestone") # One-to-many from Milestone, so simple link here
    cycle = relationship("Cycle", back_populates="issues")
    assignee = relationship("User", back_populates="assigned_issues", foreign_keys=[assignee_id])
    comments = relationship("Comment", back_populates="issue", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="issue", cascade="all, delete-orphan")
    resources = relationship("IssueResource", back_populates="issue", cascade="all, delete-orphan")
    
    # Sub-issues relationship
    sub_issues = relationship("Issue", cascade="all, delete-orphan", back_populates="parent")
    parent = relationship("Issue", remote_side=[id], back_populates="sub_issues")


class IssueResource(Base):
    __tablename__ = "issue_resources"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    issue_id = Column(UUID(as_uuid=True), ForeignKey('issues.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    type = Column(SQLEnum(ResourceType), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    issue = relationship("Issue", back_populates="resources")