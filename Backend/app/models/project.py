import uuid
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Date,
    Enum as SQLEnum,
    ForeignKey,
    Boolean,
    Index,
    Table,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref
from datetime import datetime
from app.core.database import Base
from app.models.enums import (
    ProjectStatus,
    ProjectHealth,
    ProjectPriority,
    Visibility,
    ResourceType,
    ReactionTargetType,
    ResourceTargetType,
)


project_members = Table(
    "project_members",
    Base.metadata,
    Column(
        "project_id", UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE")
    ),
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")),
)

project_teams = Table(
    "project_teams",
    Base.metadata,
    Column(
        "project_id", UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE")
    ),
    Column("team_id", UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE")),
)


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    icon = Column(String, nullable=False)
    color = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        SQLEnum(ProjectStatus), nullable=False, default=ProjectStatus.BACKLOG
    )
    health = Column(
        SQLEnum(ProjectHealth), nullable=False, default=ProjectHealth.NO_UPDATES
    )
    priority = Column(
        SQLEnum(ProjectPriority), nullable=False, default=ProjectPriority.NONE
    )
    is_favorite = Column(Boolean, default=False, nullable=False)

    team_id = Column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    visibility = Column(SQLEnum(Visibility), nullable=False, default=Visibility.TEAM)

    lead_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    start_date = Column(Date, nullable=True)
    target_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    team = relationship(
        "Team", back_populates="primary_projects", foreign_keys=[team_id]
    )
    lead = relationship("User", back_populates="led_projects", foreign_keys=[lead_id])
    members = relationship(
        "User", secondary=project_members, back_populates="project_memberships"
    )
    teams = relationship(
        "Team", secondary=project_teams, back_populates="contributing_projects"
    )
    features = relationship(
        "Feature", back_populates="project", cascade="all, delete-orphan"
    )
    updates = relationship(
        "ProjectUpdate", back_populates="project", cascade="all, delete-orphan"
    )
    resources = relationship(
        "Resource",
        back_populates="project",
        cascade="all, delete-orphan",
        primaryjoin="and_(Project.id==Resource.target_id, Resource.target_type=='project')",
        viewonly=True,
    )

    __table_args__ = (
        Index("idx_projects_team_id", "team_id"),
        Index("idx_projects_status", "status"),
        Index("idx_projects_health", "health"),
        Index("idx_projects_created_at", "created_at"),
    )


class ProjectUpdate(Base):
    __tablename__ = "project_updates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    health = Column(SQLEnum(ProjectHealth), nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="updates")
    author = relationship("User", back_populates="project_updates")
    comments = relationship(
        "ProjectUpdateComment", back_populates="update", cascade="all, delete-orphan"
    )
    reactions = relationship(
        "Reaction",
        back_populates="update",
        primaryjoin="and_(ProjectUpdate.id==Reaction.target_id, Reaction.target_type=='project_update')",
        viewonly=True,
    )

    __table_args__ = (
        Index("idx_project_updates_project_id", "project_id"),
        Index("idx_project_updates_created_at", "created_at"),
    )


class ProjectUpdateComment(Base):
    __tablename__ = "project_update_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    update_id = Column(
        UUID(as_uuid=True),
        ForeignKey("project_updates.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    parent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("project_update_comments.id", ondelete="CASCADE"),
        nullable=True,
    )
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    update = relationship("ProjectUpdate", back_populates="comments")
    author = relationship("User")
    replies = relationship(
        "ProjectUpdateComment",
        backref=backref("parent", remote_side="ProjectUpdateComment.id"),
        cascade="all, delete-orphan",
    )
    reactions = relationship(
        "Reaction",
        back_populates="comment",
        primaryjoin="and_(ProjectUpdateComment.id==Reaction.target_id, Reaction.target_type=='project_update_comment')",
        viewonly=True,
    )

    __table_args__ = (Index("idx_project_update_comments_update_id", "update_id"),)


class Resource(Base):
    __tablename__ = "resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_type = Column(SQLEnum(ResourceTargetType), nullable=False)
    target_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    type = Column(SQLEnum(ResourceType), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    project = relationship(
        "Project",
        back_populates="resources",
        primaryjoin="and_(Resource.target_id==Project.id, Resource.target_type=='project')",
        viewonly=True,
    )
    issue = relationship(
        "Issue",
        primaryjoin="and_(Resource.target_id==Issue.id, Resource.target_type=='issue')",
        viewonly=True,
    )

    __table_args__ = (Index("idx_resources_target", "target_type", "target_id"),)


class Reaction(Base):
    __tablename__ = "reactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_type = Column(SQLEnum(ReactionTargetType), nullable=False)
    target_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    emoji = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User")
    update = relationship(
        "ProjectUpdate",
        primaryjoin="and_(Reaction.target_id==ProjectUpdate.id, Reaction.target_type=='project_update')",
        viewonly=True,
    )
    comment = relationship(
        "ProjectUpdateComment",
        primaryjoin="and_(Reaction.target_id==ProjectUpdateComment.id, Reaction.target_type=='project_update_comment')",
        viewonly=True,
    )

    __table_args__ = (
        Index("idx_reactions_target", "target_type", "target_id"),
        Index("idx_reactions_user_id", "user_id"),
    )
