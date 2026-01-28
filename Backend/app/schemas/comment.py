from pydantic import BaseModel, UUID4
from datetime import datetime
from app.schemas.user import UserBase


class CommentBase(BaseModel):
    content: str


class CommentCreate(CommentBase):
    pass


class Comment(CommentBase):
    id: UUID4
    issue_id: UUID4
    author_id: UUID4
    author: UserBase | None = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Activity schema
class Activity(BaseModel):
    id: UUID4
    issue_id: UUID4
    type: str
    actor_id: UUID4
    actor: UserBase | None = None
    old_value: str | None = None
    new_value: str | None = None
    created_at: datetime
    
    class Config:
        from_attributes = True
