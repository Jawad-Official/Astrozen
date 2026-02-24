import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Table,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


team_members = Table(
    "team_members",
    Base.metadata,
    Column("team_id", UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE")),
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")),
    Column("joined_at", DateTime, default=datetime.utcnow),
    UniqueConstraint("team_id", "user_id", name="unique_team_member"),
)


team_leaders = Table(
    "team_leaders",
    Base.metadata,
    Column(
        "team_id",
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "user_id",
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("assigned_at", DateTime, default=datetime.utcnow),
)


class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String, nullable=False)
    identifier = Column(String(5), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="teams")
    leaders = relationship("User", secondary=team_leaders, back_populates="led_teams")
    members = relationship("User", secondary=team_members, back_populates="teams")
    issues = relationship("Issue", back_populates="team")
    primary_projects = relationship("Project", back_populates="team")
    contributing_projects = relationship(
        "Project", secondary="project_teams", back_populates="teams"
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "identifier", name="unique_org_team_identifier"
        ),
        Index("idx_teams_organization_id", "organization_id"),
    )

    @staticmethod
    def generate_identifier(name: str) -> str:
        return name[:3].upper().replace(" ", "")
