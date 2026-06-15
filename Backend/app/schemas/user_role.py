from pydantic import BaseModel, UUID4, ConfigDict
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
    
    model_config = ConfigDict(from_attributes=True)
