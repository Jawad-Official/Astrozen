"""SEC-10: encrypt_token must fail closed (never return the plaintext
token) when ENCRYPTION_KEY isn't configured - a caller that stores
whatever it returns must never end up storing a real secret unencrypted.
"""
import app.core.encryption as encryption_module


def _reset_fernet_cache():
    encryption_module._fernet = None


def test_encrypt_token_returns_none_without_encryption_key(monkeypatch):
    monkeypatch.setattr(encryption_module.settings, "ENCRYPTION_KEY", None)
    _reset_fernet_cache()
    try:
        result = encryption_module.encrypt_token("a-real-google-refresh-token")
        assert result is None
    finally:
        _reset_fernet_cache()


def test_encrypt_token_none_input_still_returns_none(monkeypatch):
    monkeypatch.setattr(encryption_module.settings, "ENCRYPTION_KEY", None)
    _reset_fernet_cache()
    try:
        assert encryption_module.encrypt_token(None) is None
    finally:
        _reset_fernet_cache()


def test_encrypt_token_round_trips_when_key_is_configured(monkeypatch):
    monkeypatch.setattr(encryption_module.settings, "ENCRYPTION_KEY", "a-test-only-encryption-key-32-chars")
    _reset_fernet_cache()
    try:
        ciphertext = encryption_module.encrypt_token("a-real-google-refresh-token")
        assert ciphertext is not None
        assert ciphertext != "a-real-google-refresh-token"
        assert encryption_module.decrypt_token(ciphertext) == "a-real-google-refresh-token"
    finally:
        _reset_fernet_cache()
