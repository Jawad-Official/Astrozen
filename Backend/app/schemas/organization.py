from pydantic import BaseModel, UUID4, ConfigDict
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
    
    model_config = ConfigDict(from_attributes=True)
