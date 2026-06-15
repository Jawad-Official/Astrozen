import uuid
from sqlalchemy import Column, String, DateTime, Date, Enum as SQLEnum, UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.time import utc_now
import enum
from app.core.database import Base


class CycleStatus(str, enum.Enum):
    UPCOMING = "upcoming"
    ACTIVE = "active"
    COMPLETED = "completed"


class Cycle(Base):
    __tablename__ = "cycles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(SQLEnum(CycleStatus), nullable=False, default=CycleStatus.UPCOMING)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    issues = relationship("Issue", back_populates="cycle")
