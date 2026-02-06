# Implementation Tasks - AI Idea Validator and Generator

**Feature Branch**: `001-ai-idea-validator`
**Specification**: `specs/001-ai-idea-validator/spec.md`
**Plan**: `specs/001-ai-idea-validator/plan.md`

## Phase 1: Setup
**Goal**: Initialize dependencies, configuration, and project structure.

- [ ] T001 Install backend dependencies (boto3, openai) in `Backend/requirements.txt`
- [ ] T002 Install frontend dependencies (mermaid) in `Frontend/package.json`
- [ ] T003 Configure environment variables (R2_, OPENAI_) in `Backend/.env.example`
- [ ] T004 Create Alembic migration for new tables (project_ideas, validation_reports, project_assets) in `Backend/alembic/versions`
- [ ] T005 [P] Create initial SQLModel/Pydantic models in `Backend/app/models/project_idea.py`

## Phase 2: Foundational Components
**Goal**: Build core backend services and data models required by all stories.

- [ ] T006 [P] Implement `ProjectIdea` and `ValidationReport` models with new schema in `Backend/app/models/project_idea.py`
- [ ] T007 [P] Implement `ProjectAsset` model in `Backend/app/models/project_asset.py`
- [ ] T008 Implement `PromptManager` to load/manage system prompts in `Backend/app/services/ai_prompt_manager.py`
- [ ] T009 Create `prompts.yaml` (or json) for storing versioned prompts in `Backend/app/config/prompts.yaml`
- [ ] T010 Implement `AiService` wrapper with JSON mode enforcement and retry logic (1-2 retries) in `Backend/app/services/ai_service.py`
- [ ] T011 Implement `R2StorageProvider` for S3/R2 interactions (upload, signed URLs) in `Backend/app/services/storage_service.py`
- [ ] T012 Register new services in `Backend/app/api/deps.py`

## Phase 3: Idea Submission & Clarification (US1)
**Goal**: Allow authenticated users to submit ideas and receive AI clarification/validation.
**Priority**: P1

- [ ] T013 [P] [US1] Create `ValidationResponse` and input schemas in `Backend/app/schemas/ai_validator.py`
- [ ] T014 [US1] Create unit tests for `IdeaValidatorService` input handling in `Backend/tests/services/test_idea_validator.py`
- [ ] T015 [US1] Implement `POST /api/v1/ideas` endpoint (Auth required) with input chunking/truncation logic in `Backend/app/api/v1/ideas.py`
- [ ] T016 [US1] Implement `IdeaValidatorService` logic for "Single Comprehensive Prompt" in `Backend/app/services/idea_validator_service.py`
- [ ] T017 [US1] Create integration test for `POST /api/v1/ideas` flow in `Backend/tests/api/v1/test_ideas.py`
- [ ] T018 [US1] Implement `POST /api/v1/ideas/{id}/clarify` endpoint in `Backend/app/api/v1/ideas.py`
- [ ] T019 [P] [US1] Create frontend `IdeaValidatorClient` API client in `Frontend/src/services/idea-validator.ts`
- [ ] T020 [US1] Create `IdeaInputForm` component in `Frontend/src/components/ai/IdeaInputForm.tsx`
- [ ] T021 [US1] Create `ChatInterface` component in `Frontend/src/components/ai/ChatInterface.tsx`
- [ ] T022 [US1] Create `NewIdeaPage` with Auth guard (redirect if not logged in) in `Frontend/src/pages/ai/NewIdeaPage.tsx`

## Phase 4: Validation Report & Refinement (US2)
**Goal**: Display the 6-pillar report and allow users to save/confirm their idea.
**Priority**: P1

- [ ] T023 [P] [US2] Create `SaveIdeaRequest` schema in `Backend/app/schemas/project_idea.py`
- [ ] T024 [US2] Create tests for Validation Report polling and confirmation logic in `Backend/tests/api/v1/test_ideas_validation.py`
- [ ] T025 [US2] Implement `GET /api/v1/ideas/{id}/validation` polling endpoint in `Backend/app/api/v1/ideas.py`
- [ ] T026 [US2] Implement `POST /api/v1/ideas/{id}/confirm` endpoint in `Backend/app/api/v1/ideas.py`
- [ ] T027 [US2] Create `ValidationReportView` component (6 pillars display) in `Frontend/src/components/ai/ValidationReportView.tsx`
- [ ] T028 [P] [US2] Implement "Edit/Refine" mode in `ValidationReportView` (allow text edits) in `Frontend/src/components/ai/ValidationReportView.tsx`
- [ ] T029 [US2] Implement polling hook `usePollValidation` in `Frontend/src/hooks/usePollValidation.ts`
- [ ] T030 [US2] Integrate Validation Report and Confirmation flow in `Frontend/src/pages/ai/NewIdeaPage.tsx`

## Phase 5: Visual & Task Asset Generation (US3)
**Goal**: Generate User Flow Diagrams (Mermaid) and Kanban tickets.
**Priority**: P2

- [ ] T031 [P] [US3] Create tests for `KanbanGenerator` and `MermaidGenerator` services in `Backend/tests/services/test_generators.py`
- [ ] T032 [P] [US3] Implement `KanbanGenerator` logic in `Backend/app/services/kanban_generator.py`
- [ ] T033 [P] [US3] Implement `MermaidGenerator` logic (AI prompt variation) in `Backend/app/services/mermaid_generator.py`
- [ ] T034 [US3] Update `POST /api/v1/ideas/{id}/confirm` to trigger async generation of assets in `Backend/app/api/v1/ideas.py`
- [ ] T035 [US3] Create `MermaidRenderer` component using `mermaid` library in `Frontend/src/components/ui/MermaidRenderer.tsx`
- [ ] T036 [US3] Create `KanbanPreview` component to list generated tickets in `Frontend/src/components/ai/KanbanPreview.tsx`
- [ ] T037 [US3] Display generated assets on `IdeaDetailsPage` in `Frontend/src/pages/ai/IdeaDetailsPage.tsx`

## Phase 6: Documentation & R2 Storage (US4)
**Goal**: Generate and securely store the 6 technical documents.
**Priority**: P3

- [ ] T038 [P] [US4] Create tests for `DocGenerator` and R2 Signed URL generation in `Backend/tests/services/test_doc_storage.py`
- [ ] T039 [P] [US4] Implement logic to generate 6 specific docs (PDF/Docx) with `{project_name}_{Type}` naming in `Backend/app/services/doc_generator.py`
- [ ] T040 [US4] Implement `GET /api/v1/ideas/{id}/assets` to list available files in `Backend/app/api/v1/ideas.py`
- [ ] T041 [US4] Implement `GET /api/v1/assets/{id}/download` with Permission Check (Admin/Member) and Signed URL generation in `Backend/app/api/v1/assets.py`
- [ ] T042 [US4] Create `DocumentList` component with secure download handling in `Frontend/src/components/ai/DocumentList.tsx`

## Final Phase: Polish & Integration
**Goal**: Ensure smooth UX, error handling, and performance.

- [ ] T043 Implement loading skeletons/spinners for AI generation states in `Frontend/src/components/ai/LoadingState.tsx`
- [ ] T044 Implement error boundaries and retry UI for AI timeouts in `Frontend/src/pages/ai/NewIdeaPage.tsx`
- [ ] T045 Verify mobile responsiveness for Validation Report and Diagrams in `Frontend/src/components/ai/ValidationReportView.tsx`
- [ ] T046 Run full E2E test of the flow (Auth -> Idea -> Validate -> Confirm -> Generate -> Download)

## Dependencies & Execution Order
1. **Setup (T001-T005)**: Must be done first.
2. **Foundational (T006-T012)**: Prerequisite for all User Stories.
3. **US1 (T013-T020)**: Can start after Foundational.
4. **US2 (T021-T027)**: Depends on US1.
5. **US3 (T028-T033)** & **US4 (T034-T037)**: Can run in parallel after US2 is complete.

## Implementation Strategy
- **MVP**: Complete Phase 1-4 (Idea -> Validation -> Save). This delivers the core value.
- **Enhanced**: Add Phase 5 (Diagrams/Tickets).
- **Complete**: Add Phase 6 (R2 Docs) and Polish.