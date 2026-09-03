"""Coverage for the manual document upload/sync route
(POST /ai/idea/{idea_id}/doc/upload). In the test environment neither R2
nor the Gemini-backed doc analyzer are configured, so both
`storage_service` and `doc_analyzer_service` degrade to their documented
"disabled" no-op behavior - these tests exercise exactly that path, plus
the ownership and validation checks around it.
"""
import io

from app.core.security import create_access_token
from app.models.organization import Organization
from app.models.project_idea import ProjectIdea
from app.models.user import User
from app.models.enums import AssetType


def _token_for(user) -> str:
    return create_access_token(data={"sub": str(user.id)})


def _make_idea_owner(db_session, email="doc_upload_owner@example.com"):
    org = Organization(name="DocUploadOrg")
    db_session.add(org)
    db_session.flush()
    owner = User(
        email=email, first_name="Doc", last_name="Owner",
        role="member", is_active=True, organization_id=org.id, hashed_password="x",
    )
    db_session.add(owner)
    db_session.flush()
    idea = ProjectIdea(user_id=owner.id, raw_input="An idea with docs")
    db_session.add(idea)
    db_session.commit()
    return owner, idea


def test_upload_markdown_document_saves_asset(client, db_session):
    owner, idea = _make_idea_owner(db_session)
    headers = {"Authorization": f"Bearer {_token_for(owner)}"}

    file_content = b"# Product Requirements\n\nThis is the PRD content."
    resp = client.post(
        f"/api/v1/ai/idea/{idea.id}/doc/upload",
        params={"doc_type": AssetType.PRD.value},
        files={"file": ("PRD.md", io.BytesIO(file_content), "text/markdown")},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["content"] == "# Product Requirements\n\nThis is the PRD content."
    assert body["asset_type"] == "PRD"

    from app.crud import crud_project_idea

    asset = crud_project_idea.project_idea.get_asset(
        db_session, idea_id=str(idea.id), asset_type=AssetType.PRD
    )
    assert asset is not None
    assert asset.content == "# Product Requirements\n\nThis is the PRD content."


def test_upload_rejects_empty_file(client, db_session):
    owner, idea = _make_idea_owner(db_session, email="doc_upload_empty@example.com")
    headers = {"Authorization": f"Bearer {_token_for(owner)}"}

    resp = client.post(
        f"/api/v1/ai/idea/{idea.id}/doc/upload",
        params={"doc_type": AssetType.PRD.value},
        files={"file": ("empty.md", io.BytesIO(b"   \n  "), "text/markdown")},
        headers=headers,
    )
    assert resp.status_code == 400, resp.text


def test_upload_rejects_unsupported_file_type(client, db_session):
    owner, idea = _make_idea_owner(db_session, email="doc_upload_badtype@example.com")
    headers = {"Authorization": f"Bearer {_token_for(owner)}"}

    resp = client.post(
        f"/api/v1/ai/idea/{idea.id}/doc/upload",
        params={"doc_type": AssetType.PRD.value},
        files={"file": ("notes.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
        headers=headers,
    )
    assert resp.status_code == 400, resp.text


def test_upload_document_requires_idea_ownership(client, db_session):
    owner, idea = _make_idea_owner(db_session, email="doc_upload_owner2@example.com")
    other = User(
        email="doc_upload_other@example.com", first_name="Other", last_name="User",
        role="member", is_active=True, organization_id=owner.organization_id, hashed_password="x",
    )
    db_session.add(other)
    db_session.commit()
    headers = {"Authorization": f"Bearer {_token_for(other)}"}

    resp = client.post(
        f"/api/v1/ai/idea/{idea.id}/doc/upload",
        params={"doc_type": AssetType.PRD.value},
        files={"file": ("PRD.md", io.BytesIO(b"# Some content"), "text/markdown")},
        headers=headers,
    )
    assert resp.status_code == 404, resp.text
