import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import secrets
from app.core.database import Base


class InviteCode(Base):
    __tablename__ = "invite_codes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    code = Column(String(8), unique=True, nullable=False, index=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_count = Column(Integer, default=0)
    max_uses = Column(Integer, nullable=True)  # NULL = unlimited
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization", back_populates="invite_codes")
    created_by = relationship("User", back_populates="created_invite_codes")
    
    @staticmethod
    def generate_code() -> str:
        """Generate a random 8-character invite code"""
        return secrets.token_urlsafe(6)[:8].upper()
    
    @staticmethod
    def create_with_expiry(hours: int = 24) -> datetime:
        """Create expiry datetime (default 24 hours from now)"""
        return datetime.utcnow() + timedelta(hours=hours)
    
    def is_valid(self) -> bool:
        """Check if code is still valid"""
        if not self.is_active:
            return False
        if datetime.utcnow() > self.expires_at:
            return False
        if self.max_uses is not None and self.used_count >= self.max_uses:
            return False
        return True
