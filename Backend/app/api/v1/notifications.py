from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, List
from app.api import deps
from app.schemas import notification as schemas
from app.services.notification_service import notification_service
from app.models.user import User
from uuid import UUID

router = APIRouter()

@router.get("", response_model=schemas.NotificationList)
def get_notifications(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    limit: int = 50
) -> Any:
    """Retrieve current user's notifications."""
    notifications = notification_service.get_user_notifications(db, current_user.id, limit)
    unread_count = notification_service.get_unread_count(db, current_user.id)
    
    # Enrich with actor names
    enriched = []
    for n in notifications:
        n_dict = schemas.Notification.model_validate(n).model_dump()
        if n.actor:
            n_dict["actor_name"] = f"{n.actor.first_name} {n.actor.last_name}".strip() or n.actor.email
        enriched.append(n_dict)
        
    return {"notifications": enriched, "unread_count": unread_count}

@router.patch("/{notification_id}/read", response_model=schemas.Notification)
def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Mark a notification as read."""
    notification = notification_service.mark_as_read(db, notification_id, current_user.id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification

@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Mark all notifications as read."""
    count = notification_service.mark_all_as_read(db, current_user.id)
    return {"message": f"Marked {count} notifications as read", "count": count}
