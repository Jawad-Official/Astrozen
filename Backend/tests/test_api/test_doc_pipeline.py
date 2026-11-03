"""End-to-end coverage for the AI documentation routes
(/ai/idea/{idea_id}/doc/...), with the model call mocked out.

Each test pins a bug that made the docs section unusable:
- generate 422'd because the route declared a bare list body while the
  frontend sends {"answers": [...]}
- regenerate-section 422'd because its params were read from the query
  string while the frontend sends a JSON body
- generating a doc twice 500'd (Document.r2_path is UNIQUE)
- an AI failure was saved as a COMPLETED "Error generating document" doc
- the questions route raised KeyError when only a kanban asset existed
- the upload response dropped the analysis the UI needs
"""
import io
from types import SimpleNamespace

import pytest

from app.core.security import create_access_token
from app.crud import crud_project_idea
from app.models.enums import AssetStatus, AssetType
from app.models.organization import Organization
from app.models.project_idea import ProjectAsset, ProjectIdea
from app.models.user import User
from app.services.ai_service import ai_service


def _response(content):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
    )


@pytest.fixture()
def fake_ai(monkeypatch):
    """Replace the model call. Tests push the replies they want into
    `replies`; every prompt sent is recorded in `prompts`."""
    state = SimpleNamespace(replies=[], prompts=[])

    async def _call_ai(prompt, **kwargs):
        state.prompts.append(prompt)
        reply = state.replies.pop(0) if state.replies else "# Doc\n\nBody"
        if isinstance(reply, Exception):
            raise reply
        return _response(reply)

    monkeypatch.setattr(ai_service, "client", object())
    monkeypatch.setattr(ai_service, "_call_ai", _call_ai)
    return state


def _owner_with_idea(db_session, email):
    org = Organization(name=f"Org {email}")
    db_session.add(org)
    db_session.flush()
    owner = User(
        email=email, first_name="Doc", last_name="Owner",
        role="member", is_active=True, organization_id=org.id, hashed_password="x",
    )
    db_session.add(owner)
    db_session.flush()
    idea = ProjectIdea(user_id=owner.id, raw_input="A task app for students")
    db_session.add(idea)
    db_session.commit()
    headers = {"Authorization": f"Bearer {create_access_token(data={'sub': str(owner.id)})}"}
    return owner, idea, headers


def _url(idea, suffix):
    return f"/api/v1/ai/idea/{idea.id}/doc/{suffix}"


def test_generate_accepts_answers_object_body(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "gen_obj@example.com")
    fake_ai.replies = ["```markdown\n# PRD\n\nThe plan.\n```"]

    resp = client.post(
        _url(idea, "PRD"),
        json={"answers": [{"question": "Who is it for?", "answer": "Students"}]},
        headers=headers,
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["asset_type"] == "PRD"
    assert body["status"] == "COMPLETED"
    # The ```markdown fence the model wrapped it in is stripped.
    assert body["content"] == "# PRD\n\nThe plan."
    assert "Students" in fake_ai.prompts[0]


def test_generate_accepts_empty_and_missing_body(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "gen_empty@example.com")

    assert client.post(_url(idea, "PRD"), json={}, headers=headers).status_code == 200
    assert client.post(_url(idea, "PRD"), headers=headers).status_code == 200


def test_generate_accepts_legacy_list_body(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "gen_list@example.com")
    resp = client.post(
        _url(idea, "PRD"),
        json=[{"question": "Budget?", "answer": "Low"}],
        headers=headers,
    )
    assert resp.status_code == 200, resp.text


def test_generating_same_doc_twice_does_not_500(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "gen_twice@example.com")
    fake_ai.replies = ["# PRD v1", "# PRD v2"]

    first = client.post(_url(idea, "PRD"), json={}, headers=headers)
    second = client.post(_url(idea, "PRD"), json={}, headers=headers)

    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    assert second.json()["content"] == "# PRD v2"
    count = (
        db_session.query(ProjectAsset)
        .filter(ProjectAsset.project_idea_id == idea.id, ProjectAsset.asset_type == AssetType.PRD)
        .count()
    )
    assert count == 1


def test_generate_enforces_doc_order_with_clear_message(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "gen_order@example.com")
    resp = client.post(_url(idea, "APP_FLOW"), json={}, headers=headers)
    assert resp.status_code == 400
    assert "Prd" in resp.json()["detail"] or "PRD" in resp.json()["detail"]


def test_generate_rejects_non_document_asset_types(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "gen_badtype@example.com")
    resp = client.post(_url(idea, "DIAGRAM_KANBAN"), json={}, headers=headers)
    assert resp.status_code == 400


def test_empty_ai_reply_is_an_error_not_a_saved_doc(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "gen_blank@example.com")
    fake_ai.replies = [None]

    resp = client.post(_url(idea, "PRD"), json={}, headers=headers)

    assert resp.status_code == 502
    asset = crud_project_idea.project_idea.get_asset(
        db_session, idea_id=str(idea.id), asset_type=AssetType.PRD
    )
    assert asset is None


def test_ai_exception_is_an_error_not_a_saved_doc(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "gen_raise@example.com")
    fake_ai.replies = [RuntimeError("boom")]

    resp = client.post(_url(idea, "PRD"), json={}, headers=headers)

    assert resp.status_code == 502
    assert crud_project_idea.project_idea.get_asset(
        db_session, idea_id=str(idea.id), asset_type=AssetType.PRD
    ) is None


def test_answers_are_not_piled_into_chat_history(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "gen_hist@example.com")
    answers = {"answers": [{"question": "Q?", "answer": "A"}]}
    client.post(_url(idea, "PRD"), json=answers, headers=headers)
    resp = client.post(_url(idea, "PRD"), json=answers, headers=headers)
    assert resp.json()["chat_history"] == []


def test_regenerate_section_takes_json_body(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "regen@example.com")
    fake_ai.replies = ["# PRD\n\n## Goals\nOld", "# PRD\n\n## Goals\nNew"]
    client.post(_url(idea, "PRD"), json={}, headers=headers)

    resp = client.post(
        _url(idea, "PRD/regenerate-section"),
        json={"section_content": "## Goals\nOld", "user_message": "Make it sharper"},
        headers=headers,
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["content"].endswith("New")


def test_chat_updates_doc_sends_full_content_and_records_history(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "chat@example.com")
    long_doc = "# PRD\n\n" + ("word " * 3000) + "\n\nTAIL-MARKER"
    fake_ai.replies = [long_doc, "# PRD\n\nEdited"]
    client.post(_url(idea, "PRD"), json={}, headers=headers)

    resp = client.post(_url(idea, "PRD/chat"), json={"message": "Shorten it"}, headers=headers)

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["content"] == "# PRD\n\nEdited"
    assert [m["role"] for m in body["chat_history"]] == ["user", "assistant"]
    # The old code cut the doc at 6000 chars, so the model never saw the end.
    assert "TAIL-MARKER" in fake_ai.prompts[-1]


def test_chat_on_missing_doc_is_404(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "chat404@example.com")
    resp = client.post(_url(idea, "PRD/chat"), json={"message": "Hi"}, headers=headers)
    assert resp.status_code == 404


def test_questions_with_only_kanban_asset_does_not_crash(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "q_kanban@example.com")
    db_session.add(ProjectAsset(
        project_idea_id=idea.id, asset_type=AssetType.PRD,
        content="# PRD", status=AssetStatus.COMPLETED,
    ))
    db_session.add(ProjectAsset(
        project_idea_id=idea.id, asset_type=AssetType.DIAGRAM_KANBAN,
        content='[{"title": "Login"}]', status=AssetStatus.COMPLETED,
    ))
    db_session.commit()
    fake_ai.replies = ['{"has_questions": true, "questions": ["Which screens?", {"question": ""}]}']

    resp = client.get(_url(idea, "APP_FLOW/questions"), headers=headers)

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["has_questions"] is True
    assert [q["question"] for q in body["questions"]] == ["Which screens?"]
    assert body["questions"][0]["id"] == "q1"


def test_questions_with_garbage_reply_means_no_questions(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "q_garbage@example.com")
    fake_ai.replies = ["[]"]
    resp = client.get(_url(idea, "PRD/questions"), headers=headers)
    assert resp.status_code == 200
    assert resp.json() == {"has_questions": False, "questions": []}


def test_upload_returns_analysis_and_details_keep_it(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "upload_analysis@example.com")
    fake_ai.replies = [
        '{"is_valid": true, "quality_score": 45, "missing_sections": ["Metrics"],'
        ' "issues": ["Vague"], "suggestions": ["Add KPIs"], "ai_can_enhance": true,'
        ' "enhancement_preview": "Adds KPIs", "summary": "Needs work"}'
    ]

    resp = client.post(
        f"/api/v1/ai/idea/{idea.id}/doc/upload",
        params={"doc_type": "PRD"},
        files={"file": ("my prd.txt", io.BytesIO(b"# PRD\n\nSome text"), "text/plain")},
        headers=headers,
    )

    assert resp.status_code == 200, resp.text
    analysis = resp.json()["analysis"]
    assert analysis["quality_score"] == 45
    assert analysis["severity"] == "warning"

    details = client.get(f"/api/v1/ai/idea/{idea.id}", headers=headers).json()
    prd = next(a for a in details["assets"] if a["asset_type"] == "PRD")
    assert prd["analysis_result"]["quality_score"] == 45


def test_download_docx(client, db_session, fake_ai):
    _, idea, headers = _owner_with_idea(db_session, "download@example.com")
    fake_ai.replies = ["# PRD\n\n| a | b |\n|---|---|\n| 1 | 2 |"]
    client.post(_url(idea, "PRD"), json={}, headers=headers)

    resp = client.get(_url(idea, "PRD/download"), headers=headers)

    assert resp.status_code == 200, resp.text
    assert resp.content[:2] == b"PK"  # .docx is a zip
    assert 'filename="Prd.docx"' in resp.headers["content-disposition"]
