"""Aggregates the AI idea-pipeline routers into a single router mounted at
/ai by app.api.v1 - split out of the former monolithic ai_projects.py into
cohesive submodules (ideas, validation, blueprint, documents, conversion).
Every route path and method is unchanged.
"""
from fastapi import APIRouter

from app.api.v1.ai import ideas, validation, blueprint, documents, conversion

router = APIRouter()

router.include_router(ideas.router)
router.include_router(validation.router)
router.include_router(blueprint.router)
router.include_router(documents.router)
router.include_router(conversion.router)
