from pydantic import BaseModel, UUID4
from typing import Optional, List
from datetime import datetime


class TeamBase(BaseModel):
    name: str
    identifier: Optional[str] = None


class TeamCreate(TeamBase):
    organization_id: Optional[UUID4] = None
    leader_ids: Optional[List[UUID4]] = [] # Changed from leader_id
    member_ids: Optional[List[UUID4]] = []
    import_from_team_id: Optional[UUID4] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    identifier: Optional[str] = None
    leader_ids: Optional[List[UUID4]] = None
    member_ids: Optional[List[UUID4]] = None


from app.schemas.user import User

class Team(TeamBase):
    id: UUID4
    organization_id: UUID4
    identifier: str
    leaders: List[User] = []
    members: List[User] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
