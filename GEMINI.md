# Astrozen Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-06

## Active Technologies
- Python 3.11 (Backend), TypeScript 5+ (Frontend) + FastAPI, SQLAlchemy, Pydantic v2, Boto3 (R2), OpenAI SDK, React, Mermaid.js (001-ai-idea-validator)
- PostgreSQL (Metadata), Cloudflare R2 (Document Artifacts) (001-ai-idea-validator)



## Project Structure

```text
src/
tests/
```

## Commands

# Add commands for 

## Code Style

General: Follow standard conventions

## Recent Changes
- 001-ai-idea-validator: Implemented a 4-phase AI project validation and planning workflow.
  - Phase 1: Interactive Clarification (AI asks up to 7 targeted questions).
  - Phase 2: Technical & Market Validation (6 pillars, improvement suggestions, tech stack, pricing).
  - Phase 3: Visual Blueprinting (Mermaid.js User Flow, Auto-Kanban ticket generation).
  - Phase 4: Sequential Documentation Generation (PRD, App Flow, Tech Stack, Frontend/Backend Guidelines, Implementation Plan) stored in Cloudflare R2 with AI chat refinement.
  - Conversion: Ability to convert a validated blueprint into real Projects, Features, and Issues in the system.
- Backend: Added Python 3.11 + FastAPI, SQLAlchemy, Boto3 (R2), OpenAI SDK.
- Frontend: Added React, Mermaid.js, ai.service, and AIGeneratorPage.



<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
