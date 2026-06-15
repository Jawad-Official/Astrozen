import uuid
from sqlalchemy import Column, Text, DateTime, ForeignKey, Index, UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.time import utc_now
from app.core.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    issue_id = Column(
        UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False
    )
    author_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    deleted_at = Column(DateTime, nullable=True)

    issue = relationship("Issue", back_populates="comments")
    author = relationship("User", back_populates="comments")

    __table_args__ = (
        Index("idx_comments_issue_id", "issue_id"),
        Index("idx_comments_author_id", "author_id"),
    )
