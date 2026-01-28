from typing import Optional, List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationUpdate
from uuid import UUID


class CRUDOrganization(CRUDBase[Organization, OrganizationCreate, OrganizationUpdate]):
    """CRUD operations for Organization model"""
    
    def get_by_creator(self, db: Session, *, user_id: UUID) -> List[Organization]:
        """Get organizations created by user"""
        return db.query(Organization).filter(Organization.created_by_id == user_id).all()


organization = CRUDOrganization(Organization)
