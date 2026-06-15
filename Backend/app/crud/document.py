from sqlalchemy.orm import Session
from uuid import uuid4
from app.models.document import Document

class CRUDDocument:
    """Simple CRUD operations for Document model."""

    def create(self, db: Session, *, drive_file_id: str, r2_path: str, title: str, project_id: str | None = None) -> Document:
        doc = Document(
            id=str(uuid4()),
            project_id=project_id,
            drive_file_id=drive_file_id,
            r2_path=r2_path,
            title=title,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    def get(self, db: Session, doc_id: str) -> Document | None:
        return db.query(Document).filter(Document.id == doc_id).first()

    def get_by_drive_id(self, db: Session, drive_file_id: str) -> Document | None:
        return db.query(Document).filter(Document.drive_file_id == drive_file_id).first()

    def delete(self, db: Session, doc: Document) -> None:
        db.delete(doc)
        db.commit()

document = CRUDDocument()
