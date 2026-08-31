from cryptography.fernet import Fernet
import base64
import hashlib
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

_fernet: Fernet | None = None


def _get_fernet() -> Fernet | None:
    """Lazily initialize Fernet cipher from ENCRYPTION_KEY."""
    global _fernet
    if _fernet is not None:
        return _fernet

    key = settings.ENCRYPTION_KEY
    if not key:
        logger.warning("ENCRYPTION_KEY not set — OAuth tokens will be stored in plaintext")
        return None

    # Derive a valid Fernet key (32 url-safe base64 bytes) from any string
    if len(key) != 44 or not key.endswith("="):
        digest = hashlib.sha256(key.encode("utf-8")).digest()
        key = base64.urlsafe_b64encode(digest)

    try:
        _fernet = Fernet(key)
    except Exception as e:
        logger.error(f"Failed to initialize Fernet: {e}")
        return None

    return _fernet


def encrypt_token(plaintext: str | None) -> str | None:
    """Encrypt a token string. Returns None if input is None, or if
    encryption isn't configured (ENCRYPTION_KEY unset) - callers must
    treat a None return as "don't store this token", not "store it
    unencrypted anyway". Real Google OAuth credentials at rest in
    plaintext is a Medium-severity finding on its own (see
    SECURITY_FINDINGS.md SEC-10) - failing closed here means a missing
    ENCRYPTION_KEY costs the (currently unused - see BUG_FINDINGS.md
    BUG-7) captured token, not a plaintext secret in the database.
    """
    if plaintext is None:
        return None
    f = _get_fernet()
    if f is None:
        return None
    return f.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_token(ciphertext: str | None) -> str | None:
    """Decrypt a token string. Returns None if input is None."""
    if ciphertext is None:
        return None
    f = _get_fernet()
    if f is None:
        return ciphertext
    try:
        return f.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except Exception as e:
        logger.error(f"Failed to decrypt token: {e}")
        return None
