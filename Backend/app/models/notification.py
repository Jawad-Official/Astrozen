import uuid
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class NotificationType(str, enum.Enum):
    # Issues
    ISSUE_ASSIGNED = "ISSUE_ASSIGNED"
    ISSUE_STATUS_CHANGED = "ISSUE_STATUS_CHANGED"
    ISSUE_COMMENT = "ISSUE_COMMENT"
    ISSUE_MENTION = "ISSUE_MENTION"
    ISSUE_PRIORITY_UPGRADE = "ISSUE_PRIORITY_UPGRADE"
    
    # AI Validator
    AI_VALIDATION_READY = "AI_VALIDATION_READY"
    AI_BLUEPRINT_READY = "AI_BLUEPRINT_READY"
    AI_DOC_GENERATED = "AI_DOC_GENERATED"
    AI_ISSUES_CREATED = "AI_ISSUES_CREATED"
    
    # Team/Org
    TEAM_INVITE = "TEAM_INVITE"
    TEAM_MEMBER_JOINED = "TEAM_MEMBER_JOINED"
    ORG_ROLE_CHANGED = "ORG_ROLE_CHANGED"

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    type = Column(SQLEnum(NotificationType), nullable=False)
    
    # Polymorphic target linking (e.g. Issue ID, Project ID)
    target_id = Column(String, nullable=True)
    target_type = Column(String, nullable=True) # "issue", "project", "ai_idea", etc.
    
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    recipient = relationship("User", foreign_keys=[recipient_id], backref="notifications")
    actor = relationship("User", foreign_keys=[actor_id])

    class Config:
        orm_mode = True
