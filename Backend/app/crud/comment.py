from typing import List
from sqlalchemy.orm import Session, joinedload
from app.crud.base import CRUDBase
from app.models.comment import Comment
from app.schemas.comment import CommentCreate
from uuid import UUID


class CRUDComment(CRUDBase[Comment, CommentCreate, dict]):
    """CRUD operations for Comment model"""
    
    def get_by_issue(self, db: Session, *, issue_id: UUID) -> List[Comment]:
        """Get all comments for an issue"""
        return db.query(Comment).options(joinedload(Comment.author)).filter(Comment.issue_id == issue_id).all()
    
    def create_for_issue(
        self,
        db: Session,
        *,
        obj_in: CommentCreate,
        issue_id: UUID,
        author_id: UUID
    ) -> Comment:
        """Create a comment for an issue"""
        db_obj = Comment(
            issue_id=issue_id,
            author_id=author_id,
            content=obj_in.content
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


comment = CRUDComment(Comment)
