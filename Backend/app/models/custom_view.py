import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    JSON,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.models.enums import ViewType, ViewVisibility, ViewLayout


class View(Base):
    __tablename__ = "views"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    icon = Column(String, nullable=False)
    type = Column(SQLEnum(ViewType), nullable=False)
    owner_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    visibility = Column(
        SQLEnum(ViewVisibility), nullable=False, default=ViewVisibility.PERSONAL
    )
    filter_config = Column(JSON, nullable=False)
    layout = Column(SQLEnum(ViewLayout), nullable=False, default=ViewLayout.LIST)
    view_subtype = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    owner = relationship("User", back_populates="views")

    __table_args__ = (
        Index("idx_views_owner_id", "owner_id"),
        Index("idx_views_type", "type"),
    )
