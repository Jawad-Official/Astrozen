from typing import Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.invite_code import InviteCode
from app.schemas.invite_code import InviteCodeCreate, InviteCodeUpdate
from uuid import UUID


class CRUDInviteCode(CRUDBase[InviteCode, InviteCodeCreate, InviteCodeUpdate]):
    """CRUD operations for InviteCode model"""
    
    def get_by_code(self, db: Session, *, code: str) -> Optional[InviteCode]:
        """Get invite code by string"""
        return db.query(InviteCode).filter(InviteCode.code == code).first()
        
    def get_active_by_org(self, db: Session, *, organization_id: UUID) -> Optional[InviteCode]:
        """Get active invite code for organization"""
        # Usually organizations have one active generic invite code, or many specific ones
        # This implementation gets the most recent active one
        return db.query(InviteCode).filter(
            InviteCode.organization_id == organization_id,
            InviteCode.is_active == True
        ).order_by(InviteCode.created_at.desc()).first()


invite_code = CRUDInviteCode(InviteCode)
