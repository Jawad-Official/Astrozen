import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, func, Text, UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Document(Base):
    """Represents a document that has a Google Drive file and an R2 markdown copy.

    Fields:
    - id: primary key (UUID)
    - project_id: foreign key to a Project
    - drive_file_id: Google Drive file identifier
    - r2_path: path in Cloudflare R2 where the markdown version is stored
    - title: human readable title
    - created_at / updated_at timestamps
    """

    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    idea_id = Column(UUID(as_uuid=True), ForeignKey("project_ideas.id", ondelete="CASCADE"), nullable=True)
    drive_file_id = Column(String, nullable=False, unique=True)
    r2_path = Column(String, nullable=False, unique=True)
    title = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="documents")
    idea = relationship("ProjectIdea")
