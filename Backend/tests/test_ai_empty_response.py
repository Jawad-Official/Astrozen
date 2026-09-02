"""An empty model response must not become an unhandled crash.

_parse_json returns None when the model hands back empty content (a
safety block, or a thinking-capable model that spends its whole
max_tokens budget on reasoning and emits no message content). The
methods that `return self._parse_json(...)` therefore returned None, and
their callers went straight on to `blueprint_data.get(...)`.

That AttributeError was never caught by anything, so it escaped past
CORSMiddleware to Starlette's ServerErrorMiddleware - which means the
500 came back with no Access-Control-Allow-Origin header at all, and the
browser reported it as a CORS failure rather than a server error. This
pins the contract: an empty response is a 502 that says so.
"""
import pytest
from fastapi import HTTPException

from app.services.ai_service import AIService


class _Message:
    def __init__(self, content):
        self.content = content


class _Choice:
    def __init__(self, content):
        self.message = _Message(content)


class _Response:
    def __init__(self, content):
        self.choices = [_Choice(content)]


@pytest.fixture()
def ai(monkeypatch):
    """A service with a stubbed client, so no network call is made."""
    from app.core import config

    monkeypatch.setattr(config.settings, "GEMINI_API_KEY", "test-key-not-real")
    return AIService()


def _stub_ai_response(monkeypatch, service, content):
    async def fake_call_ai(prompt, **kwargs):
        return _Response(content)

    monkeypatch.setattr(service, "_call_ai", fake_call_ai)


@pytest.mark.asyncio
@pytest.mark.parametrize("content", ["", None])
async def test_blueprint_raises_instead_of_returning_none(ai, monkeypatch, content):
    """Returning None here is what crashed the route: the caller
    immediately does blueprint_data.get(...)."""
    _stub_ai_response(monkeypatch, ai, content)

    with pytest.raises(HTTPException) as exc_info:
        await ai.generate_blueprint({"idea": "a todo app", "features": [], "tech_stack": []})

    assert exc_info.value.status_code == 502
    assert "empty" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_blueprint_still_returns_a_normal_payload(ai, monkeypatch):
    """The guard must not disturb the success path."""
    _stub_ai_response(
        monkeypatch,
        ai,
        '{"user_flow_mermaid": "flowchart TD", "nodes": [], "edges": [], '
        '"kanban_features": []}',
    )

    result = await ai.generate_blueprint(
        {"idea": "a todo app", "features": [], "tech_stack": []}
    )

    assert result["user_flow_mermaid"] == "flowchart TD"


@pytest.mark.asyncio
async def test_non_dict_response_is_also_rejected(ai, monkeypatch):
    """A bare JSON list parses fine but has no .get(), so it would crash
    the caller the same way None does."""
    _stub_ai_response(monkeypatch, ai, "[1, 2, 3]")

    with pytest.raises(HTTPException) as exc_info:
        await ai.generate_blueprint(
            {"idea": "a todo app", "features": [], "tech_stack": []}
        )

    assert exc_info.value.status_code == 502
