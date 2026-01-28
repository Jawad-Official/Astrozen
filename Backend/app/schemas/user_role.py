from pydantic import BaseModel, UUID4
from app.models.user_role import UserRoleType


class UserRoleBase(BaseModel):
    role: UserRoleType


class UserRoleCreate(UserRoleBase):
    user_id: UUID4
    organization_id: UUID4


class UserRoleUpdate(UserRoleBase):
    pass


class UserRole(UserRoleBase):
    id: UUID4
    user_id: UUID4
    organization_id: UUID4
    
    class Config:
        from_attributes = True
