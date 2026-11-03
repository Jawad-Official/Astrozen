"""Every AI request is sent with a deliberate token budget.

On Gemini's OpenAI-compatible endpoint, thinking tokens count against
max_tokens and are billed as output, so each call carries a per-task
max_tokens and reasoning_effort (AI_TASK_BUDGETS). These tests pin that
wiring, the fallback for a model that rejects reasoning_effort, and that a
spent quota fails fast instead of being retried.
"""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services import ai_service as ai_module
from app.services.ai_service import AI_TASK_BUDGETS, AIService, compact_json, summarize_blueprint


@pytest.fixture()
def ai(monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.settings, "GEMINI_API_KEY", "test-key-not-real")
    monkeypatch.setattr(config.settings, "AI_REASONING_EFFORT_ENABLED", True)

    async def no_sleep(_seconds):
        return None

    monkeypatch.setattr(ai_module.asyncio, "sleep", no_sleep)
    return AIService()


def _recording_client(ai, monkeypatch, errors=()):
    calls = []
    pending = list(errors)

    def create(**kwargs):
        calls.append(kwargs)
        if pending:
            raise RuntimeError(pending.pop(0))
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="ok"))])

    monkeypatch.setattr(ai.client.chat.completions, "create", create)
    return calls


@pytest.mark.asyncio
async def test_task_budget_sets_max_tokens_and_reasoning_effort(ai, monkeypatch):
    calls = _recording_client(ai, monkeypatch)
    await ai._call_ai("prompt", task="doc_questions")
    max_tokens, effort = AI_TASK_BUDGETS["doc_questions"]
    assert calls[0]["max_tokens"] == max_tokens
    assert calls[0]["reasoning_effort"] == effort


@pytest.mark.asyncio
async def test_explicit_kwargs_win_over_the_budget(ai, monkeypatch):
    calls = _recording_client(ai, monkeypatch)
    await ai._call_ai("prompt", task="doc_questions", max_tokens=123)
    assert calls[0]["max_tokens"] == 123


@pytest.mark.asyncio
async def test_reasoning_effort_can_be_turned_off(ai, monkeypatch):
    from app.core import config

    monkeypatch.setattr(config.settings, "AI_REASONING_EFFORT_ENABLED", False)
    calls = _recording_client(ai, monkeypatch)
    await ai._call_ai("prompt", task="blueprint")
    assert "reasoning_effort" not in calls[0]


@pytest.mark.asyncio
async def test_model_rejecting_reasoning_effort_is_resent_without_it(ai, monkeypatch):
    calls = _recording_client(
        ai, monkeypatch,
        errors=["Error code: 400 - Invalid JSON payload: unknown field reasoning_effort"],
    )
    resp = await ai._call_ai("prompt", task="blueprint")
    assert resp.choices[0].message.content == "ok"
    assert "reasoning_effort" in calls[0]
    assert "reasoning_effort" not in calls[1]

    # And it stays off for later requests in this process.
    await ai._call_ai("another prompt", task="blueprint")
    assert "reasoning_effort" not in calls[2]


@pytest.mark.asyncio
async def test_quota_error_is_not_retried(ai, monkeypatch):
    calls = _recording_client(
        ai, monkeypatch,
        errors=["Error code: 429 - Quota exceeded for metric requests per day. RESOURCE_EXHAUSTED"] * 3,
    )
    with pytest.raises(HTTPException) as exc_info:
        await ai._call_ai("prompt", task="doc_write")
    assert exc_info.value.status_code == 429
    assert "daily" in exc_info.value.detail
    assert len(calls) == 1


def test_every_ai_call_names_a_budgeted_task():
    """No call site may send an unsized request: each _call_ai(...) call in
    the AI services passes a task that exists in AI_TASK_BUDGETS."""
    import inspect
    import re

    from app.services import doc_analyzer_service

    for module in (ai_module, doc_analyzer_service):
        source = inspect.getsource(module)
        calls = re.findall(r"_call_ai\(\s*prompt,(.*?)\)", source, flags=re.S)
        assert calls, f"no _call_ai calls found in {module.__name__}"
        for args in calls:
            match = re.search(r'task="([a-z_]+)"', args)
            assert match, f"_call_ai call without task= in {module.__name__}: {args!r}"
            assert match.group(1) in AI_TASK_BUDGETS


def test_compact_json_has_no_padding():
    assert compact_json({"a": [1, 2], "b": {"c": "d"}}) == '{"a":[1,2],"b":{"c":"d"}}'


def test_blueprint_summary_keeps_names_only():
    blueprint = {
        "user_flow": '{"nodes":[{"id":"1","label":"Login","type":"entry","x":10,"y":20}],"edges":[]}',
        "kanban": [{"id": "k1", "title": "Sign up", "description": "long text " * 50}],
    }
    summary = summarize_blueprint(blueprint)
    assert "Login (entry)" in summary
    assert "Sign up" in summary
    assert "long text" not in summary
