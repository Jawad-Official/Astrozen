from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.rate_limit import limiter
from app.services.audit_service import log_event, RATE_LIMIT_EXCEEDED
from app.api.v1 import api_router
from app.core.database import Base, engine, ensure_runtime_schema

logger = logging.getLogger(__name__)

# Tables are managed by Alembic migrations. `ensure_runtime_schema` handles
# SQLite-specific column additions that Alembic batch mode may miss.
ensure_runtime_schema()


# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # The scheduler is in-process (APScheduler's BackgroundScheduler), not
    # a separate worker - every process that imports this app and runs
    # this lifespan would start its own copy. With more than one uvicorn/
    # gunicorn worker, or more than one deployed instance, that means the
    # doc-sync job fires once per process on the same 15-minute interval,
    # all racing to sync the same documents. Gated behind ENABLE_SCHEDULER
    # (default off) so scaling to multiple workers/instances is a
    # conscious choice, not a silent multiplication of this job - see
    # render.yaml and README for the operational trade-off this implies.
    scheduler_enabled = os.getenv("ENABLE_SCHEDULER", "false").strip().lower() in ("1", "true", "yes")

    if scheduler_enabled:
        from apscheduler.schedulers.background import BackgroundScheduler
        from app.tasks.sync_drive_to_r2 import run_sync_task

        scheduler = BackgroundScheduler()
        scheduler.add_job(run_sync_task, 'interval', minutes=15, id='doc_sync_job')
        scheduler.start()
        app.state.scheduler = scheduler
        logger.info("Started background scheduler for document sync")
    else:
        logger.info(
            "Background scheduler disabled (ENABLE_SCHEDULER is not set). "
            "Document sync will not run automatically on this process."
        )

    try:
        yield
    finally:
        if hasattr(app.state, "scheduler"):
            app.state.scheduler.shutdown()
            logger.info("Shutdown background scheduler")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json" if settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan,
)

# Rate limiting setup
app.state.limiter = limiter

# Custom rate limit handler with audit logging
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    log_event(
        RATE_LIMIT_EXCEEDED,
        success=False,
        ip_address=request.client.host if request.client else None,
        detail=f"{request.method} {request.url.path}",
    )
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Rate limit exceeded. Please wait before making more requests."},
    )

app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

cors_origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]


@app.middleware("http")
async def unhandled_error_to_json(request: Request, call_next):
    """Convert a crash into a normal 500 response, inside the CORS layer.

    Starlette applies user middleware in reverse order of registration, so
    this - registered before CORSMiddleware - ends up *inside* it. That
    placement is the entire point: an exception left to escape to the
    outermost ServerErrorMiddleware produces a 500 that never passes back
    through CORSMiddleware, so it carries no Access-Control-Allow-Origin
    header. The browser then reports a CORS policy violation and the real
    error is invisible from the frontend, which is how an AttributeError
    in the blueprint route showed up as a CORS failure.

    HTTPException never reaches here (FastAPI's ExceptionMiddleware sits
    further in and has already turned it into a response), so this only
    catches genuine crashes.
    """
    try:
        return await call_next(request)
    except Exception:
        logging.getLogger(__name__).exception(
            "Unhandled error on %s %s", request.method, request.url.path
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal Server Error"},
        )


app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SecurityHeadersMiddleware)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Astrozen API",
        "docs": "/docs",
        "version": settings.VERSION
    }


@app.get("/health")
def health_check():
    """Health check endpoint.

    `ai_configured` reports only whether the server booted with a
    GEMINI_API_KEY present - never the key, and never whether the
    provider accepted it. It exists because a missing key and a rejected
    key used to be indistinguishable from the outside (both surfaced as a
    generic 500 on /ai/idea/{id}/validate), which made a deployed
    instance impossible to triage without shell access to its logs.
    """
    return {
        "status": "healthy",
        "ai_configured": bool(settings.GEMINI_API_KEY),
    }
