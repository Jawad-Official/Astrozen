from typing import Optional, List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.user_role import UserRole, UserRoleType
from app.schemas.user_role import UserRoleCreate, UserRoleUpdate
from uuid import UUID


class CRUDUserRole(CRUDBase[UserRole, UserRoleCreate, UserRoleUpdate]):
    """CRUD operations for UserRole model"""
    
    def get_by_user_org(
        self, db: Session, *, user_id: UUID, organization_id: UUID
    ) -> Optional[UserRole]:
        """Get user role in organization"""
        return db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.organization_id == organization_id
        ).first()
        
    def get_org_members(
        self, db: Session, *, organization_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[UserRole]:
        """Get all members with roles in organization"""
        return db.query(UserRole).filter(
            UserRole.organization_id == organization_id
        ).offset(skip).limit(limit).all()


user_role = CRUDUserRole(UserRole)
