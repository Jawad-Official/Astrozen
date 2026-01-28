import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class UserRoleType(str, enum.Enum):
    ADMIN = "admin"
    LEADER = "leader"
    MEMBER = "member"


class UserRole(Base):
    __tablename__ = "user_roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    role = Column(SQLEnum(UserRoleType), nullable=False, default=UserRoleType.MEMBER)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="roles")
    organization = relationship("Organization", back_populates="user_roles")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'organization_id', name='unique_user_org'),
    )
