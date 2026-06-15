from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationType
from app.models.user import User
from typing import Optional, List
import uuid

class NotificationService:
    def notify_user(
        self,
        db: Session,
        recipient_id: uuid.UUID,
        type: NotificationType,
        title: str,
        content: str,
        actor_id: Optional[uuid.UUID] = None,
        target_id: Optional[str] = None,
        target_type: Optional[str] = None
    ) -> Notification:
        """Create a notification for a user."""
        notification = Notification(
            recipient_id=recipient_id,
            actor_id=actor_id,
            type=type,
            title=title,
            content=content,
            target_id=target_id,
            target_type=target_type
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    def get_user_notifications(self, db: Session, user_id: uuid.UUID, limit: int = 50) -> List[Notification]:
        """Get recent notifications for a user."""
        return db.query(Notification).filter(
            Notification.recipient_id == user_id
        ).order_by(Notification.created_at.desc()).limit(limit).all()

    def get_unread_count(self, db: Session, user_id: uuid.UUID) -> int:
        """Get count of unread notifications."""
        return db.query(Notification).filter(
            Notification.recipient_id == user_id,
            Notification.is_read == False
        ).count()

    def mark_as_read(self, db: Session, notification_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Notification]:
        """Mark a single notification as read."""
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.recipient_id == user_id
        ).first()
        if notification:
            notification.is_read = True
            db.commit()
            db.refresh(notification)
        return notification

    def mark_all_as_read(self, db: Session, user_id: uuid.UUID) -> int:
        """Mark all notifications for a user as read."""
        count = db.query(Notification).filter(
            Notification.recipient_id == user_id,
            Notification.is_read == False
        ).update({Notification.is_read: True})
        db.commit()
        return count

notification_service = NotificationService()
