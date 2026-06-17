import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index, UUID
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    job_title = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="member", nullable=False)
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    deleted_at = Column(DateTime, nullable=True)

    # OAuth provider (e.g. "google", "github") - None means password-based auth
    oauth_provider = Column(String, nullable=True)

    # Google OAuth Tokens (encrypted at rest when ENCRYPTION_KEY is set)
    google_access_token = Column(String, nullable=True)
    google_refresh_token = Column(String, nullable=True)
    google_token_expires_at = Column(DateTime, nullable=True)

    organization = relationship(
        "Organization", back_populates="members", foreign_keys=[organization_id]
    )
    created_organizations = relationship(
        "Organization",
        back_populates="created_by",
        foreign_keys="Organization.created_by_id",
    )
    roles = relationship(
        "UserRole", back_populates="user", cascade="all, delete-orphan"
    )
    teams = relationship("Team", secondary="team_members", back_populates="members")
    led_teams = relationship("Team", secondary="team_leaders", back_populates="leaders")
    assigned_issues = relationship(
        "Issue", back_populates="assignee", foreign_keys="Issue.assignee_id"
    )
    led_projects = relationship(
        "Project", back_populates="lead", foreign_keys="Project.lead_id"
    )
    project_memberships = relationship(
        "Project", secondary="project_members", back_populates="members"
    )
    comments = relationship("Comment", back_populates="author")
    activities = relationship("Activity", back_populates="actor")
    views = relationship("View", back_populates="owner")
    project_updates = relationship("ProjectUpdate", back_populates="author")
    created_invite_codes = relationship("InviteCode", back_populates="created_by")
    notifications = relationship(
        "Notification",
        foreign_keys="Notification.recipient_id",
        back_populates="recipient",
    )

    __table_args__ = (
        Index("idx_users_organization_id", "organization_id"),
        Index("idx_users_email", "email"),
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
