"""An unconfigured AI provider must fail loudly, not look like success.

When GEMINI_API_KEY is unset, AIService builds no client. Every AI call
used to hit `None.chat.completions.create`, and the resulting
AttributeError was swallowed by blanket `except Exception` handlers into
an empty question list - which the idea flow reads as "the idea is clear,
no clarification needed". A missing API key therefore presented as a
successful run that quietly skipped the AI, and only surfaced much later
as a 500 leaking the internal AttributeError.

These tests pin the contract: unconfigured means a clear, actionable
error at the point of use.
"""
import pytest
from fastapi import HTTPException

from app.services.ai_service import AIService


@pytest.fixture()
def unconfigured_ai(monkeypatch):
    """An AIService built with no API key, as on a machine that never set
    GEMINI_API_KEY."""
    from app.core import config

    monkeypatch.setattr(config.settings, "GEMINI_API_KEY", None)
    service = AIService()
    assert service.client is None
    return service


@pytest.mark.asyncio
async def test_call_ai_raises_actionable_error_when_unconfigured(unconfigured_ai):
    with pytest.raises(HTTPException) as exc_info:
        await unconfigured_ai._call_ai("any prompt")

    assert exc_info.value.status_code == 503
    detail = exc_info.value.detail
    # The message must name the variable to set, not leak an AttributeError.
    assert "GEMINI_API_KEY" in detail
    assert "NoneType" not in detail


@pytest.mark.asyncio
async def test_clarification_does_not_report_idea_as_clear_when_unconfigured(
    unconfigured_ai,
):
    """The dangerous case: returning [] here means "no questions needed",
    so a config failure would masquerade as a validated, clear idea."""
    with pytest.raises(HTTPException) as exc_info:
        await unconfigured_ai.generate_clarification_questions("a todo app for cats")

    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_suggest_answer_does_not_return_empty_string_when_unconfigured(
    unconfigured_ai,
):
    with pytest.raises(HTTPException) as exc_info:
        await unconfigured_ai.suggest_answer("a todo app for cats", "Who is it for?")

    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_validate_idea_does_not_leak_internal_attribute_error(unconfigured_ai):
    with pytest.raises(HTTPException) as exc_info:
        await unconfigured_ai.validate_idea("a todo app for cats", [])

    assert exc_info.value.status_code == 503
    assert "NoneType" not in exc_info.value.detail


# The exact body Gemini returns for a rejected key, captured from a live
# call to the OpenAI-compatible endpoint with a bad key. Note it is a 400
# INVALID_ARGUMENT, not the 401 the OpenRouter-era checks looked for.
GEMINI_BAD_KEY_ERROR = (
    "Error code: 400 - [{'error': {'code': 400, 'message': "
    "'Please pass a valid API key', 'status': 'INVALID_ARGUMENT'}}]"
)


@pytest.mark.parametrize(
    "message",
    [
        GEMINI_BAD_KEY_ERROR,
        "Error code: 403 - PERMISSION_DENIED",
        "API key not valid. Please pass a valid API key.",
        "API_KEY_INVALID",
        "Error code: 401 - unauthorized",
        "User not found",
    ],
)
def test_provider_auth_errors_are_recognised(message):
    assert AIService._is_auth_error(message) is True


@pytest.mark.parametrize(
    "message",
    [
        "Error code: 429 - rate limit exceeded",
        "Error code: 500 - internal error",
        "Connection timed out",
    ],
)
def test_non_auth_errors_are_not_misreported_as_key_problems(message):
    assert AIService._is_auth_error(message) is False


# The shape Gemini returns for a model name the key cannot reach. This was
# the actual production failure: a rejected MODEL_NAME was indistinguishable
# from any other server error, so /validate just returned a bare 500.
GEMINI_BAD_MODEL_ERROR = (
    "Error code: 404 - [{'error': {'code': 404, 'message': "
    "'models/gemini-2.5-flash is not found for API version v1beta, or is not "
    "supported for generateContent.', 'status': 'NOT_FOUND'}}]"
)


def test_rejected_model_name_is_recognised():
    assert AIService._is_model_error(GEMINI_BAD_MODEL_ERROR) is True


def test_rejected_model_name_reports_the_name_and_the_variable_to_change(
    unconfigured_ai,
):
    """The message has to name both the model that was rejected and the
    setting that controls it - that is the whole difference from a 500."""
    unconfigured_ai.model = "models/gemini-2.5-flash"

    with pytest.raises(HTTPException) as exc_info:
        unconfigured_ai._raise_if_misconfigured(GEMINI_BAD_MODEL_ERROR)

    assert exc_info.value.status_code == 503
    assert "models/gemini-2.5-flash" in exc_info.value.detail
    assert "MODEL_NAME" in exc_info.value.detail


def test_rejected_key_is_reported_as_a_key_problem_not_a_model_problem(
    unconfigured_ai,
):
    with pytest.raises(HTTPException) as exc_info:
        unconfigured_ai._raise_if_misconfigured(GEMINI_BAD_KEY_ERROR)

    assert exc_info.value.status_code == 503
    assert "GEMINI_API_KEY" in exc_info.value.detail


@pytest.mark.parametrize(
    "message",
    [
        "Error code: 429 - rate limit exceeded",
        "Error code: 503 - the model is overloaded",
        "Connection timed out",
    ],
)
def test_transient_failures_are_left_alone(unconfigured_ai, message):
    """A quota or overload error is not a misconfiguration - it must fall
    through to the caller's own handling rather than be relabelled as a
    settings problem the operator cannot act on."""
    assert unconfigured_ai._raise_if_misconfigured(message) is None
