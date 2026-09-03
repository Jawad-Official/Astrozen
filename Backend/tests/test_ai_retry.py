"""A transient upstream overload must be retried, not turned into a 500.

Gemini sheds load with HTTP 503 UNAVAILABLE - "This model is currently
experiencing high demand. Spikes in demand are usually temporary. Please
try again later." Nothing retried, and the blanket handlers relabelled it
"AI Issue Generation Failed: Error code: 503 ..." behind an HTTP 500, so
the provider's own advice to retry never reached anyone and the failure
looked like a bug in the project.
"""
import pytest
from fastapi import HTTPException

from app.services import ai_service as ai_module
from app.services.ai_service import AIService

# Captured verbatim from the production failure.
GEMINI_OVERLOADED = (
    "Error code: 503 - [{'error': {'code': 503, 'message': 'This model is "
    "currently experiencing high demand. Spikes in demand are usually "
    "temporary. Please try again later.', 'status': 'UNAVAILABLE'}}]"
)
GEMINI_QUOTA = (
    "Error code: 429 - [{'error': {'code': 429, 'message': 'Quota exceeded', "
    "'status': 'RESOURCE_EXHAUSTED'}}]"
)


@pytest.fixture()
def ai(monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.settings, "GEMINI_API_KEY", "test-key-not-real")
    # No real waiting in tests.
    async def no_sleep(_seconds):
        return None

    monkeypatch.setattr(ai_module.asyncio, "sleep", no_sleep)
    return AIService()


class _Response:
    def __init__(self):
        self.choices = []


def _flaky_client(ai, monkeypatch, failures, error=GEMINI_OVERLOADED):
    """Fail `failures` times with `error`, then succeed."""
    calls = {"n": 0}

    def create(**kwargs):
        calls["n"] += 1
        if calls["n"] <= failures:
            raise RuntimeError(error)
        return _Response()

    monkeypatch.setattr(ai.client.chat.completions, "create", create)
    return calls


def test_overload_is_recognised_as_transient():
    assert AIService._is_transient_error(GEMINI_OVERLOADED) is True


def test_a_bad_key_is_not_treated_as_transient():
    """Retrying a rejected key just wastes the user's time."""
    assert AIService._is_transient_error("Please pass a valid API key") is False


@pytest.mark.asyncio
async def test_transient_overload_is_retried_and_succeeds(ai, monkeypatch):
    calls = _flaky_client(ai, monkeypatch, failures=2)

    result = await ai._call_ai("a prompt")

    assert calls["n"] == 3, "should have retried twice before succeeding"
    assert result is not None


@pytest.mark.asyncio
async def test_persistent_overload_reports_503_not_500(ai, monkeypatch):
    calls = _flaky_client(ai, monkeypatch, failures=99)

    with pytest.raises(HTTPException) as exc_info:
        await ai._call_ai("a prompt")

    assert calls["n"] == ai_module.AI_MAX_ATTEMPTS
    assert exc_info.value.status_code == 503
    detail = exc_info.value.detail.lower()
    assert "overloaded" in detail
    # Must not read as the user's fault or the project's fault.
    assert "not a problem with your project" in detail


@pytest.mark.asyncio
async def test_quota_exhaustion_reports_429(ai, monkeypatch):
    _flaky_client(ai, monkeypatch, failures=99, error=GEMINI_QUOTA)

    with pytest.raises(HTTPException) as exc_info:
        await ai._call_ai("a prompt")

    assert exc_info.value.status_code == 429


@pytest.mark.asyncio
async def test_misconfiguration_fails_fast_without_retrying(ai, monkeypatch):
    """A rejected key must not be retried three times before reporting."""
    calls = _flaky_client(ai, monkeypatch, failures=99, error="Please pass a valid API key")

    with pytest.raises(HTTPException) as exc_info:
        await ai._call_ai("a prompt")

    assert calls["n"] == 1, "a bad key should not be retried"
    assert exc_info.value.status_code == 503
    assert "GEMINI_API_KEY" in exc_info.value.detail
