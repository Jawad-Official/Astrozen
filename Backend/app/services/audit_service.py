import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

logger = logging.getLogger("audit")


def log_event(
    event_type: str,
    user_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    success: bool = True,
    detail: Optional[str] = None,
):
    """Log a security-relevant event to the audit log."""
    timestamp = datetime.now(timezone.utc).isoformat()
    message = (
        f"[AUDIT] {timestamp}"
        f" event={event_type}"
        f" user={user_id or 'anonymous'}"
        f" resource={resource_type or 'none'}/{resource_id or 'none'}"
        f" success={success}"
        f" ip={ip_address or 'unknown'}"
    )
    if detail:
        message += f" detail={detail}"

    if success:
        logger.info(message)
    else:
        logger.warning(message)


# Event type constants
LOGIN_SUCCESS = "login_success"
LOGIN_FAILURE = "login_failure"
REGISTER = "register"
LOGOUT = "logout"
PASSWORD_CHANGE = "password_change"
ROLE_CHANGE = "role_change"
PERMISSION_DENIED = "permission_denied"
DATA_CREATE = "data_create"
DATA_UPDATE = "data_update"
DATA_DELETE = "data_delete"
OAUTH_LOGIN = "oauth_login"
OAUTH_FAILURE = "oauth_failure"
RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
