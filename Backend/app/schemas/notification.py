from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.notification import NotificationType

class NotificationBase(BaseModel):
    recipient_id: UUID
    actor_id: Optional[UUID] = None
    type: NotificationType
    target_id: Optional[str] = None
    target_type: Optional[str] = None
    title: str
    content: str

class NotificationCreate(NotificationBase):
    pass

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None

class Notification(NotificationBase):
    id: UUID
    is_read: bool
    created_at: datetime
    
    actor_name: Optional[str] = None # Helper field for frontend

    class Config:
        from_attributes = True

class NotificationList(BaseModel):
    notifications: List[Notification]
    unread_count: int
