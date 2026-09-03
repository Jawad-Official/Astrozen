"""A crash must still answer with CORS headers.

Starlette's outermost ServerErrorMiddleware sits *above* CORSMiddleware,
so an exception allowed to reach it produces a 500 that never passes back
through the CORS layer. The browser sees a response with no
Access-Control-Allow-Origin and reports a CORS policy violation, hiding
the actual server error - which is precisely how an AttributeError in the
blueprint route presented as a CORS failure from the Netlify frontend.
"""
import pytest
from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.main import app

ORIGIN = "http://localhost:5173"

_probe = APIRouter()


@_probe.get("/__crash_probe")
async def _crash_probe():
    raise RuntimeError("boom - simulates an unhandled route error")


app.include_router(_probe)


@pytest.fixture()
def raw_client():
    # raise_server_exceptions=False so the middleware's response is
    # returned rather than the exception being re-raised into the test.
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_unhandled_error_still_carries_cors_header(raw_client):
    resp = raw_client.get("/__crash_probe", headers={"Origin": ORIGIN})

    assert resp.status_code == 500
    # The header is the whole point: without it the browser reports a CORS
    # error and the 500 is invisible to the frontend.
    assert resp.headers.get("access-control-allow-origin") == ORIGIN


def test_unhandled_error_returns_json_not_a_bare_page(raw_client):
    resp = raw_client.get("/__crash_probe", headers={"Origin": ORIGIN})

    assert resp.json() == {"detail": "Internal Server Error"}


def test_unhandled_error_does_not_leak_the_exception_text(raw_client):
    resp = raw_client.get("/__crash_probe", headers={"Origin": ORIGIN})

    assert "boom" not in resp.text
    assert "RuntimeError" not in resp.text
