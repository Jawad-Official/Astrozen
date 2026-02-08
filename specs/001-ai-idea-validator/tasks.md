# Implementation Tasks - AI Idea Validator and Generator

**Feature Branch**: `001-ai-idea-validator`
**Specification**: `specs/001-ai-idea-validator/spec.md`
**Plan**: `specs/001-ai-idea-validator/plan.md`

## Phase 1: Setup & Core Refinement (Done)
- [X] T001 Install backend dependencies (boto3, openai, PyYAML)
- [X] T002 Install frontend dependencies (mermaid)
- [X] T003 Configure environment variables (R2_, OPENROUTER_)
- [X] T004 Create migrations for `project_ideas`, `validation_reports`, `project_assets`
- [X] T005 Implement `AiService` (OpenRouter) and `R2StorageProvider`

## Phase 2: Input Phase (US1)
**Goal**: Q&A discovery with progress tracking.

- [X] T006 [US1] Update `ClarificationResponse` schema to include `total_estimated_questions` and `current_question_index`
- [X] T007 [US1] Update `ChatInterface.tsx` to display a progress bar based on AI's estimated completion
- [X] T008 [US1] Refine `clarification_questions` prompt to provide a 3-5 question limit estimate in the response

## Phase 3: Validation & Visual Blueprint (US1)
**Goal**: Generate 6 pillars and visual assets.

- [X] T009 [US1] Implement `ValidationReportView.tsx` (6 pillars display)
- [X] T010 [US1] Implement `MermaidRenderer.tsx` for User Flow
- [X] T011 [US1] Implement `KanbanGenerator` logic to auto-create Features and Issues
- [X] T012 [US1] Create `BlueprintDashboard.tsx` to show project health/completion overview after validation

## Phase 4: Sequential Doc Generation Loop (US2)
**Goal**: PRD -> App Flow -> Tech Stack -> etc. with dependency logic.

- [X] T013 [P] [US2] Update `ProjectAsset` model to track `generation_status` (pending, generating, complete, failed)
- [X] T014 [US2] Implement `DocGeneratorService` to support single-doc generation with previous docs as context
- [X] T015 [US2] Create `DocGenerationWizard.tsx`: sequential steps for each of the 6 docs
- [X] T016 [US2] Add "Skip & AI Suggest" button to Doc Q&A interface
- [X] T017 [US2] Implement backend endpoint `POST /api/v1/assets/{id}/generate` for individual doc generation

## Phase 5: Project Page Integration (US2)
**Goal**: Access and regenerate assets from project details.

- [X] T018 [US2] Update `AI Architect` tab to show "Placeholders" for docs not yet generated
- [X] T019 [US2] Add "Generate" button to each document card in the `DocumentList.tsx`
- [X] T020 [US2] Implement preview mode for generated Markdown docs in the project page

## Final Phase: Polish & UX
- [ ] T021 Ensure modal state is persisted if closed during the docs loop
- [ ] T022 Verify all 6 documents are compatible with Google Docs/Word
- [ ] Run full E2E test of the 4-phase journey