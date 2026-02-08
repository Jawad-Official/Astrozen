# Implementation Plan: AI Idea Validator and Generator

**Branch**: `001-ai-idea-validator` | **Date**: 2026-02-06 | **Spec**: [specs/001-ai-idea-validator/spec.md](spec.md)
**Input**: Feature specification from `specs/001-ai-idea-validator/spec.md`

## Summary
This feature implements an AI-driven workflow for validating project ideas and generating technical assets through a structured 4-phase process:
1. **INPUT PHASE**: Interactive Q&A with a progress bar.
2. **VALIDATION & ANALYSIS**: 6-pillar report generation.
3. **VISUAL BLUEPRINT**: User Flow diagram, Kanban tickets, and progress dashboard.
4. **SEQUENTIAL DOC GENERATION**: PRD -> App Flow -> Tech Stack -> Frontend Guide -> Backend Schema -> Implementation Plan. Each doc leverages previous outputs as context, supports user skipping (AI auto-suggests), and integrates directly into the project page.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5+ (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Pydantic v2, Boto3 (R2), OpenAI SDK (via OpenRouter), React, Mermaid.js
**Storage**: PostgreSQL (Metadata/History), Cloudflare R2 (Document Artifacts)
**AI Model**: `gpt-oss-120b:nitro` (OpenRouter)
**Sequential Workflow**: The system manages a state machine for document generation. Doc N depends on Docs 1..N-1.
**Skip Logic**: If a user skips a question, the `AiService` is prompted to infer the best technical decision based on the existing project context.

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-idea-validator/
├── plan.md              # This file
├── research.md          # Technology decisions
├── data-model.md        # Database schema
├── quickstart.md        # Usage guide
├── contracts/           # API specifications
│   └── api.yaml         # OpenAPI definition
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
Backend/
├── app/
│   ├── api/v1/endpoints/
│   │   ├── ai.py            # Q&A and validation endpoints
│   │   ├── ideas.py         # State management
│   │   └── assets.py        # Individual doc (re)generation
│   ├── services/
│   │   ├── ai_service.py    # OpenAI/OpenRouter wrapper
│   │   ├── idea_validator.py # Phase 1 & 2 logic
│   │   ├── blueprint_gen.py  # Phase 3 logic
│   │   └── doc_generator.py  # Phase 4 (Sequential loop)
```

Frontend/
├── src/
│   ├── components/
│   │   ├── ai/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── ValidationReport.tsx
│   │   │   └── MermaidRenderer.tsx
│   ├── pages/
│   │   ├── ideas/
│   │   │   ├── NewIdeaPage.tsx
│   │   │   └── IdeaDetailsPage.tsx
│   ├── services/
│   │   └── ai-api.ts
│   └── types/
│       └── ai.ts
```

**Structure Decision**: Standard "Feature Module" pattern within existing Backend/Frontend directories.