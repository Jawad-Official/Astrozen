import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by = relationship("User", back_populates="created_organizations", foreign_keys=[created_by_id])
    teams = relationship("Team", back_populates="organization", cascade="all, delete-orphan")
    user_roles = relationship("UserRole", back_populates="organization", cascade="all, delete-orphan")
    invite_codes = relationship("InviteCode", back_populates="organization", cascade="all, delete-orphan")
    members = relationship("User", back_populates="organization", foreign_keys="User.organization_id")
