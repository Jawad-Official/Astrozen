import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.models.enums import ActivityType


class Activity(Base):
    __tablename__ = "activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    issue_id = Column(
        UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False
    )
    type = Column(
        SQLEnum(ActivityType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    actor_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    issue = relationship("Issue", back_populates="activities")
    actor = relationship("User", back_populates="activities")

    __table_args__ = (
        Index("idx_activities_issue_id", "issue_id"),
        Index("idx_activities_actor_id", "actor_id"),
        Index("idx_activities_created_at", "created_at"),
    )
