from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import api_router
from app.core.database import Base, engine, ensure_runtime_schema

logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)
ensure_runtime_schema()


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
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

cors_origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
if "*" in cors_origins:
    cors_origins = [
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "https://astrozen.up.railway.app"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
