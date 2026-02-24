import uuid
import enum
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Boolean,
    Enum as SQLEnum,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.models.enums import NotificationType


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    actor_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    type = Column(SQLEnum(NotificationType), nullable=False)

    target_id = Column(String, nullable=True)
    target_type = Column(String, nullable=True)

    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)

    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    recipient = relationship(
        "User", foreign_keys=[recipient_id], back_populates="notifications"
    )
    actor = relationship("User", foreign_keys=[actor_id])

    __table_args__ = (
        Index("idx_notifications_recipient_id", "recipient_id"),
        Index("idx_notifications_is_read", "is_read"),
    )

    class Config:
        orm_mode = True
