from pydantic import BaseModel, UUID4, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


class TeamBase(BaseModel):
    name: str
    # Matches the Team.identifier column (String(3)) - the DB migration
    # that last touched this column set it to VARCHAR(3), and
    # Team.generate_identifier() still truncates to 3 chars, so 3 is the
    # real constraint; this was previously unenforced at the API layer,
    # which meant a 4-5 char identifier passed validation here but raised
    # a raw DB error on PostgreSQL (never on SQLite, which doesn't enforce
    # VARCHAR length) - see BUG_FINDINGS.md BUG-1.
    identifier: Optional[str] = Field(default=None, max_length=3)


class TeamCreate(TeamBase):
    organization_id: Optional[UUID4] = None
    leader_ids: Optional[List[UUID4]] = [] # Changed from leader_id
    member_ids: Optional[List[UUID4]] = []
    import_from_team_id: Optional[UUID4] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    identifier: Optional[str] = Field(default=None, max_length=3)
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
    
    model_config = ConfigDict(from_attributes=True)
