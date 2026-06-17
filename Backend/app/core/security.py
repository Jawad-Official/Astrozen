import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings


def get_signing_key() -> str:
    """Return the key to use for signing JWT tokens."""
    if settings.ALGORITHM == "RS256":
        if settings.JWT_PRIVATE_KEY:
            return settings.JWT_PRIVATE_KEY
        return settings.SECRET_KEY
    return settings.SECRET_KEY


def get_verifying_key() -> str:
    """Return the key to use for verifying JWT tokens."""
    if settings.ALGORITHM == "RS256":
        if settings.JWT_PUBLIC_KEY:
            return settings.JWT_PUBLIC_KEY
        return settings.SECRET_KEY
    return settings.SECRET_KEY


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash using bcrypt directly"""
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt directly"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        get_signing_key(),
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(
            token,
            get_verifying_key(),
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except JWTError:
        return None
