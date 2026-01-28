from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class InviteCodeBase(BaseModel):
    pass


class InviteCodeCreate(InviteCodeBase):
    organization_id: UUID4
    created_by_id: UUID4
    expires_in_hours: int = 24
    max_uses: Optional[int] = None


class InviteCodeUpdate(InviteCodeBase):
    is_active: Optional[bool] = None


class InviteCode(InviteCodeBase):
    id: UUID4
    code: str
    organization_id: UUID4
    expires_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True
