"""Tests for the AI pipeline's error-handling paths fixed in Phase 3 of the
audit remediation: malformed/legacy asset content must surface as an
explicit parse failure instead of silently looking like "no data", and a
model response that isn't valid JSON must not crash the request - it must
be logged and degrade to a safe, well-defined value.

Covers:
- `_parse_asset_json` / `AssetParseError` (app/api/v1/ai/_shared.py)
- `AIClient.parse_json` (app/services/ai_client.py) - the JSON repair path
- `AIService.generate_clarification_questions` against a mocked model
  client: success, malformed JSON, and empty-response paths
- idea -> project conversion (app/api/v1/ai/conversion.py), including the
  malformed-kanban-asset path that must not abort the whole conversion
"""
import json
import uuid
from types import SimpleNamespace

import pytest

from app.api.v1.ai._shared import AssetParseError, _parse_asset_json
from app.services.ai_client import AIClient
from app.services.ai_service import AIService
from app.core.security import create_access_token
from app.models.organization import Organization
from app.models.team_model import Team
from app.models.user import User
from app.models.project_idea import ProjectIdea, ValidationReport, ProjectAsset
from app.models.enums import IdeaStatus, AssetType


# --------------------------------------------------------------------------
# _parse_asset_json / AssetParseError
# --------------------------------------------------------------------------


def test_parse_asset_json_accepts_valid_json():
    assert _parse_asset_json('[{"title": "A"}]', asset_id="a1") == [{"title": "A"}]


def test_parse_asset_json_falls_back_to_python_literal():
    """Legacy rows were written with str() instead of json.dumps() - a
    single-quoted Python-repr string that isn't valid JSON but is a valid
    Python literal."""
    legacy_content = "[{'title': 'Legacy issue', 'status': 'todo'}]"
    result = _parse_asset_json(legacy_content, asset_id="legacy-1")
    assert result == [{"title": "Legacy issue", "status": "todo"}]


def test_parse_asset_json_raises_on_total_garbage():
    """Content that is neither JSON nor a Python literal must raise, not
    silently return an empty/default value - the caller needs to know
    parsing failed so it can surface `kanban_parse_error: true` instead of
    presenting "no data yet"."""
    with pytest.raises(AssetParseError):
        _parse_asset_json("not json and not a python literal {{{", asset_id="bad-1")


# --------------------------------------------------------------------------
# AIClient.parse_json
# --------------------------------------------------------------------------


def test_ai_client_parse_json_success():
    client = AIClient.__new__(AIClient)  # skip __init__'s API-key setup
    assert client.parse_json('{"questions": ["a", "b"]}') == {"questions": ["a", "b"]}


def test_ai_client_parse_json_repairs_truncated_json():
    client = AIClient.__new__(AIClient)
    # Missing closing brace/bracket - the kind of truncation a
    # token-limited model response produces.
    truncated = '{"questions": ["a", "b"'
    result = client.parse_json(truncated)
    assert result == {"questions": ["a", "b"]}


def test_ai_client_parse_json_raises_when_unrecoverable():
    client = AIClient.__new__(AIClient)
    with pytest.raises(json.JSONDecodeError):
        client.parse_json("this is not json at all, no braces")


def test_ai_client_parse_json_returns_none_on_empty_content():
    client = AIClient.__new__(AIClient)
    assert client.parse_json("") is None
    assert client.parse_json(None) is None


# --------------------------------------------------------------------------
# AIService.generate_clarification_questions against a mocked model client
# --------------------------------------------------------------------------


def _fake_completion(content: str):
    """Build a minimal stand-in for the OpenAI SDK's chat completion
    response shape (`response.choices[0].message.content`)."""
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
    )


class _FakeChatCompletions:
    def __init__(self, content: str):
        self._content = content

    def create(self, **kwargs):
        return _fake_completion(self._content)


class _FakeOpenAIClient:
    def __init__(self, content: str):
        self.chat = SimpleNamespace(completions=_FakeChatCompletions(content))


@pytest.fixture()
def configured_ai_service(monkeypatch):
    """An AIService wired to a fake OpenAI-compatible client whose response
    content is set per-test via `set_response`."""
    service = AIService()
    state = {"content": ""}

    def set_response(content: str):
        state["content"] = content
        service._client.client = _FakeOpenAIClient(content)

    set_response("")
    service._client._response_cache = {}
    return service, set_response


@pytest.mark.asyncio
async def test_generate_clarification_questions_success(configured_ai_service):
    service, set_response = configured_ai_service
    set_response(json.dumps({"questions": ["What is the target market?", "Who pays for this?"]}))

    result = await service.generate_clarification_questions("a marketplace for widgets")

    assert result == ["What is the target market?", "Who pays for this?"]


@pytest.mark.asyncio
async def test_generate_clarification_questions_malformed_json_degrades_safely(
    configured_ai_service, caplog
):
    """A response that isn't valid JSON must not crash the request and must
    not be silently swallowed - it degrades to [] and is logged."""
    service, set_response = configured_ai_service
    set_response("this is definitely not json output from the model")

    result = await service.generate_clarification_questions("a marketplace for widgets")

    assert result == []


@pytest.mark.asyncio
async def test_generate_clarification_questions_empty_response_degrades_safely(
    configured_ai_service,
):
    service, set_response = configured_ai_service
    set_response("")

    result = await service.generate_clarification_questions("a marketplace for widgets")

    assert result == []


# --------------------------------------------------------------------------
# Idea -> Project conversion
# --------------------------------------------------------------------------


def _make_validated_idea(db_session, *, with_kanban_content=None):
    org = Organization(name="ConvertOrg")
    db_session.add(org)
    db_session.flush()
    team = Team(organization_id=org.id, identifier="CVT", name="Convert Team")
    db_session.add(team)
    db_session.flush()
    admin = User(
        email="convert_admin@example.com", first_name="Convert", last_name="Admin",
        role="admin", is_active=True, organization_id=org.id, hashed_password="x",
    )
    db_session.add(admin)
    db_session.flush()

    idea = ProjectIdea(
        user_id=admin.id,
        raw_input="A marketplace for vintage cameras",
        refined_description="A curated marketplace for vintage cameras",
        status=IdeaStatus.VALIDATED,
    )
    db_session.add(idea)
    db_session.flush()

    report = ValidationReport(
        project_idea_id=idea.id,
        market_feasibility={"score": 80},
        improvements=[],
        core_features=[
            {"name": "Listings", "description": "Browse camera listings"},
            {"name": "Checkout", "description": "Buy a camera"},
        ],
        tech_stack={"backend": "FastAPI"},
        pricing_model={"tiers": []},
    )
    db_session.add(report)

    if with_kanban_content is not None:
        asset = ProjectAsset(
            project_idea_id=idea.id,
            asset_type=AssetType.DIAGRAM_KANBAN,
            content=with_kanban_content,
        )
        db_session.add(asset)

    db_session.commit()
    return idea, team, admin


def _token_for(user) -> str:
    return create_access_token(data={"sub": str(user.id)})


@pytest.fixture(autouse=True)
def _stub_project_md_generation(monkeypatch):
    """convert_to_project best-effort generates project.md afterwards - that
    touches Drive/R2, which these tests must not do."""
    from app.api.v1.ai import conversion

    async def _noop(*args, **kwargs):
        return None

    monkeypatch.setattr(conversion.project_md_service, "save_project_md", _noop)


def test_convert_idea_to_project_creates_project_and_features(client, db_session):
    idea, team, admin = _make_validated_idea(
        db_session,
        with_kanban_content=json.dumps(
            [{"title": "Set up listings page"}, {"title": "Wire up checkout"}]
        ),
    )

    resp = client.post(
        f"/api/v1/ai/idea/{idea.id}/convert",
        params={"team_id": str(team.id)},
        headers={"Authorization": f"Bearer {_token_for(admin)}"},
    )
    assert resp.status_code == 200, resp.text
    project_id = resp.json()["project_id"]
    assert project_id

    from app.models.feature import Feature
    from app.models.issue import Issue

    features = db_session.query(Feature).filter(Feature.project_id == uuid.UUID(project_id)).all()
    assert {f.name for f in features} == {"Listings", "Checkout"}

    issues = db_session.query(Issue).filter(Issue.team_id == team.id).all()
    assert {i.title for i in issues} == {"Set up listings page", "Wire up checkout"}

    db_session.refresh(idea)
    assert idea.status == IdeaStatus.COMPLETED
    assert str(idea.project_id) == project_id


def test_convert_idea_to_project_survives_malformed_kanban_asset(client, db_session):
    """A malformed kanban asset must not abort the whole conversion - the
    project and features still get created, issue creation is just
    skipped and logged (see the try/except around _parse_asset_json in
    conversion.py)."""
    idea, team, admin = _make_validated_idea(
        db_session, with_kanban_content="not json and not a python literal {{{"
    )

    resp = client.post(
        f"/api/v1/ai/idea/{idea.id}/convert",
        params={"team_id": str(team.id)},
        headers={"Authorization": f"Bearer {_token_for(admin)}"},
    )
    assert resp.status_code == 200, resp.text

    from app.models.feature import Feature

    project_id = resp.json()["project_id"]
    features = db_session.query(Feature).filter(Feature.project_id == uuid.UUID(project_id)).all()
    assert {f.name for f in features} == {"Listings", "Checkout"}


def test_convert_idea_requires_validation(client, db_session):
    org = Organization(name="UnvalidatedOrg")
    db_session.add(org)
    db_session.flush()
    team = Team(organization_id=org.id, identifier="UVO", name="Unvalidated Team")
    db_session.add(team)
    db_session.flush()
    admin = User(
        email="unvalidated_admin@example.com", first_name="Un", last_name="Validated",
        role="admin", is_active=True, organization_id=org.id, hashed_password="x",
    )
    db_session.add(admin)
    db_session.flush()

    idea = ProjectIdea(user_id=admin.id, raw_input="An idea with no validation report yet")
    db_session.add(idea)
    db_session.commit()

    resp = client.post(
        f"/api/v1/ai/idea/{idea.id}/convert",
        params={"team_id": str(team.id)},
        headers={"Authorization": f"Bearer {_token_for(admin)}"},
    )
    assert resp.status_code == 400, resp.text
