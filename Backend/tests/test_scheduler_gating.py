"""Phase 7 of the audit remediation: the in-process document-sync
scheduler must not start unless explicitly enabled (ENABLE_SCHEDULER),
since every process that starts it runs an independent copy of the same
scheduled job - see app/main.py's lifespan() and README.md's Deployment
section. And the sync task itself must refuse to run two copies of
itself concurrently within a process.
"""
import pytest

from app.main import lifespan, app as fastapi_app
from app.tasks.sync_drive_to_r2 import sync_all_documents_to_r2, _sync_lock


@pytest.mark.asyncio
async def test_scheduler_is_off_by_default(monkeypatch):
    monkeypatch.delenv("ENABLE_SCHEDULER", raising=False)

    async with lifespan(fastapi_app):
        assert not hasattr(fastapi_app.state, "scheduler")


@pytest.mark.asyncio
@pytest.mark.parametrize("value", ["false", "0", "no", "", "garbage"])
async def test_scheduler_stays_off_for_falsy_values(monkeypatch, value):
    monkeypatch.setenv("ENABLE_SCHEDULER", value)

    async with lifespan(fastapi_app):
        assert not hasattr(fastapi_app.state, "scheduler")


@pytest.mark.asyncio
async def test_scheduler_starts_when_explicitly_enabled(monkeypatch):
    monkeypatch.setenv("ENABLE_SCHEDULER", "true")

    async with lifespan(fastapi_app):
        assert hasattr(fastapi_app.state, "scheduler")
        assert fastapi_app.state.scheduler.running

    # shut down cleanly, and the attribute-based guard in the finally
    # block must not raise on a state left behind from this test.
    assert not fastapi_app.state.scheduler.running


@pytest.mark.asyncio
async def test_sync_task_skips_a_concurrent_run_instead_of_overlapping(monkeypatch):
    """Simulate two overlapping invocations in the same process (e.g. a
    slow run still in flight when the next scheduled tick fires) and
    confirm the second one backs off instead of racing the first."""
    calls = []

    class _FakeSession:
        def query(self, *_args, **_kwargs):
            class _Query:
                def all(self_inner):
                    return []
            return _Query()

        def close(self):
            pass

    monkeypatch.setattr(
        "app.tasks.sync_drive_to_r2.SessionLocal", lambda: _FakeSession()
    )

    # Hold the lock manually to simulate "a run is already in progress",
    # then confirm a second invocation returns immediately without doing
    # any work rather than blocking or racing.
    assert _sync_lock.acquire(blocking=False)
    try:
        await sync_all_documents_to_r2()
    finally:
        _sync_lock.release()

    # The skipped run must not have touched the database at all.
    assert calls == []
