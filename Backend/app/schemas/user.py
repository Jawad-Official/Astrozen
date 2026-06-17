from pydantic import BaseModel, EmailStr, UUID4, model_validator, field_validator, ConfigDict
from typing import Optional
from datetime import datetime
import re


# Base schemas
class UserBase(BaseModel):
    id: Optional[UUID4] = None
    email: EmailStr
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    role: str = "member"


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @model_validator(mode="after")
    def normalize_names(self):
        if self.first_name and self.last_name:
            return self

        if self.full_name:
            parts = self.full_name.strip().split(maxsplit=1)
            self.first_name = parts[0]
            self.last_name = parts[1] if len(parts) > 1 else ""

        if not self.first_name:
            self.first_name = self.email.split("@", 1)[0]
        if self.last_name is None:
            self.last_name = ""

        return self


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


class UserInDB(UserBase):
    id: UUID4
    first_name: str
    last_name: str
    is_active: bool
    organization_id: Optional[UUID4] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


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
