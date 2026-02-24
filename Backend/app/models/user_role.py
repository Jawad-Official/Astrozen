import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.models.enums import UserRoleType


class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    role = Column(SQLEnum(UserRoleType), nullable=False, default=UserRoleType.MEMBER)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="roles")
    organization = relationship("Organization", back_populates="user_roles")

    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", name="unique_user_org"),
        Index("idx_user_roles_user_id", "user_id"),
        Index("idx_user_roles_organization_id", "organization_id"),
    )
