from contextlib import asynccontextmanager
import logging

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
    from apscheduler.schedulers.background import BackgroundScheduler
    from app.tasks.sync_drive_to_r2 import run_sync_task

    scheduler = BackgroundScheduler()
    scheduler.add_job(run_sync_task, 'interval', minutes=15, id='doc_sync_job')
    scheduler.start()
    app.state.scheduler = scheduler
    logger.info("Started background scheduler for document sync")
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
    """Health check endpoint"""
    return {"status": "healthy"}
