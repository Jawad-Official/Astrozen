from pydantic import BaseModel, UUID4
from typing import Optional, List
from datetime import datetime


class OrganizationBase(BaseModel):
    name: str


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(OrganizationBase):
    pass


class Organization(OrganizationBase):
    id: UUID4
    created_by_id: Optional[UUID4] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
