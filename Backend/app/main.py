from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import api_router
from app.core.database import Base, engine

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json"
)

# Configure CORS
# Starlette/FastAPI CORS middleware does not allow allow_origins=["*"] with allow_credentials=True
# We need to provide specific origins if we want to support credentials
cors_origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
if "*" in cors_origins:
    cors_origins = [
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
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
