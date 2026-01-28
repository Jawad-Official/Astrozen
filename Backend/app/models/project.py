import uuid
from sqlalchemy import Column, String, Text, DateTime, Date, Enum as SQLEnum, ForeignKey, Table, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref
from datetime import datetime
import enum
from app.core.database import Base


# Association tables
project_members = Table(
    'project_members',
    Base.metadata,
    Column('project_id', UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE')),
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
)

project_teams = Table(
    'project_teams',
    Base.metadata,
    Column('project_id', UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE')),
    Column('team_id', UUID(as_uuid=True), ForeignKey('teams.id', ondelete='CASCADE'))
)


class ProjectStatus(str, enum.Enum):
    BACKLOG = "backlog"
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ProjectHealth(str, enum.Enum):
    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    OFF_TRACK = "off_track"
    NO_UPDATES = "no_updates"


class ProjectPriority(str, enum.Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class Visibility(str, enum.Enum):
    TEAM = "team"
    ORGANIZATION = "organization"


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    icon = Column(String, nullable=False)
    color = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(ProjectStatus), nullable=False, default=ProjectStatus.BACKLOG)
    health = Column(SQLEnum(ProjectHealth), nullable=False, default=ProjectHealth.NO_UPDATES)
    priority = Column(SQLEnum(ProjectPriority), nullable=False, default=ProjectPriority.NONE)
    is_favorite = Column(Boolean, default=False, nullable=False)
    
    # Organization/Team fields
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    visibility = Column(SQLEnum(Visibility), nullable=False, default=Visibility.TEAM)
    
    lead_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    start_date = Column(Date, nullable=True)
    target_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    team = relationship("Team", back_populates="primary_projects", foreign_keys=[team_id])
    lead = relationship("User", back_populates="led_projects", foreign_keys=[lead_id])
    members = relationship("User", secondary=project_members, back_populates="project_memberships")
    teams = relationship("Team", secondary=project_teams, back_populates="contributing_projects")
    features = relationship("Feature", back_populates="project", cascade="all, delete-orphan")
    # Milestones removed from here, now in Feature
    updates = relationship("ProjectUpdate", back_populates="project", cascade="all, delete-orphan")
    resources = relationship("ProjectResource", back_populates="project", cascade="all, delete-orphan")


class ProjectUpdate(Base):
    __tablename__ = "project_updates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    health = Column(SQLEnum(ProjectHealth), nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="updates")
    author = relationship("User", back_populates="project_updates")
    comments = relationship("ProjectUpdateComment", back_populates="update", cascade="all, delete-orphan")
    reactions = relationship("ProjectUpdateReaction", back_populates="update", cascade="all, delete-orphan")


class ProjectUpdateComment(Base):
    __tablename__ = "project_update_comments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    update_id = Column(UUID(as_uuid=True), ForeignKey('project_updates.id', ondelete='CASCADE'), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey('project_update_comments.id', ondelete='CASCADE'), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    update = relationship("ProjectUpdate", back_populates="comments")
    author = relationship("User")
    replies = relationship("ProjectUpdateComment", backref=backref("parent", remote_side="ProjectUpdateComment.id"), cascade="all, delete-orphan")
    reactions = relationship("ProjectUpdateCommentReaction", back_populates="comment", cascade="all, delete-orphan")


class ProjectUpdateCommentReaction(Base):
    __tablename__ = "project_update_comment_reactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comment_id = Column(UUID(as_uuid=True), ForeignKey('project_update_comments.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    emoji = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    comment = relationship("ProjectUpdateComment", back_populates="reactions")
    user = relationship("User")


class ProjectUpdateReaction(Base):
    __tablename__ = "project_update_reactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    update_id = Column(UUID(as_uuid=True), ForeignKey('project_updates.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    emoji = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    update = relationship("ProjectUpdate", back_populates="reactions")
    user = relationship("User")


class ResourceType(str, enum.Enum):
    LINK = "link"
    DOCUMENT = "document"


class ProjectResource(Base):
    __tablename__ = "project_resources"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    type = Column(SQLEnum(ResourceType), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="resources")
