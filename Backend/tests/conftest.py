"""Shared pytest fixtures for the backend test suite.

Sets required environment variables before any `app.*` module is
imported (Settings() validates eagerly at import time), and wires the
FastAPI app to a fresh, isolated in-memory SQLite database per test -
never the real local dev database (Backend/.env's DATABASE_URL) and
never anything that touches a real Postgres/production instance.
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "pytest-only-secret-key-never-used-outside-tests-32chars")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
os.environ.setdefault("PROJECT_NAME", "Astrozen API")
os.environ.setdefault("VERSION", "1.0.0")
os.environ.setdefault("API_V1_PREFIX", "/api/v1")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app


@pytest.fixture()
def db_session():
    """A fresh in-memory SQLite database, isolated per test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def client(db_session):
    """A TestClient wired to the isolated db_session instead of the app's
    configured database."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    # https, not the default http://testserver - the auth_token cookie is
    # set with Secure=True (required alongside SameSite=None, see SEC-7),
    # and a Secure cookie is only round-tripped by the test client's
    # cookie jar on a request that looks like it's over TLS.
    with TestClient(app, base_url="https://testserver") as test_client:
        yield test_client
    app.dependency_overrides.clear()


def register_and_login(client: TestClient, email: str, password: str = "SecurePass123") -> str:
    """Helper: register a user and return a valid bearer token for them."""
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "first_name": "Test", "last_name": "User"},
    )
    assert resp.status_code == 201, resp.text
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]
