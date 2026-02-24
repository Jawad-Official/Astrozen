import uuid
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Date,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    Table,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.models.enums import (
    IssueStatus,
    IssuePriority,
    IssueType,
    TriageStatus,
    Visibility,
)


class Issue(Base):
    __tablename__ = "issues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identifier = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    issue_type = Column(SQLEnum(IssueType), nullable=False, default=IssueType.TASK)
    status = Column(SQLEnum(IssueStatus), nullable=False, default=IssueStatus.BACKLOG)
    priority = Column(
        SQLEnum(IssuePriority), nullable=False, default=IssuePriority.NONE
    )
    triage_status = Column(SQLEnum(TriageStatus), nullable=True)

    team_id = Column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    visibility = Column(SQLEnum(Visibility), nullable=False, default=Visibility.TEAM)

    feature_id = Column(
        UUID(as_uuid=True),
        ForeignKey("features.id", ondelete="CASCADE"),
        nullable=False,
    )
    milestone_id = Column(
        UUID(as_uuid=True),
        ForeignKey("milestones.id", ondelete="SET NULL"),
        nullable=True,
    )
    assignee_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    parent_id = Column(
        UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=True
    )
    blueprint_node_id = Column(String, nullable=True, index=True)

    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    team = relationship("Team", back_populates="issues")
    feature = relationship("Feature", back_populates="issues")
    milestone = relationship("Milestone")
    assignee = relationship(
        "User", back_populates="assigned_issues", foreign_keys=[assignee_id]
    )
    comments = relationship(
        "Comment", back_populates="issue", cascade="all, delete-orphan"
    )
    activities = relationship(
        "Activity", back_populates="issue", cascade="all, delete-orphan"
    )
    resources = relationship(
        "Resource",
        primaryjoin="and_(Resource.target_id==Issue.id, Resource.target_type=='issue')",
        viewonly=True,
    )

    sub_issues = relationship(
        "Issue", cascade="all, delete-orphan", back_populates="parent"
    )
    parent = relationship("Issue", remote_side=[id], back_populates="sub_issues")

    __table_args__ = (
        Index("idx_issues_team_id", "team_id"),
        Index("idx_issues_feature_id", "feature_id"),
        Index("idx_issues_status", "status"),
        Index("idx_issues_assignee_id", "assignee_id"),
        Index("idx_issues_identifier", "identifier"),
    )
