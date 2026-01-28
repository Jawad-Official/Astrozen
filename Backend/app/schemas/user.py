from pydantic import BaseModel, EmailStr, UUID4
from typing import Optional
from datetime import datetime


# Base schemas
class UserBase(BaseModel):
    id: Optional[UUID4] = None
    email: EmailStr
    first_name: str
    last_name: str
    job_title: Optional[str] = None
    role: str = "member"


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


class UserInDB(UserBase):
    id: UUID4
    is_active: bool
    organization_id: Optional[UUID4] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class User(UserInDB):
    pass


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[UUID4] = None


class LoginRequest(BaseModel):
    username: str  # Can be username or email
    password: str
